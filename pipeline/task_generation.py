from __future__ import annotations

import logging
from typing import Callable, Generic, TypeVar
from dataclasses import asdict, replace
from pathlib import Path

from app.language_registry import get_language_display_name
from app.settings import get_settings_store
from llm_gateway import LLMTextClient

from models import (
    ExplanationExercise,
    FillInTheBlankExercise,
    MacroPlanStep,
    MatchingExercise,
    MultipleChoiceExercise,
    TranslationExercise,
    VocabularyCard,
)
from .lesson_observability import (
    build_log_scope,
    format_log_event,
    format_parse_error_context,
    format_text_block,
    summarize_cards,
    summarize_llm_output,
    summarize_macro_step,
    summarize_prompt,
    summarize_task_payload,
)
from .task_generation_parsers import (
    parse_explanation_exercise,
    parse_fill_in_the_blank_exercise,
    parse_matching_exercise,
    parse_multiple_choice_exercise,
    parse_translation_exercise,
)

logger = logging.getLogger(__name__)

ParsedExerciseT = TypeVar("ParsedExerciseT")
ExerciseParser = Callable[[str], ParsedExerciseT]


class TaskGenerator:
    def __init__(
        self,
        *,
        lesson_language: str,
        translation_language: str,
        lerner_level: str,
    ) -> None:
        self._generator_by_exercise_id = {
            "explanation": ExplanationTaskGenerator(
                lesson_language=lesson_language,
                translation_language=translation_language,
                lerner_level=lerner_level,
            ),
            "filling": FillingTaskGenerator(
                lesson_language=lesson_language,
                translation_language=translation_language,
                lerner_level=lerner_level,
            ),
            "matching": MatchingTaskGenerator(
                lesson_language=lesson_language,
                translation_language=translation_language,
                lerner_level=lerner_level,
            ),
            "question": QuestionTaskGenerator(
                lesson_language=lesson_language,
                translation_language=translation_language,
                lerner_level=lerner_level,
            ),
            "translation": TranslationTaskGenerator(
                lesson_language=lesson_language,
                translation_language=translation_language,
                lerner_level=lerner_level,
            ),
        }

    def generate_task_payload(
        self,
        step: MacroPlanStep,
        *,
        stage_id: str | None = None,
        trace_id: str | None = None,
    ) -> dict | None:
        exercise_id = step.exercise_id.strip().lower()

        generator = self._generator_by_exercise_id.get(exercise_id)
        if generator is None:
            logger.warning("Unsupported exercise_id in macro plan: %r", step.exercise_id)
            return None

        task = generator.generate_task(
            description=step.description,
            targets=step.targets,
            stage_id=stage_id,
            trace_id=trace_id,
        )
        if hasattr(task, "mode"):
            task = replace(task, mode=step.mode)

        payload = asdict(task)
        payload["lesson_description"] = step.description
        payload["lesson_targets"] = [card.lexeme for card in step.targets]
        scope = build_log_scope(trace_id=trace_id, stage_id=stage_id)
        logger.info(
            "%s",
            format_log_event(
                f"{scope}Task payload ready",
                "macro step:",
                *[f"  {line}" for line in summarize_macro_step(step)],
                "payload:",
                *[f"  {line}" for line in summarize_task_payload(payload)],
            ),
        )
        return payload


