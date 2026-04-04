from __future__ import annotations

import unittest

from models import LessonTaskResult
from pipeline.lesson_observability import (
    build_log_scope,
    summarize_history,
    summarize_llm_output,
    summarize_task_payload,
)


class LessonObservabilityTests(unittest.TestCase):
    def test_build_log_scope_includes_trace_and_stage(self) -> None:
        self.assertEqual(
            build_log_scope(trace_id="abc123", stage_id="presentation"),
            "[lesson_session=abc123 stage=presentation] ",
        )

    def test_summarize_llm_output_detects_json_object_shape(self) -> None:
        summary = summarize_llm_output(
            '```json\n{"question":"Where are you?","options":["A","B"],"answer":0}\n```'
        )

        self.assertIn("shape=json-object", summary)
        self.assertIn("keys=question, options, answer", summary)

    def test_summarize_task_payload_for_filling(self) -> None:
        summary = summarize_task_payload({
            "task_id": "filling",
            "sentence": ("I like ", " very much."),
            "keyboard": ("coffee", "tea"),
            "answers": ("coffee",),
            "mode": "word-bank",
            "lesson_description": "Practice food vocabulary",
            "lesson_targets": ["coffee"],
        })

        self.assertIn("task_id=filling", summary)
        self.assertIn("blanks=1", summary)
        self.assertIn("keyboard_size=2", summary)
        self.assertIn("sentence_parts=2", summary)

    def test_summarize_history_uses_compact_result_entries(self) -> None:
        result = LessonTaskResult(
            stage_id="recognition",
            task_index=2,
            task_id="translation",
            description="Translate the sentence.",
            user_answer="I would like a coffee with milk",
            is_correct=False,
            skipped=False,
            task_payload={
                "lesson_targets": ["coffee", "milk"],
            },
        )

        summary = summarize_history([result])

        self.assertEqual(summary[0], "count=1")
        self.assertIn("translation", summary[1])
        self.assertIn("coffee, milk", summary[1])
        self.assertIn("correct=False", summary[1])


if __name__ == "__main__":
    unittest.main()
