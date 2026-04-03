from __future__ import annotations

__all__ = [
    "CardGenerationWorker",
    "LessonGenerationWorker",
    "is_filling_answer_correct",
    "is_translation_answer_correct",
]

_EXPORT_MAP = {
    "CardGenerationWorker": ("ui.services.lesson_generation_workers", "CardGenerationWorker"),
    "LessonGenerationWorker": ("ui.services.lesson_generation_workers", "LessonGenerationWorker"),
    "is_filling_answer_correct": ("ui.services.answer_precheck", "is_filling_answer_correct"),
    "is_translation_answer_correct": ("ui.services.answer_precheck", "is_translation_answer_correct"),
}


def __getattr__(name: str):
    from importlib import import_module

    try:
        module_name, attr_name = _EXPORT_MAP[name]
    except KeyError as exc:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}") from exc

    module = import_module(module_name)
    return getattr(module, attr_name)
