from __future__ import annotations

import json
import logging
from collections.abc import Iterator
from pathlib import Path
from typing import Any

from app.language_registry import get_language_display_name
from app.settings import get_settings_store
from llm_gateway import LLMTextClient
from models import LessonStageId, LessonTaskResult, MacroPlanStep, VocabularyCard
from .lesson_observability import (
    build_log_scope,
    format_log_event,
    format_parse_error_context,
    format_text_block,
    summarize_cards,
    summarize_goals,
    summarize_history,
    summarize_llm_output,
    summarize_macro_step,
    summarize_prompt,
)


logger = logging.getLogger(__name__)

_STAGE_PROMPT_FILENAMES: dict[LessonStageId, str] = {
    "presentation": "lesson_stage_presentation.txt",
    "recognition": "lesson_stage_recognition.txt",
    "stronger_recall": "lesson_stage_stronger_recall.txt",
}


class LessonStagePlanStreamParser:
    def __init__(self) -> None:
        self._line_buffer = ""

    def feed(self, chunk: str) -> list[dict[str, Any]]:
        completed_steps: list[dict[str, Any]] = []
        if not chunk:
            return completed_steps

        self._line_buffer += chunk
        while True:
            newline_index = self._line_buffer.find("\n")
            if newline_index < 0:
                break

            line = self._line_buffer[:newline_index].rstrip("\r")
            self._line_buffer = self._line_buffer[newline_index + 1 :]
            parsed = self._parse_jsonl_line(line)
            if parsed is not None:
                completed_steps.append(parsed)

        return completed_steps

    def finalize(self) -> list[dict[str, Any]]:
        completed_steps: list[dict[str, Any]] = []
        if self._line_buffer.strip():
            parsed = self._parse_jsonl_line(self._line_buffer.rstrip("\r"))
            if parsed is not None:
                completed_steps.append(parsed)
        self._line_buffer = ""
        return completed_steps

    def _parse_jsonl_line(self, line: str) -> dict[str, Any] | None:
        stripped = line.strip()
        if not stripped:
            return None
        if stripped.startswith("```"):
            return None
        if stripped in {"[", "]"}:
            return None
        if stripped.endswith(","):
            stripped = stripped[:-1].rstrip()

        try:
            payload = json.loads(stripped)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Lesson plan JSONL line is invalid JSON: {exc.msg} at line={exc.lineno} col={exc.colno}. "
                f"Line excerpt: {stripped[:220]!r}"
            ) from exc
        if not isinstance(payload, dict):
            raise ValueError("Each lesson plan line must be a JSON object.")
        return payload


