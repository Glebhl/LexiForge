from __future__ import annotations

from collections.abc import Iterator

from models import LessonStageId, LessonTaskResult, MacroPlanStep, VocabularyCard

from .lesson_goals import LessonGoalGenerator
from .lesson_stage_planning import LessonStagePlanner
from .task_generation import TaskGenerator


class LessonStageGenerator:
    def __init__(
        self,
        *,
        lesson_language: str,
        translation_language: str,
        lerner_level: str,
    ) -> None:
        self._lesson_language = lesson_language
        self._translation_language = translation_language
        self._lerner_level = lerner_level
        self._goal_generator = LessonGoalGenerator(
            lesson_language=lesson_language,
            lerner_language=translation_language,
            lerner_level=lerner_level,
        )
        self._task_generator = TaskGenerator(
            lesson_language=lesson_language,
            translation_language=translation_language,
            lerner_level=lerner_level,
        )

    def generate_goals(
        self,
        *,
        cards: list[VocabularyCard],
        user_request: str | None,
        trace_id: str | None = None,
    ) -> list[str]:
        return self._goal_generator.generate_goals(
            cards=cards,
            user_request=user_request,
            trace_id=trace_id,
        )

    def stream_stage_plan(
        self,
        *,
        stage_id: LessonStageId,
        cards: list[VocabularyCard],
        goals: list[str],
        user_request: str | None,
        history: list[LessonTaskResult],
        trace_id: str | None = None,
    ) -> Iterator[MacroPlanStep]:
        planner = LessonStagePlanner(
            stage_id=stage_id,
            lesson_language=self._lesson_language,
            lerner_language=self._translation_language,
            lerner_level=self._lerner_level,
        )
        return planner.stream_plan(
            cards=cards,
            goals=goals,
            user_request=user_request,
            history=history,
            trace_id=trace_id,
        )

    def generate_task_payload(
        self,
        step: MacroPlanStep,
        *,
        stage_id: str | None = None,
        trace_id: str | None = None,
    ) -> dict | None:
        return self._task_generator.generate_task_payload(
            step,
            stage_id=stage_id,
            trace_id=trace_id,
        )
