from __future__ import annotations

import hashlib
import json
import logging
import time
from collections.abc import Iterator, Sequence
from typing import Any

from .base import BaseProvider
from ..types import LLMMessage, LLMResponse, LLMTokenUsage


logger = logging.getLogger(__name__)

OPENAI_API_KEY_PATH = "openai/api_key"

OPENAI_REASONING_EFFORT_NONE = "none"
OPENAI_REASONING_EFFORT_MINIMAL = "minimal"
OPENAI_REASONING_EFFORT_LOW = "low"
OPENAI_REASONING_EFFORT_MEDIUM = "medium"
OPENAI_REASONING_EFFORT_HIGH = "high"
OPENAI_REASONING_EFFORT_XHIGH = "xhigh"
OPENAI_REASONING_EFFORTS = (
    OPENAI_REASONING_EFFORT_NONE,
    OPENAI_REASONING_EFFORT_MINIMAL,
    OPENAI_REASONING_EFFORT_LOW,
    OPENAI_REASONING_EFFORT_MEDIUM,
    OPENAI_REASONING_EFFORT_HIGH,
    OPENAI_REASONING_EFFORT_XHIGH,
)

OPENAI_TEXT_VERBOSITY_LOW = "low"
OPENAI_TEXT_VERBOSITY_MEDIUM = "medium"
OPENAI_TEXT_VERBOSITY_HIGH = "high"
OPENAI_TEXT_VERBOSITIES = (
    OPENAI_TEXT_VERBOSITY_LOW,
    OPENAI_TEXT_VERBOSITY_MEDIUM,
    OPENAI_TEXT_VERBOSITY_HIGH,
)

OPENAI_SERVICE_TIER_AUTO = "auto"
OPENAI_SERVICE_TIER_FLEX = "flex"
OPENAI_SERVICE_TIERS = (
    OPENAI_SERVICE_TIER_AUTO,
    OPENAI_SERVICE_TIER_FLEX,
)


