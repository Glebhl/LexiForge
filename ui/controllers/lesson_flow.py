from __future__ import annotations

import json
import logging
from typing import Any, Callable

from pipeline import AnswerMatcher
from pipeline.answer_matcher import CORRECT, MINOR_MISTAKE
from ui.services import is_filling_answer_correct, is_translation_answer_correct

logger = logging.getLogger(__name__)


class LessonFlowController:
    """
    Controls lesson flow using pywebview shared state instead of injected JS snippets.
    """

    def __init__(self, router, view, backend, lesson_session, lesson_language, translation_language):
        self.url = "ui/views/lesson_flow/index.html"
        self.disable_transition = True
        self.router = router
        self.view = view
        self.backend = backend

        self._lesson_session = lesson_session
        self._tasks_total = self._lesson_session.total_task_count
        self._lesson_language = lesson_language
        self._translation_language = translation_language

        self._handlers: dict[str, Callable[[dict], None]] = {
            "btn-click": self._handle_button_click,
        }

        self._task_index = 0
        self._waiting_task_index: int | None = None
        self._task_id = ""
        self._task: dict[str, Any] = {}
        self._answers: list[str] = []
        self._initial_task_opened = False
        self._task_revision = 0
        self._validation_revision = 0
        self._task_state: dict[str, Any] | None = None
        self._validation_state: dict[str, Any] | None = None
        self._pending_answer: Any = None

        self._task_loaders: dict[str, Callable[[Any], None]] = {
            "explanation": self._load_explanation_task,
            "loading": self._load_loading_task,
            "matching": self._load_matching_task,
            "translation": self._load_translation_task,
            "filling": self._load_filling_task,
            "question": self._load_question_task,
        }
        self._task_verifiers: dict[str, Callable[[], bool] | None] = {
            "explanation": None,
            "loading": None,
            "matching": None,
            "translation": self._verify_translation_task,
            "filling": self._verify_filling_task,
            "question": None,
        }

        logger.debug(
            "LessonController initialized: tasks_total=%d, url=%s",
            self._tasks_total,
            self.url,
        )

        self._answer_matcher = AnswerMatcher(
            lesson_language=self._lesson_language,
        )
        self._lesson_session.set_listener(self._handle_session_update)

    def on_load_finished(self):
        if self._initial_task_opened:
            logger.debug("Ignoring repeated UI load finished event for lesson flow page")
            return

        self._initial_task_opened = True
        logger.debug("UI load finished, opening the first task")
        self._advance_to_task(1)

    def on_ui_event(self, name: str, payload: dict):
        logger.debug("UI event received: name=%s payload=%s", name, payload)

        handler = self._handlers.get(name)
        if not handler:
            logger.warning("No handler registered for UI event: %s", name)
            return

        handler(payload)

    def _publish_state(self) -> None:
        self._tasks_total = max(self._tasks_total, self._lesson_session.total_task_count)
        self.backend.set_state("lesson_flow_state", {
            "stepIndex": self._task_index,
            "totalSteps": self._tasks_total,
            "task": self._task_state,
            "validation": self._validation_state,
        })

    def _handle_session_update(self) -> None:
        self._tasks_total = max(self._lesson_session.total_task_count, self._lesson_session.available_task_count)

        if self._waiting_task_index is not None:
            if self._try_open_task(self._waiting_task_index):
                return

            if not self._lesson_session.is_generating and self._lesson_session.has_more_stages:
                self._lesson_session.ensure_next_stage_generation()

            if self._lesson_session.error_message:
                self._show_loading_task(
                    title="Lesson generation failed",
                    message=self._lesson_session.error_message,
                )
                return

        self._publish_state()

    def _handle_button_click(self, payload: dict):
        button_id = payload.get("id")
        self._pending_answer = payload.get("answer")
        logger.debug("Button clicked: id=%s", button_id)

        if button_id == "skip":
            self._complete_active_task(skipped=True, is_correct=None)
            return

        if button_id == "continue":
            if self._task_id == "loading":
                return
            self._check_task_completion()
            return

        logger.warning("Unknown button id received: %s", button_id)

    def _complete_active_task(self, *, skipped: bool, is_correct: bool | None) -> None:
        if self._task_id == "loading" or self._task_index <= 0:
            return

        answer = "" if self._pending_answer is None else str(self._pending_answer)
        self._lesson_session.record_task_result(
            task_index=self._task_index - 1,
            user_answer=answer,
            is_correct=is_correct,
            skipped=skipped,
        )
        self._advance_to_task(self._task_index + 1)

    def _advance_to_task(self, task_index: int) -> None:
        self._pending_answer = None
        self._validation_state = None

        if self._try_open_task(task_index):
            return

        if self._lesson_session.error_message:
            self._show_loading_task(
                title="Lesson generation failed",
                message=self._lesson_session.error_message,
            )
            return

        if self._lesson_session.is_generating or self._lesson_session.has_more_stages:
            self._waiting_task_index = task_index
            self._show_loading_task(
                title="Generating the next part of the lesson",
                message="The next task will appear soon.",
            )
            self._lesson_session.ensure_next_stage_generation()
            return

        logger.info("All tasks completed, navigating back")
        self.router.go_back()

    def _try_open_task(self, task_index: int) -> bool:
        if task_index < 1 or self._lesson_session.available_task_count < task_index:
            return False

        self._waiting_task_index = None
        self._task_index = task_index
        self._task = self._lesson_session.get_task_payload(task_index - 1)
        self._task_id = str(self._task.get("task_id", ""))
        self._answers = self._task.get("answers") or []
        self._tasks_total = max(self._tasks_total, self._lesson_session.total_task_count)

        loader = self._task_loaders.get(self._task_id)
        if not loader:
            logger.error("Unknown task type: %s (task_index=%d)", self._task_id, self._task_index)
            self._complete_active_task(skipped=True, is_correct=None)
            return True

        logger.info("Opening task: index=%d/%d id=%s", self._task_index, self._tasks_total, self._task_id)
        loader(self._task)
        return True

    def _render_task(self, task_type: str, content: Any) -> None:
        self._task_revision += 1
        self._task_state = {
            "type": task_type,
            "direction": "next",
            "payload": content,
            "revision": self._task_revision,
        }
        self._publish_state()

    def _show_loading_task(self, *, title: str, message: str) -> None:
        self._task_id = "loading"
        self._task = {
            "task_id": "loading",
            "title": title,
            "message": message,
        }
        self._answers = []
        self._render_task("loading", self._task)

    def _set_active_task_validity(self, is_correct: bool) -> None:
        self._validation_revision += 1
        self._validation_state = {
            "isCorrect": bool(is_correct),
            "revision": self._validation_revision,
        }
        self._publish_state()

    def _check_task_completion(self) -> bool:
        verifier = self._task_verifiers.get(self._task_id)
        if not verifier:
            logger.debug("No verifier registered for task type: %s. Validating the task", self._task_id)
            self._on_check_result(True)
            return True

        logger.debug("Running verifier for task type: %s", self._task_id)
        return verifier()

    def _on_check_result(self, is_correct: bool) -> None:
        logger.info("Task check result: task_id=%s is_correct=%s", self._task_id, is_correct)
        if is_correct:
            self._complete_active_task(skipped=False, is_correct=True)

    def _load_explanation_task(self, content: Any) -> None:
        self._render_task("explanation", content)

    def _load_loading_task(self, content: Any) -> None:
        self._render_task("loading", content)

    def _load_matching_task(self, content: Any) -> None:
        self._render_task("matching", content)

    def _load_translation_task(self, content: Any) -> None:
        self._render_task("translation", content)

    def _load_filling_task(self, content: Any) -> None:
        self._render_task("filling", content)

    def _load_question_task(self, content: Any) -> None:
        self._render_task("question", content)

    def _verify_translation_task(self) -> bool:
        answer = "" if self._pending_answer is None else str(self._pending_answer)
        expected_answers = self._task.get("answers") or []
        python_match = is_translation_answer_correct(
            user_answer=answer,
            expected_answers=expected_answers,
            language_code=self._translation_language,
        )

        if python_match:
            logger.debug(
                "Translation answer matched by Python checker: user_answer=%r expected_answers=%r",
                answer,
                expected_answers,
            )
            self._set_active_task_validity(True)
            self._on_check_result(True)
            return True

        match_result = self._answer_matcher.evaluate_text_answer(
            original_text=self._task.get("sentence"),
            user_answer=answer,
        )

        logger.debug(
            "Translation answer received: user_answer=%r expected_answers=%r, evaluation=%s correct_answer=%s",
            answer,
            match_result.evaluation,
            match_result.correct_answer,
        )

        is_correct = match_result.evaluation in (CORRECT, MINOR_MISTAKE)
        self._set_active_task_validity(is_correct)
        self._on_check_result(is_correct)
        return is_correct

    def _verify_filling_task(self) -> bool:
        raw_answer = "[]" if self._pending_answer is None else str(self._pending_answer)

        try:
            user_answer = json.loads(raw_answer)
        except json.JSONDecodeError:
            user_answer = []

        expected_answers = self._task.get("answers") or []
        python_match = is_filling_answer_correct(
            user_answers=user_answer,
            expected_answers=expected_answers,
            language_code=self._lesson_language,
        )

        if python_match:
            logger.debug(
                "Filling answer matched by Python checker: user_answer=%r expected_answers=%r expected_answers=%r",
                user_answer,
                expected_answers,
                expected_answers,
            )
            self._set_active_task_validity(True)
            self._on_check_result(True)
            return True

        match_result = self._answer_matcher.evaluate_filling_answer(
            sentence_parts=self._task.get("sentence") or [],
            expected_answers=expected_answers,
            user_answers=user_answer,
        )

        logger.debug(
            "Filling answer received: parsed_user_answer=%r expected_answers=%s evaluation=%s correct_answer=%s",
            user_answer,
            expected_answers,
            match_result.evaluation,
            match_result.correct_answer,
        )

        is_correct = match_result.evaluation in (CORRECT, MINOR_MISTAKE)
        self._set_active_task_validity(is_correct)
        self._on_check_result(is_correct)
        return is_correct
