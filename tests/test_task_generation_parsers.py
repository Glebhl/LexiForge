from __future__ import annotations

import unittest

from pipeline.task_generation_parsers import parse_explanation_exercise


class ExplanationTaskParserTests(unittest.TestCase):
    def test_parse_explanation_cards_block_format(self) -> None:
        response = """
===CARD===
NAME: Present Simple
HTML:
<h2>Present Simple</h2>
<p>Use it for routines.</p>
<ul>
  <li>I work every day.</li>
</ul>
===END_CARD===

===CARD===
NAME: Signal Words
HTML:
<h3>Common markers</h3>
<p>Often, usually, always.</p>
===END_CARD===
"""

        parsed = parse_explanation_exercise(response)

        self.assertEqual(parsed.task_id, "explanation")
        self.assertEqual(len(parsed.cards), 2)
        self.assertEqual(parsed.cards[0].name, "Present Simple")
        self.assertIn("<h2>Present Simple</h2>", parsed.cards[0].content)
        self.assertEqual(parsed.cards[1].name, "Signal Words")

    def test_parse_explanation_json_fallback(self) -> None:
        response = """
{
  "cards": [
    {
      "name": "Past Simple",
      "content": "<h2>Past Simple</h2><p>Use it for finished actions.</p>"
    }
  ]
}
"""

        parsed = parse_explanation_exercise(response)

        self.assertEqual(len(parsed.cards), 1)
        self.assertEqual(parsed.cards[0].name, "Past Simple")
        self.assertIn("finished actions", parsed.cards[0].content)


if __name__ == "__main__":
    unittest.main()
