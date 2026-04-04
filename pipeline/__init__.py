from __future__ import annotations

__all__ = [
    "VocabularyCardGenerator",
    "LessonGoalGenerator",
    "LessonStageGenerator",
    "LessonStagePlanner",
    "AnswerMatcher",
    "TaskGenerator",
]

_EXPORT_MAP = {
    "VocabularyCardGenerator": ("pipeline.card_generation", "VocabularyCardGenerator"),
    "LessonGoalGenerator": ("pipeline.lesson_goals", "LessonGoalGenerator"),
    "LessonStageGenerator": ("pipeline.lesson_generation", "LessonStageGenerator"),
    "LessonStagePlanner": ("pipeline.lesson_stage_planning", "LessonStagePlanner"),
    "AnswerMatcher": ("pipeline.answer_matcher", "AnswerMatcher"),
    "TaskGenerator": ("pipeline.task_generation", "TaskGenerator"),
}


def __getattr__(name: str):
    from importlib import import_module

    try:
        module_name, attr_name = _EXPORT_MAP[name]
    except KeyError as exc:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}") from exc

    module = import_module(module_name)
    return getattr(module, attr_name)