class BaseTaskGenerator(Generic[ParsedExerciseT]):
    prompt_filename: str
    parser: ExerciseParser[ParsedExerciseT]
    output_format_prompt: str

    def __init__(
        self,
        *,
        lesson_language: str,
        translation_language: str,
        lerner_level: str,
    ) -> None:
        self._translation_language = translation_language
        self._lerner_level = lerner_level
        settings = get_settings_store()
        self._text_client = LLMTextClient(
            model=settings.get_value("models/task_generation"),
            reasoning_effort=settings.get_value("pipeline/task_generation/reasoning_effort"),
            text_verbosity=settings.get_value("pipeline/task_generation/text_verbosity"),
            service_tier=settings.get_value("pipeline/task_generation/service_tier"),
        )

        common_prompt_path = Path("prompts") / lesson_language / "task_generation_common.txt"
        task_prompt_path = Path("prompts") / lesson_language / self.prompt_filename
        self._common_prompt_path = common_prompt_path
        self._task_prompt_path = task_prompt_path
        self._system_prompt = "\n".join([
            common_prompt_path.read_text(encoding="utf-8"),
            task_prompt_path.read_text(encoding="utf-8"),
        ])

    def generate_task(
        self,
        *,
        description: str,
        targets: list[VocabularyCard],
        stage_id: str | None = None,
        trace_id: str | None = None,
    ) -> ParsedExerciseT:
        prompt = self._build_user_prompt(
            translation_language=get_language_display_name(self._translation_language),
            lerner_level=self._lerner_level,
            description=description,
            targets=targets,
        )
        scope = build_log_scope(trace_id=trace_id, stage_id=stage_id)
        logger.info(
            "%s",
            format_log_event(
                f"{scope}Task generation request",
                f"exercise_id: {self.prompt_filename.replace('_task_generation.txt', '')}",
                f"model: {self._text_client.model_spec}",
                f"system prompt: {summarize_prompt(self._system_prompt, path=f'{self._common_prompt_path} + {self._task_prompt_path}')}",
                f"user prompt: {summarize_prompt(prompt)}",
                f"description: {' '.join(description.split())}",
                "targets:",
                *[f"  {line}" for line in summarize_cards(targets)],
            ),
        )

        response = self._text_client.generate_text(
            system_prompt=self._system_prompt,
            user_text=prompt,
        )
        try:
            parsed = self.parser(response)
        except Exception as exc:
            logger.error(
                "%s",
                format_log_event(
                    f"{scope}Task parsing failed",
                    f"exercise_id: {self.prompt_filename.replace('_task_generation.txt', '')}",
                    f"error: {type(exc).__name__}: {exc}",
                    "llm output summary:",
                    *[f"  {line}" for line in summarize_llm_output(response)],
                    *format_parse_error_context(response, max_chars=2200),
                ),
            )
            raise

        payload = asdict(parsed)
        logger.info(
            "%s",
            format_log_event(
                f"{scope}Task generation completed",
                f"exercise_id: {self.prompt_filename.replace('_task_generation.txt', '')}",
                "llm output summary:",
                *[f"  {line}" for line in summarize_llm_output(response)],
                format_text_block("LLM response excerpt:", response, max_chars=1800),
                "parsed payload:",
                *[f"  {line}" for line in summarize_task_payload(payload)],
            ),
        )
        return parsed

    def _build_user_prompt(
        self,
        *,
        translation_language: str,
        lerner_level,
        description: str,
        targets: list[VocabularyCard],
    ) -> str:
        """
        Builds a plain-text input prompt for the task content generator.
        """

        lines: list[str] = []

        lines.append(f"LERNER_LANGUAGE: {translation_language}")
        lines.append("")

        lines.append(f"LERNER_LEVEL: {lerner_level}")
        lines.append("")

        lines.append(f"DESCRIPTION: {description}")
        lines.append("")

        lines.append("OUTPUT_FORMAT:")
        lines.append(self.output_format_prompt.strip())
        lines.append("")

        lines.append(f"TARGETS:")
        for index, card in enumerate(targets, start=1):
            base = (
                f"U{index} | lexeme={card.lexeme} | meaning={card.meaning_english} | "
                f"pos={card.part_of_speech} | translation={card.translation}"
            )

            lines.append(base)
        
        return "\n".join(lines)
    

class ExplanationTaskGenerator(BaseTaskGenerator[ExplanationExercise]):
    prompt_filename = "explanation_task_generation.txt"
    parser = staticmethod(parse_explanation_exercise)
    output_format_prompt = (
        "Return plain text, not JSON. "
        "For each card use exactly this structure:\n"
        "===CARD===\n"
        "NAME: <short block title>\n"
        "HTML:\n"
        "<html fragment>\n"
        "===END_CARD===\n"
        "Do not use markdown code fences."
    )


class FillingTaskGenerator(BaseTaskGenerator[FillInTheBlankExercise]):
    prompt_filename = "filling_task_generation.txt"
    parser = staticmethod(parse_fill_in_the_blank_exercise)
    output_format_prompt = (
        'Return one JSON object: {"paragraph":"text with [answers] in square brackets","distractors":["..."]}. '
        'Do not use markdown code fences.'
    )


class MatchingTaskGenerator(BaseTaskGenerator[MatchingExercise]):
    prompt_filename = "matching_task_generation.txt"
    parser = staticmethod(parse_matching_exercise)
    output_format_prompt = (
        'Return one JSON object: {"pairs":[["left","right"],["left","right"]]}. '
        'Do not use markdown code fences.'
    )


class QuestionTaskGenerator(BaseTaskGenerator[MultipleChoiceExercise]):
    prompt_filename = "question_task_generation.txt"
    parser = staticmethod(parse_multiple_choice_exercise)
    output_format_prompt = (
        'Return one JSON object: {"passage":"...","question":"...","options":["..."],"answer":0}. '
        'The answer may also be a letter or the exact option text. Do not use markdown code fences.'
    )


class TranslationTaskGenerator(BaseTaskGenerator[TranslationExercise]):
    prompt_filename = "translation_task_generation.txt"
    parser = staticmethod(parse_translation_exercise)
    output_format_prompt = (
        'Return one JSON object: {"paragraph":"...","answers":["..."],"distractors":["..."]}. '
        'Do not use markdown code fences.'
    )
