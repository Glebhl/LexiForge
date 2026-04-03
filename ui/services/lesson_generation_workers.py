from __future__ import annotations

import logging
import time
from collections.abc import Callable
from typing import Any

from dev_fixtures import DevFixtureSettings
from models import VocabularyCard
from pipeline import MacroPlanner, TaskGenerator, VocabularyCardGenerator

logger = logging.getLogger(__name__)


class CardGenerationWorker:
    def __init__(
        self,
        *,
        query: str,
        lesson_language: str,
        translation_language: str,
    ) -> None:
        self._query = query
        self._lesson_language = lesson_language
        self._translation_language = translation_language

    def run(
        self,
        *,
        on_card_generated: Callable[[VocabularyCard], None],
        on_generation_failed: Callable[[str], None],
        on_finished: Callable[[], None],
    ) -> None:
        started_at = time.perf_counter()
        first_card_logged = False

        try:
            card_generator = VocabularyCardGenerator(
                lesson_language=self._lesson_language,
                lerner_language=self._translation_language,
            )
            for card in card_generator.stream_cards(self._query):
                if not first_card_logged:
                    logger.debug(
                        "First vocabulary card became available after %.2fs",
                        time.perf_counter() - started_at,
                    )
                    first_card_logged = True

                on_card_generated(card)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Vocabulary generation failed")
            on_generation_failed(str(exc))
        finally:
            logger.debug(
                "Vocabulary generation worker finished in %.2fs",
                time.perf_counter() - started_at,
            )
            on_finished()


class LessonGenerationWorker:
    def __init__(
        self,
        *,
        cards: list[VocabularyCard],
        user_request: str | None,
        lerner_level: str,
        lesson_language: str,
        translation_language: str,
    ) -> None:
        self._dev_fixtures = DevFixtureSettings.from_env()
        self._cards = cards
        self._user_request = user_request
        self._lesson_language = lesson_language
        self._translation_language = translation_language
        self._lerner_level = lerner_level

    def run(
        self,
        *,
        on_lesson_generated: Callable[[list[dict[str, Any]]], None],
        on_generation_failed: Callable[[str], None],
        on_finished: Callable[[], None],
    ) -> None:
        started_at = time.perf_counter()

        try:
            if self._dev_fixtures.use_lesson_fixture:
                lesson_plan = self._dev_fixtures.load_lesson_plan()
                logger.info("Using lesson fixture from %s", self._dev_fixtures.lesson_path)
            else:
                macro_planner = MacroPlanner(
                    lesson_language=self._lesson_language,
                    lerner_language=self._translation_language,
                    lerner_level=self._lerner_level,
                )
                task_generator = TaskGenerator(
                    lesson_language=self._lesson_language,
                    translation_language=self._translation_language,
                    lerner_level=self._lerner_level,
                )
                macro_plan = macro_planner.generate_plan(
                    cards=self._cards,
                    user_request=self._user_request,
                )

                for index, task in enumerate(macro_plan):
                    logger.debug("%s. %s", index, task)

                logger.debug(
                    "Macro plan was generated in %.2fs",
                    time.perf_counter() - started_at,
                )
                started_at = time.perf_counter()
                lesson_plan = task_generator.generate_tasks(macro_plan)
                logger.debug(
                    "Tasks content was generated in %.2fs",
                    time.perf_counter() - started_at,
                )

            on_lesson_generated(lesson_plan)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Lesson generation failed")
            on_generation_failed(str(exc))
        finally:
            logger.debug(
                "Lesson generation worker finished in %.2fs",
                time.perf_counter() - started_at,
            )
            on_finished()
