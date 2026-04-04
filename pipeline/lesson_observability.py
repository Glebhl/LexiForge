from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from models import LessonTaskResult, MacroPlanStep, VocabularyCard


def build_log_scope(*, trace_id: str | None = None, stage_id: str | None = None) -> str:
    parts: list[str] = []
    if trace_id:
        parts.append(f"lesson_session={trace_id}")
    if stage_id:
        parts.append(f"stage={stage_id}")
    if not parts:
        return ""
    return "[" + " ".join(parts) + "] "


def format_log_event(title: str, *lines: str) -> str:
    rendered = [title]
    for line in lines:
        if not line:
            continue
        for item in str(line).splitlines():
            rendered.append(f"  {item}")
    return "\n".join(rendered)


def summarize_prompt(prompt: str, *, path: str | Path | None = None) -> str:
    parts = [
        f"chars={len(prompt)}",
        f"lines={prompt.count(chr(10)) + 1 if prompt else 0}",
        f"sha1={_fingerprint_text(prompt)}",
    ]
    if path is not None:
        parts.append(f"path={path}")
    return ", ".join(parts)


def summarize_cards(cards: list[VocabularyCard], *, max_items: int = 10) -> list[str]:
    lines = [f"count={len(cards)}"]
    for index, card in enumerate(cards[:max_items], start=1):
        lines.append(f"{index}. {card.lexeme} ({card.part_of_speech}) -> {card.translation}")
    remaining = len(cards) - max_items
    if remaining > 0:
        lines.append(f"... and {remaining} more")
    return lines


def summarize_goals(goals: list[str], *, max_items: int = 15) -> list[str]:
    lines = [f"count={len(goals)}"]
    for index, goal in enumerate(goals[:max_items], start=1):
        lines.append(f"{index}. {_short_text(goal, max_chars=140)}")
    remaining = len(goals) - max_items
    if remaining > 0:
        lines.append(f"... and {remaining} more")
    return lines


def summarize_history(history: list[LessonTaskResult], *, max_items: int = 10) -> list[str]:
    lines = [f"count={len(history)}"]
    for result in history[:max_items]:
        lines.append(summarize_task_result(result))
    remaining = len(history) - max_items
    if remaining > 0:
        lines.append(f"... and {remaining} more")
    return lines


def summarize_task_result(result: LessonTaskResult) -> str:
    payload = result.task_payload
    targets = payload.get("lesson_targets")
    targets_text = ", ".join(str(item) for item in targets) if isinstance(targets, list) and targets else "n/a"
    return (
        f"task#{result.task_index} {result.task_id} "
        f"(correct={result.is_correct}, skipped={result.skipped}, targets={targets_text}, "
        f"user_answer={_short_text(result.user_answer, max_chars=80) or '[empty]'})"
    )


def summarize_macro_step(step: MacroPlanStep) -> list[str]:
    return [
        f"exercise_id={step.exercise_id}",
        f"mode={step.mode}",
        f"description={_short_text(step.description, max_chars=180)}",
        f"targets={', '.join(card.lexeme for card in step.targets)}",
    ]


def summarize_task_payload(payload: dict[str, Any]) -> list[str]:
    task_id = str(payload.get("task_id") or "")
    targets = ", ".join(str(item) for item in payload.get("lesson_targets") or []) or "n/a"
    lines = [
        f"task_id={task_id}",
        f"targets={targets}",
        f"description={_short_text(str(payload.get('lesson_description') or ''), max_chars=180) or '[empty]'}",
    ]

    if task_id == "explanation":
        cards = payload.get("cards") or []
        lines.append(f"cards={len(cards)}")
        for index, card in enumerate(cards[:4], start=1):
            if isinstance(card, dict):
                lines.append(
                    f"card {index}: name={_short_text(str(card.get('name') or ''), max_chars=60)}, "
                    f"content_chars={len(str(card.get('content') or ''))}"
                )
        return lines

    if task_id == "filling":
        answers = payload.get("answers") or []
        keyboard = payload.get("keyboard") or []
        sentence = payload.get("sentence") or []
        lines.extend([
            f"blanks={len(answers)}",
            f"answers={', '.join(_short_text(str(answer), max_chars=30) for answer in answers[:5]) or 'n/a'}",
            f"keyboard_size={len(keyboard)}",
            f"sentence_parts={len(sentence)}",
            f"mode={payload.get('mode')}",
        ])
        return lines

    if task_id == "matching":
        pairs = payload.get("pairs") or []
        lines.append(f"pairs={len(pairs)}")
        for index, pair in enumerate(pairs[:4], start=1):
            if isinstance(pair, (list, tuple)) and len(pair) == 2:
                lines.append(
                    f"pair {index}: {_short_text(str(pair[0]), max_chars=30)} => "
                    f"{_short_text(str(pair[1]), max_chars=30)}"
                )
        return lines

    if task_id == "question":
        options = payload.get("options") or []
        lines.extend([
            f"question={_short_text(str(payload.get('question') or ''), max_chars=160)}",
            f"paragraph_chars={len(str(payload.get('paragraph') or ''))}",
            f"options={len(options)}",
            f"answer={payload.get('answer')}",
        ])
        return lines

    if task_id == "translation":
        answers = payload.get("answers") or []
        keyboard = payload.get("keyboard") or []
        lines.extend([
            f"sentence_chars={len(str(payload.get('sentence') or ''))}",
            f"answers={', '.join(_short_text(str(answer), max_chars=30) for answer in answers[:5]) or 'n/a'}",
            f"keyboard_size={len(keyboard)}",
            f"mode={payload.get('mode')}",
        ])
        return lines

    lines.append(f"keys={', '.join(sorted(payload.keys()))}")
    return lines