class OpenAIProvider(BaseProvider):
    name = "openai"

    def request_response(
        self,
        *,
        messages: Sequence[LLMMessage],
        model: str,
        reasoning_effort: str | None = None,
        text_verbosity: str | None = None,
        service_tier: str | None = None,
        provider_options: dict[str, Any] | None = None,
        temperature: float | None = None,
        max_output_tokens: int | None = None,
    ) -> LLMResponse:
        from openai import OpenAI

        client = OpenAI(**self._build_client_kwargs(
            provider_options=provider_options,
        ))
        request = self._build_request(
            messages=messages,
            model=model,
            reasoning_effort=reasoning_effort,
            text_verbosity=text_verbosity,
            service_tier=service_tier,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )

        response = client.responses.create(**request)
        usage = self._build_usage(response)
        if usage is not None:
            logger.info(
                "OpenAI usage: model=%s input_tokens=%s output_tokens=%s total_tokens=%s",
                model,
                usage.input_tokens,
                usage.output_tokens,
                usage.total_tokens,
            )

        return LLMResponse(
            text=self._extract_text(response),
            response_id=getattr(response, "id", None),
            usage=usage,
            raw=response,
            metadata={"model": model, "provider": self.name},
        )

    def stream_response(
        self,
        *,
        messages: Sequence[LLMMessage],
        model: str,
        reasoning_effort: str | None = None,
        text_verbosity: str | None = None,
        service_tier: str | None = None,
        provider_options: dict[str, Any] | None = None,
        temperature: float | None = None,
        max_output_tokens: int | None = None,
    ) -> Iterator[str]:
        from openai import OpenAI

        client = OpenAI(**self._build_client_kwargs(
            provider_options=provider_options,
        ))
        request = self._build_request(
            messages=messages,
            model=model,
            reasoning_effort=reasoning_effort,
            text_verbosity=text_verbosity,
            service_tier=service_tier,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )
        request["stream"] = True
        raw_stream = client.responses.create(**request)

        def iterator() -> Iterator[str]:
            started_at = time.perf_counter()
            first_delta_at: float | None = None
            completed_response: Any | None = None
            try:
                for event in raw_stream:
                    event_type = getattr(event, "type", "")
                    if event_type == "response.output_text.delta":
                        delta = getattr(event, "delta", "")
                        if delta:
                            if first_delta_at is None:
                                first_delta_at = time.perf_counter()
                                logger.debug(
                                    "Received first response delta after %.2fs",
                                    first_delta_at - started_at,
                                )
                            yield delta
                    elif event_type == "response.completed":
                        completed_response = getattr(event, "response", None)
                    elif event_type == "error":
                        raise RuntimeError(self._extract_stream_error(event))
            finally:
                close = getattr(raw_stream, "close", None)
                if callable(close):
                    close()
                usage = self._build_usage(completed_response) if completed_response is not None else None
                if usage is not None:
                    logger.info(
                        "OpenAI usage: model=%s input_tokens=%s output_tokens=%s total_tokens=%s",
                        model,
                        usage.input_tokens,
                        usage.output_tokens,
                        usage.total_tokens,
                    )
                logger.debug(
                    "Streaming response finished in %.2fs",
                    time.perf_counter() - started_at,
                )

        return iterator()

    def _build_client_kwargs(
        self,
        *,
        provider_options: dict[str, Any] | None,
    ) -> dict[str, Any]:
        from app.api_keys import get_api_keys_store

        client_kwargs: dict[str, Any] = {
            "api_key": get_api_keys_store().get_value(OPENAI_API_KEY_PATH),
        }
        if provider_options:
            client_kwargs.update(provider_options)
        return client_kwargs

    def _build_request(
        self,
        *,
        messages: Sequence[LLMMessage],
        model: str,
        reasoning_effort: str | None,
        text_verbosity: str | None,
        service_tier: str | None,
        temperature: float | None,
        max_output_tokens: int | None,
    ) -> dict[str, Any]:
        input_messages = [self._build_input_message(message) for message in messages]

        request: dict[str, Any] = {
            "model": model,
            "input": input_messages,
        }
        if temperature is not None:
            request["temperature"] = temperature
        if max_output_tokens is not None:
            request["max_output_tokens"] = max_output_tokens
        if reasoning_effort:
            request["reasoning"] = {"effort": reasoning_effort}
        if text_verbosity:
            request["text"] = {"verbosity": text_verbosity}
        if service_tier:
            request["service_tier"] = service_tier

        prompt_cache_key = self._build_prompt_cache_key(
            input_messages=input_messages,
            model=model,
            reasoning_effort=reasoning_effort,
            text_verbosity=text_verbosity,
            service_tier=service_tier,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )
        if prompt_cache_key is not None:
            request["prompt_cache_key"] = prompt_cache_key

        return request

    @staticmethod
    def _build_input_message(message: LLMMessage) -> dict[str, str]:
        return {"role": message.role, "content": message.content}

    @staticmethod
    def _build_prompt_cache_key(
        *,
        input_messages: Sequence[dict[str, str]],
        model: str,
        reasoning_effort: str | None,
        text_verbosity: str | None,
        service_tier: str | None,
        temperature: float | None,
        max_output_tokens: int | None,
    ) -> str | None:
        """
        Build a stable prompt_cache_key from the request prefix.

        We intentionally exclude the latest user message so that:
        - the shared system/instruction/history prefix gets the same key
        - different final user prompts can reuse the same cached prefix
        """
        prefix_messages = OpenAIProvider._messages_before_last_user(input_messages)
        if not prefix_messages:
            return None

        cache_payload = {
            "model": model,
            "input": prefix_messages,
            "reasoning_effort": reasoning_effort,
            "text_verbosity": text_verbosity,
            "service_tier": service_tier,
            "temperature": temperature,
            "max_output_tokens": max_output_tokens,
        }

        serialized = json.dumps(
            cache_payload,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        return f"prefix-sha256:{digest}"

    @staticmethod
    def _messages_before_last_user(
        input_messages: Sequence[dict[str, str]],
    ) -> list[dict[str, str]]:
        last_user_index: int | None = None
        for index in range(len(input_messages) - 1, -1, -1):
            if input_messages[index].get("role") == "user":
                last_user_index = index
                break

        if last_user_index is None:
            return list(input_messages)

        return list(input_messages[:last_user_index])

    @staticmethod
    def _extract_text(response: Any) -> str:
        if response is None:
            return ""
        if isinstance(response, str):
            return response

        output_text = getattr(response, "output_text", None)
        if isinstance(output_text, str) and output_text:
            return output_text

        chunks: list[str] = []
        for item in getattr(response, "output", []) or []:
            if getattr(item, "type", None) != "message":
                continue
            for content in getattr(item, "content", []) or []:
                content_type = getattr(content, "type", None)
                if content_type == "output_text":
                    chunks.append(getattr(content, "text", ""))
                elif content_type == "refusal":
                    chunks.append(getattr(content, "refusal", ""))
        if chunks:
            return "".join(chunks)

        fallback_text = getattr(response, "text", None)
        if isinstance(fallback_text, str) and fallback_text:
            return fallback_text

        model_dump = getattr(response, "model_dump", None)
        if callable(model_dump):
            dumped = model_dump()
            dumped_output = dumped.get("output", []) if isinstance(dumped, dict) else []
            for item in dumped_output:
                if item.get("type") != "message":
                    continue
                for content in item.get("content", []) or []:
                    content_type = content.get("type")
                    if content_type == "output_text":
                        chunks.append(content.get("text", ""))
                    elif content_type == "refusal":
                        chunks.append(content.get("refusal", ""))
            if chunks:
                return "".join(chunks)

        return ""

    @staticmethod
    def _extract_stream_error(event: Any) -> str:
        error = getattr(event, "error", None)
        if error is not None:
            return getattr(error, "message", None) or str(error)
        return "OpenAI streaming request failed."

    @staticmethod
    def _build_usage(response: Any) -> LLMTokenUsage | None:
        usage = getattr(response, "usage", None)
        if usage is None:
            return None

        def dump_usage_details(details: Any) -> dict[str, Any]:
            model_dump = getattr(details, "model_dump", None)
            if callable(model_dump):
                dumped = model_dump()
                if isinstance(dumped, dict):
                    return dumped

            try:
                return {
                    name: value
                    for name, value in vars(details).items()
                    if not name.startswith("_")
                }
            except TypeError:
                return {}

        details: dict[str, Any] = {}
        input_details = getattr(usage, "input_tokens_details", None)
        output_details = getattr(usage, "output_tokens_details", None)
        if input_details is not None:
            details["input"] = dump_usage_details(input_details)
        if output_details is not None:
            details["output"] = dump_usage_details(output_details)

        return LLMTokenUsage(
            input_tokens=getattr(usage, "input_tokens", None),
            output_tokens=getattr(usage, "output_tokens", None),
            total_tokens=getattr(usage, "total_tokens", None),
            details=details,
        )