class LessonStagePlanner:
    def __init__(
        self,
        *,
        stage_id: LessonStageId,
        lesson_language: str,
        lerner_language: str,
        lerner_level: str,
    ) -> None:
        self._stage_id = stage_id
        self._lerner_language = lerner_language
        self._lerner_level = lerner_level

        settings = get_settings_store()
        self._text_client = LLMTextClient(
            model=settings.get_value("models/lesson_planning"),
            reasoning_effort=settings.get_value("pipeline/lesson_planning/reasoning_effort"),
            text_verbosity=settings.get_value("pipeline/lesson_planning/text_verbosity"),
            service_tier=settings.get_value("pipeline/lesson_planning/service_tier"),
        )

        prompt_path = Path("prompts") / lesson_language / _STAGE_PROMPT_FILENAMES[stage_id]
        self._prompt_path = prompt_path
        self._system_prompt = prompt_path.read_text(encoding="utf-8")
        logger.debug("Loaded stage planning prompt from %s", prompt_path)

    def stream_plan(
        self,
        *,
        cards: list[VocabularyCard],
        goals: list[str],
        user_request: str | None = None,
        history: list[LessonTaskResult] | None = None,
        trace_id: str | None = None,
    ) -> Iterator[MacroPlanStep]:
        parser = LessonStagePlanStreamParser()

        prompt = self._build_user_prompt(
            cards=cards,
            goals=goals,
            user_request=user_request,
            history=history or [],
        )
        scope = build_log_scope(trace_id=trace_id, stage_id=self._stage_id)
        logger.info(
            "%s",
            format_log_event(
                f"{scope}Stage planning request",
                f"model: {self._text_client.model_spec}",
                f"system prompt: {summarize_prompt(self._system_prompt, path=self._prompt_path)}",
                f"user prompt: {summarize_prompt(prompt)}",
                "cards:",
                *[f"  {line}" for line in summarize_cards(cards)],
                "goals:",
                *[f"  {line}" for line in summarize_goals(goals)],
                "history:",
                *[f"  {line}" for line in summarize_history(history or [])],
                f"user request: {' '.join(user_request.split()) if user_request else '[empty]'}",
            ),
        )

        response_excerpt = ""
        response_chars = 0
        step_count = 0

        try:
            for text_delta in self._text_client.stream_text(
                system_prompt=self._system_prompt,
                user_text=prompt,
            ):
                response_chars += len(text_delta)
                if len(response_excerpt) < 1200:
                    response_excerpt += text_delta[: 1200 - len(response_excerpt)]
                for raw_step in parser.feed(text_delta):
                    step = self._build_step(raw_step, cards)
                    step_count += 1
                    logger.info(
                        "%s",
                        format_log_event(
                            f"{scope}Stage plan step generated",
                            f"step index: {step_count}",
                            *summarize_macro_step(step),
                        ),
                    )
                    yield step

            for raw_step in parser.finalize():
                step = self._build_step(raw_step, cards)
                step_count += 1
                logger.info(
                    "%s",
                    format_log_event(
                        f"{scope}Stage plan step generated",
                        f"step index: {step_count}",
                        *summarize_macro_step(step),
                    ),
                )
                yield step
        except Exception as exc:
            logger.error(
                "%s",
                format_log_event(
                    f"{scope}Stage planning failed",
                    f"error: {type(exc).__name__}: {exc}",
                    f"generated steps before failure: {step_count}",
                    f"streamed chars before failure: {response_chars}",
                    "llm output summary:",
                    *[f"  {line}" for line in summarize_llm_output(response_excerpt)],
                    *format_parse_error_context(response_excerpt, max_chars=1600),
                ),
            )
            raise

        logger.info(
            "%s",
            format_log_event(
                f"{scope}Stage planning completed",
                f"generated steps: {step_count}",
                f"streamed chars: {response_chars}",
                "llm output summary:",
                *[f"  {line}" for line in summarize_llm_output(response_excerpt)],
                format_text_block("LLM response excerpt:", response_excerpt, max_chars=1600),
            ),
        )

    def _build_user_prompt(
        self,
        *,
        cards: list[VocabularyCard],
        goals: list[str],
        user_request: str | None,
        history: list[LessonTaskResult],
    ) -> str:
        lines: list[str] = [
            f"LERNER_LANGUAGE: {get_language_display_name(self._lerner_language)}",
            "",
            f"LERNER_LEVEL: {self._lerner_level}",
            "",
        ]

        if user_request:
            lines.extend([
                "LERNER_REQUEST:",
                user_request,
                "",
            ])

        lines.append("LESSON_GOALS:")
        for goal in goals:
            lines.append(f"- {goal}")
        lines.append("")

        lines.append("LEARNING_UNITS:")
        for index, card in enumerate(cards, start=1):
            lines.append(
                f"U{index} | lexeme={card.lexeme} | meaning={card.meaning_english} | "
                f"pos={card.part_of_speech} | translation={card.translation}"
            )
        lines.append("")

        if history:
            lines.append("PREVIOUS_STAGE_RESULTS:")
            for result in history:
                lines.extend(self._format_result(result))
                lines.append("")

        return "\n".join(lines).strip()

    def _format_result(self, result: LessonTaskResult) -> list[str]:
        payload = result.task_payload
        expected_answers = payload.get("answers") or payload.get("answer")
        targets = payload.get("lesson_targets") or []

        lines = [
            (
                f"TASK_{result.task_index}: stage={result.stage_id}; task_id={result.task_id}; "
                f"correct={result.is_correct}; skipped={result.skipped}"
            ),
            f"DESCRIPTION: {result.description}",
            f"TARGETS: {', '.join(str(item) for item in targets) if targets else 'n/a'}",
            f"USER_ANSWER: {result.user_answer or '[empty]'}",
        ]

        if expected_answers:
            if isinstance(expected_answers, (list, tuple)):
                expected_text = " | ".join(str(item) for item in expected_answers)
            else:
                expected_text = str(expected_answers)
            lines.append(f"EXPECTED: {expected_text}")

        return lines

    def _build_step(self, raw_step: dict[str, Any], cards: list[VocabularyCard]) -> MacroPlanStep:
        if not isinstance(raw_step, dict):
            raise ValueError("Lesson plan step must be a JSON object.")

        return MacroPlanStep(
            description=self._require_string(raw_step, "description"),
            exercise_id=self._require_string(raw_step, "exercise_id"),
            mode=self._require_string(raw_step, "mode"),
            targets=self._parse_targets(raw_step.get("targets"), cards),
        )

    def _require_string(self, payload: dict[str, Any], field_name: str) -> str:
        value = payload.get(field_name)
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"Missing required lesson plan field: {field_name}")
        return value.strip()

    def _parse_targets(self, raw_targets: Any, cards: list[VocabularyCard]) -> list[VocabularyCard]:
        if not isinstance(raw_targets, list):
            raise ValueError("Lesson plan field 'targets' must be a JSON array.")

        parsed_targets: list[VocabularyCard] = []
        for raw_target in raw_targets:
            if not isinstance(raw_target, str) or not raw_target.strip():
                raise ValueError("Lesson plan targets must be non-empty strings.")

            target = raw_target.strip().upper()
            if not target.startswith("U"):
                raise ValueError(f"Invalid target identifier in lesson plan: {raw_target!r}")

            try:
                card_index = int(target[1:]) - 1
            except ValueError as exc:
                raise ValueError(f"Invalid target identifier in lesson plan: {raw_target!r}") from exc

            if card_index < 0 or card_index >= len(cards):
                raise ValueError(f"Lesson plan target is out of range: {raw_target!r}")

            parsed_targets.append(cards[card_index])

        if not parsed_targets:
            raise ValueError("Lesson plan step contains no targets.")

        return parsed_targets
