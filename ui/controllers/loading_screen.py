from __future__ import annotations

import logging

from PySide6.QtCore import QObject, QThread, Qt, Slot

from ui.controllers.lesson_flow import LessonFlowController
from ui.services import LessonGenerationWorker

logger = logging.getLogger(__name__)

class LoadingScreenController(QObject):
    def __init__(
        self,
        router,
        view,
        backend,
        cards,
        user_request,
        learner_level,
        lesson_language,
        translation_language,
        api_key,
        plan_generation_model,
        task_generation_model,
    ):
        super().__init__()
        self.url = r"\ui\views\loading_screen\index.html"
        self.router = router
        self.view = view
        self.backend = backend
        self._handlers = {"btn-click": self._on_btn_click}
        self._cards = cards
        self._user_request = user_request
        self._learner_level = learner_level
        self._lesson_language = lesson_language
        self._translation_language = translation_language
        self._api_key = api_key
        self._plan_generation_model = plan_generation_model
        self._task_generation_model = task_generation_model
        self._generation_started = False
        self._generation_error_message: str | None = None
        self._lesson_generation_thread: QThread | None = None
        self._lesson_generation_worker: LessonGenerationWorker | None = None

    def on_load_finished(self):
        if self._generation_started:
            logger.debug("Ignoring repeated UI load finished event for loading screen")
            return

        self._generation_started = True
        self._start_lesson_generation()

    def on_ui_event(self, name: str, payload: dict):
        handler = self._handlers.get(name)
        if handler:
            handler(payload)

    def _on_btn_click(self, payload: dict):
        logger.debug("Clicked the button with the id='%s'", payload.get("id"))

        match payload.get("id"):
            case "stop":
                logger.info("Stop button clicked on loading screen; action is not implemented yet")

    def _start_lesson_generation(self) -> None:
        if self._lesson_generation_thread is not None:
            logger.warning("Lesson generation is already running; ignoring duplicate start request")
            return

        self._generation_error_message = None

        worker_thread = QThread(self)
        worker = LessonGenerationWorker(
            api_key=self._api_key,
            plan_generation_model=self._plan_generation_model,
            task_generation_model=self._task_generation_model,
            cards=self._cards,
            user_request=self._user_request,
            lerner_level=self._learner_level,
            lesson_language=self._lesson_language,
            translation_language=self._translation_language,
        )
        self._lesson_generation_thread = worker_thread
        self._lesson_generation_worker = worker
        worker.moveToThread(worker_thread)

        worker_thread.started.connect(worker.run)
        worker.generation_failed.connect(self._handle_lesson_generation_error, Qt.ConnectionType.QueuedConnection)
        worker.lesson_generated.connect(self._handle_lesson_generation, Qt.ConnectionType.QueuedConnection)
        worker.finished.connect(self._finish_lesson_generation, Qt.ConnectionType.QueuedConnection)
        worker.finished.connect(worker_thread.quit)
        worker.finished.connect(worker.deleteLater)
        worker_thread.finished.connect(worker_thread.deleteLater)
        worker_thread.finished.connect(self._clear_lesson_generation_references, Qt.ConnectionType.QueuedConnection)
        worker_thread.start()

    @Slot(object)
    def _handle_lesson_generation(self, lesson_plan: object) -> None:
        if not isinstance(lesson_plan, list):
            logger.error("Lesson generation returned an invalid payload type: %s", type(lesson_plan).__name__)
            self._generation_error_message = "Lesson generation returned invalid data."
            return

        self.router.replace_current(
            LessonFlowController,
            lesson_plan,
            self._lesson_language,
            self._translation_language,
        )

    @Slot(str)
    def _handle_lesson_generation_error(self, message: str) -> None:
        try:
            self._generation_error_message = message
            logger.error("Lesson generation failed: %s", message)
        except Exception:  # noqa: BLE001
            logger.exception("Unhandled exception while handling a lesson generation error")

    @Slot()
    def _finish_lesson_generation(self) -> None:
        if self._generation_error_message:
            logger.warning("Lesson generation finished with an error: %s", self._generation_error_message)

    @Slot()
    def _clear_lesson_generation_references(self) -> None:
        self._lesson_generation_thread = None
        self._lesson_generation_worker = None

