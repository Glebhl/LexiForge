from __future__ import annotations

import unittest
from types import SimpleNamespace

from llm_gateway.providers.google import GoogleProvider


class GoogleProviderResponseParsingTests(unittest.TestCase):
    def test_extracts_text_usage_and_response_id_from_http_response_body(self) -> None:
        response = SimpleNamespace(
            text=None,
            response_id=None,
            usage_metadata=None,
            candidates=None,
            sdk_http_response=SimpleNamespace(
                body="""
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {"text": "hello from body"}
                        ]
                      }
                    }
                  ],
                  "usageMetadata": {
                    "promptTokenCount": 11,
                    "candidatesTokenCount": 7,
                    "totalTokenCount": 18,
                    "thoughtsTokenCount": 3,
                    "trafficType": "ON_DEMAND"
                  },
                  "responseId": "resp-123"
                }
                """,
                headers={"x-gemini-service-tier": "standard"},
            ),
        )

        self.assertEqual(GoogleProvider._extract_text(response), "hello from body")
        self.assertEqual(GoogleProvider._extract_response_id(response), "resp-123")

        usage = GoogleProvider._build_usage(response)
        self.assertIsNotNone(usage)
        assert usage is not None
        self.assertEqual(usage.input_tokens, 11)
        self.assertEqual(usage.output_tokens, 7)
        self.assertEqual(usage.total_tokens, 18)
        self.assertEqual(usage.details["thoughts_token_count"], 3)
        self.assertEqual(usage.details["traffic_type"], "ON_DEMAND")


if __name__ == "__main__":
    unittest.main()
