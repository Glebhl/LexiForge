from __future__ import annotations

import logging
from threading import Lock, Thread
from typing import Any, Callable
from uuid import uuid4

from dev_fixtures import DevFixtureSettings
from models import LESSON_STAGE_SEQUENCE, LessonTaskResult, VocabularyCard
from pipeline import LessonStageGenerator
from pipeline.lesson_observability import (
    build_log_scope,
    format_log_event,
    summarize_cards,
    summarize_goals,
    summarize_history,
    summarize_task_payload,
    summarize_task_result,
)


logger = logging.getLogger(__name__)

SessionListener = Callable[[], None]


class LessonGenerationSession:
    def __init__(
        self,
        *,
        cards: list[VocabularyCard],
        user_request: str | None,
        lerner_level: str,
        lesson_language: str,
        translation_language: str,
    ) -> None:
        self._cards = cards
        self._user_request = user_request
        self._lesson_language = lesson_language
        self._translation_language = translation_language
        self._lerner_level = lerner_level
        self._trace_id = uuid4().hex[:8]
        self._dev_fixtures = DevFixtureSettings.from_env()
        self._generator = LessonStageGenerator(
            lesson_language=lesson_language,
            translation_language=translation_language,
            lerner_level=lerner_level,
        )

        self._lock = Lock()
        self._listener: SessionListener | None = None
        self._goals: list[str] = []
        self._tasks: list[dict[str, Any]] = []
        self._results_by_task_index: dict[int, LessonTaskResult] = {}
        self._next_stage_index = 0
        self._total_task_count = 0
        self._is_generating = False
        self._error_message: str | None = None
        self._generation_thread: Thread | None = None

    def set_listener(self, listener: SessionListener | None) -> None:
        with self._lock:
            self._listener = listener
        self._notify_listener()

    def start(self) -> None:
        logger.info(
            "%s",
            format_log_event(
                f"{build_log_scope(trace_id=self._trace_id)}Lesson generation session started",
                f"lesson language: {self._lesson_language}",
                f"translation language: {self._translation_language}",
                f"learner level: {self._lerner_level}",
                f"fixture mode: {self._dev_fixtures.use_lesson_fixture}",
                f"user request: {' '.join(self._user_request.split()) if self._user_request else '[empty]'}",
                "cards:",
                *[f"  {line}" for line in summarize_cards(self._cards)],
            ),
        )
        if self._dev_fixtures.use_lesson_fixture:
            self._start_background_job(self._load_fixture_lesson)
            return

        self.ensure_next_stage_generation()

    @property
    def available_task_count(self) -> int:
        with self._lock:
            return len(self._tasks)

    @property
    def total_task_count(self) -> int:
        with self._lock:
            return self._total_task_count

    @property
    def error_message(self) -> str | None:
        with self._lock:
            return self._error_message

    @property
    def is_generating(self) -> bool:
        with self._lock:
            return self._is_generating

    @property
    def has_more_stages(self) -> bool:
        with self._lock:
            return self._next_stage_index < len(LESSON_STAGE_SEQUENCE)

    def get_task_payload(self, index: int) -> dict[str, Any]:
        with self._lock:
            return dict(self._tasks[index])

    def record_task_result(
        self,
        *,
        task_index: int,
        user_answer: str,
        is_correct: bool | None,
        skipped: bool,
    ) -> None:
        with self._lock:
            payload = dict(self._tasks[task_index])
            self._results_by_task_index[task_index] = LessonTaskResult(
                stage_id=str(payload.get("lesson_stage") or "presentation"),
                task_index=task_index + 1,
                task_id=str(payload.get("task_id") or ""),
                description=str(payload.get("lesson_description") or ""),
                user_answer=user_answer,
                is_correct=is_correct,
                skipped=skipped,
                task_payload=payload,
            )
            result = self._results_by_task_index[task_index]
        logger.info(
            "%s",
            format_log_event(
                f"{build_log_scope(trace_id=self._trace_id, stage_id=result.stage_id)}Lesson task result recorded",
                summarize_task_result(result),
            ),
        )

    def ensure_next_stage_generation(self) -> bool:
        with self._lock:
            if self._error_message or self._is_generating:
                return False
            if self._next_stage_index >= len(LESSON_STAGE_SEQUENCE):
                return False

            stage_id = LESSON_STAGE_SEQUENCE[self._next_stage_index]
            self._is_generating = True

        logger.info(
            "%s",
            format_log_event(
                f"{build_log_scope(trace_id=self._trace_id, stage_id=stage_id)}Queueing stage generation",
                f"next stage index: {self._next_stage_index}",
                f"available tasks: {self.available_task_count}",
                "history:",
                *[f"  {line}" for line in summarize_history(self._get_sorted_results())],
            ),
        )
        self._notify_listener()
        self._start_background_job(self._generate_stage, stage_id)
        return True

    def _start_background_job(self, target: Callable[..., None], *args: Any) -> None:
        worker = Thread(target=target, args=args, daemon=True)
        with self._lock:
            self._generation_thread = worker
        worker.start()

    def _load_fixture_lesson(self) -> None:
        try:
            lesson_plan = self._dev_fixtures.load_lesson_plan()
            logger.info(
                "%s",
                format_log_event(
                    f"{build_log_scope(trace_id=self._trace_id)}Loaded fixture lesson",
                    f"tasks: {len(lesson_plan)}",
                ),
            )

            with self._lock:
                self._total_task_count = len(lesson_plan)
                self._next_stage_index = len(LESSON_STAGE_SEQUENCE)
                self._is_generating = True

            self._notify_listener()

            for task in lesson_plan:
                payload = dict(task)
                payload.setdefault("lesson_stage", "presentation")
                payload.setdefault("lesson_description", "")
                payload.setdefault("lesson_targets", [])
                with self._lock:
                    self._tasks.append(payload)
                    task_index = len(self._tasks)
                logger.info(
                    "%s",
                    format_log_event(
                        f"{build_log_scope(trace_id=self._trace_id, stage_id=str(payload.get('lesson_stage') or 'presentation'))}Fixture task appended",
                        f"task index: {task_index}",
                        "payload:",
                        *[f"  {line}" for line in summarize_task_payload(payload)],
                    ),
                )
                self._notify_listener()
        except Exception as exc:  # noqa: BLE001
            logger.exception("Fixture lesson loading failed")
            with self._lock:
                self._error_message = str(exc)
        finally:
            with self._lock:
                self._is_generating = False
                self._generation_thread = None
            self._notify_listener()

    def _generate_stage(self, stage_id: str) -> None:
        try:
            logger.info(
                "%s",
                format_log_event(
                    f"{build_log_scope(trace_id=self._trace_id, stage_id=stage_id)}Stage generation started",
                    f"existing tasks: {self.available_task_count}",
                    "history:",
                    *[f"  {line}" for line in summarize_history(self._get_sorted_results())],
                ),
            )
            goals = self._ensure_goals()
            history = self._get_sorted_results()
            generated_tasks = 0

            for step in self._generator.stream_stage_plan(
                stage_id=stage_id,
                cards=self._cards,
                goals=goals,
                user_request=self._user_request,
                history=history,
                trace_id=self._trace_id,
            ):
                task_payload = self._generator.generate_task_payload(
                    step,
                    stage_id=stage_id,
                    trace_id=self._trace_id,
                )
                if task_payload is None:
                    continue

                payload = dict(task_payload)
                payload["lesson_stage"] = stage_id
                with self._lock:
                    self._tasks.append(payload)
                    self._total_task_count = len(self._tasks)
                    task_index = len(self._tasks)
                generated_tasks += 1
                logger.info(
                    "%s",
                    format_log_event(
                        f"{build_log_scope(trace_id=self._trace_id, stage_id=stage_id)}Stage task appended",
                        f"task index: {task_index}",
                        f"generated tasks in stage: {generated_tasks}",
                        "payload:",
                        *[f"  {line}" for line in summarize_task_payload(payload)],
                    ),
                )
                self._notify_listener()

            with self._lock:
                self._next_stage_index += 1
                next_stage_index = self._next_stage_index
            logger.info(
                "%s",
                format_log_event(
                    f"{build_log_scope(trace_id=self._trace_id, stage_id=stage_id)}Stage generation completed",
                    f"generated tasks in stage: {generated_tasks}",
                    f"total tasks: {self.available_task_count}",
                    f"next stage index: {next_stage_index}",
                ),
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Stage generation failed: %s", stage_id)
            with self._lock:
                self._error_message = str(exc)
            logger.error(
                "%s",
                format_log_event(
                    f"{build_log_scope(trace_id=self._trace_id, stage_id=stage_id)}Stage generation failed",
                    f"error: {type(exc).__name__}: {exc}",
                ),
            )
        finally:
            with self._lock:
                self._is_generating = False
                self._generation_thread = None
            self._notify_listener()

    def _ensure_goals(self) -> list[str]:
        with self._lock:
            if self._goals:
                logger.info(
                    "%s",
                    format_log_event(
                        f"{build_log_scope(trace_id=self._trace_id)}Reusing cached lesson goals",
                        "goals:",
                        *[f"  {line}" for line in summarize_goals(self._goals)],
                    ),
                )
                return list(self._goals)

        goals = self._generator.generate_goals(
            cards=self._cards,
            user_request=self._user_request,
            trace_id=self._trace_id,
        )
        with self._lock:
            self._goals = list(goals)
        logger.info(
            "%s",
            format_log_event(
                f"{build_log_scope(trace_id=self._trace_id)}Lesson goals cached",
                "goals:",
                *[f"  {line}" for line in summarize_goals(goals)],
            ),
        )
        self._notify_listener()
        return goals

    def _get_sorted_results(self) -> list[LessonTaskResult]:
        with self._lock:
            return [self._results_by_task_index[index] for index in sorted(self._results_by_task_index)]

    def _notify_listener(self) -> None:
        with self._lock:
            listener = self._listener

        if listener is None:
            return

        try:
            listener()
        except Exception:  # noqa: BLE001
            logger.exception("Lesson generation session listener failed")
