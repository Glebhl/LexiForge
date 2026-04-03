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

    def __init__(self, router, view, backend, lesson_plan, lesson_language, translation_language):
        self.url = "ui/views/lesson_flow/index.html"
        self.disable_transition = True
        self.router = router
        self.view = view
        self.backend = backend

        self._lesson_plan = lesson_plan
        self._tasks_total = len(self._lesson_plan)
        self._lesson_language = lesson_language
        self._translation_language = translation_language

        self._handlers: dict[str, Callable[[dict], None]] = {
            "btn-click": self._handle_button_click,
        }

        self._task_index = 0
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
            "matching": self._load_matching_task,
            "translation": self._load_translation_task,
            "filling": self._load_filling_task,
            "question": self._load_question_task,
        }
        self._task_verifiers: dict[str, Callable[[], bool] | None] = {
            "explanation": None,
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

    def on_load_finished(self):
        if self._initial_task_opened:
            logger.debug("Ignoring repeated UI load finished event for lesson flow page")
            return

        self._initial_task_opened = True
        logger.debug("UI load finished, opening the first task")
        self._open_next_task()

    def on_ui_event(self, name: str, payload: dict):
        logger.debug("UI event received: name=%s payload=%s", name, payload)

        handler = self._handlers.get(name)
        if not handler:
            logger.warning("No handler registered for UI event: %s", name)
            return

        handler(payload)

    def _publish_state(self) -> None:
        self.backend.set_state("lesson_flow_state", {
            "stepIndex": self._task_index,
            "totalSteps": self._tasks_total,
            "task": self._task_state,
            "validation": self._validation_state,
        })

    def _handle_button_click(self, payload: dict):
        button_id = payload.get("id")
        self._pending_answer = payload.get("answer")
        logger.debug("Button clicked: id=%s", button_id)

        if button_id == "skip":
            self._open_next_task()
            return

        if button_id == "continue":
            self._check_task_completion()
            return

        logger.warning("Unknown button id received: %s", button_id)

    def _open_next_task(self) -> None:
        self._task_index += 1
        self._pending_answer = None

        if self._task_index > self._tasks_total:
            logger.info("All tasks completed, navigating back")
            self.router.go_back()
            return

        self._task = self._lesson_plan[self._task_index - 1]
        self._task_id = self._task.get("task_id", "")
        self._answers = self._task.get("answers") or []
        self._validation_state = None

        loader = self._task_loaders.get(self._task_id)
        if not loader:
            logger.error("Unknown task type: %s (task_index=%d)", self._task_id, self._task_index)
            self._open_next_task()
            return

        logger.info("Opening task: index=%d/%d id=%s", self._task_index, self._tasks_total, self._task_id)
        loader(self._task)

    def _render_task(self, task_type: str, content: Any) -> None:
        self._task_revision += 1
        self._task_state = {
            "type": task_type,
            "direction": "next",
            "payload": content,
            "revision": self._task_revision,
        }
        self._publish_state()

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
            self._open_next_task()

    def _load_explanation_task(self, content: Any) -> None:
        self._render_task("explanation", content)

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
                "Translation answer matched by Python checker: raw_user_answer=%r expected_answers=%r",
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
            "Translation answer received: raw_user_answer=%r evaluation=%s correct_answer=%s",
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
                "Filling answer matched by Python checker: raw_user_answer=%r parsed_user_answer=%r expected_answers=%r",
                raw_answer,
                user_answer,
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
            "Filling answer received: raw_user_answer=%r parsed_user_answer=%r evaluation=%s correct_answer=%s",
            raw_answer,
            user_answer,
            match_result.evaluation,
            match_result.correct_answer,
        )

        is_correct = match_result.evaluation in (CORRECT, MINOR_MISTAKE)
        self._set_active_task_validity(is_correct)
        self._on_check_result(is_correct)
        return is_correct