def summarize_llm_output(text: str) -> list[str]:
    parsed = _try_parse_embedded_json(text)
    lines = [
        f"chars={len(text)}",
        f"lines={text.count(chr(10)) + 1 if text else 0}",
        f"sha1={_fingerprint_text(text)}",
    ]

    if isinstance(parsed, dict):
        lines.append("shape=json-object")
        lines.append(f"keys={', '.join(list(parsed.keys())[:10])}")
    elif isinstance(parsed, list):
        lines.append("shape=json-array")
        lines.append(f"items={len(parsed)}")
    elif text.strip():
        lines.append("shape=text")
    else:
        lines.append("shape=empty")

    return lines


def summarize_exception(exc: BaseException) -> str:
    return f"{type(exc).__name__}: {_short_text(str(exc), max_chars=300)}"


def format_text_block(title: str, text: str, *, max_chars: int = 3000) -> str:
    clipped = clip_text(text, max_chars=max_chars)
    block = [title]
    for line in clipped.splitlines() or ["[empty]"]:
        block.append(f"    {line}")
    return "\n".join(block)


def clip_text(text: str, *, max_chars: int = 3000) -> str:
    normalized = text.replace("\r\n", "\n").strip()
    if len(normalized) <= max_chars:
        return normalized

    head = max_chars // 2
    tail = max_chars - head - 32
    return (
        normalized[:head].rstrip()
        + "\n    ... [truncated] ...\n"
        + normalized[-tail:].lstrip()
    )


def extract_json_candidate(text: str) -> str:
    normalized = text.strip()
    if not normalized:
        return ""

    object_start = normalized.find("{")
    object_end = normalized.rfind("}")
    if object_start >= 0 and object_end > object_start:
        return normalized[object_start : object_end + 1]
    return normalized


def format_parse_error_context(text: str, *, max_chars: int = 1200) -> list[str]:
    normalized = text.strip()
    if not normalized:
        return ["response was empty"]

    candidate = extract_json_candidate(normalized)
    lines = [
        f"response_chars={len(normalized)}",
        f"candidate_chars={len(candidate)}",
    ]

    try:
        json.loads(candidate)
        lines.append("candidate json.loads(...) succeeded")
    except json.JSONDecodeError as exc:
        lines.append(
            f"json_error={exc.msg} at line={exc.lineno}, column={exc.colno}, pos={exc.pos}"
        )
        lines.append(f"context={_error_excerpt(candidate, exc.pos)}")

    lines.append(format_text_block("LLM response excerpt:", normalized, max_chars=max_chars))
    if candidate != normalized:
        lines.append(format_text_block("Extracted JSON candidate:", candidate, max_chars=max_chars))
    return lines


def _fingerprint_text(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]


def _short_text(text: str | None, *, max_chars: int) -> str:
    compact = " ".join((text or "").split())
    if len(compact) <= max_chars:
        return compact
    return compact[: max_chars - 3] + "..."


def _try_parse_embedded_json(text: str) -> Any | None:
    normalized = text.strip()
    if not normalized:
        return None

    candidates = [normalized]
    object_start = normalized.find("{")
    object_end = normalized.rfind("}")
    if object_start >= 0 and object_end > object_start:
        candidates.append(normalized[object_start : object_end + 1])

    array_start = normalized.find("[")
    array_end = normalized.rfind("]")
    if array_start >= 0 and array_end > array_start:
        candidates.append(normalized[array_start : array_end + 1])

    for candidate in candidates:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue

    return None


def _error_excerpt(text: str, position: int, *, radius: int = 120) -> str:
    start = max(0, position - radius)
    end = min(len(text), position + radius)
    excerpt = text[start:end].replace("\n", "\\n")
    if start > 0:
        excerpt = "..." + excerpt
    if end < len(text):
        excerpt = excerpt + "..."
    return excerpt
