from __future__ import annotations

from typing import Any

from .core import TextProviderProtocol
from .model_spec import DEFAULT_PROVIDER, ModelSpec, parse_model_spec


class LLMTextClient(TextProviderProtocol):
    def __init__(
        self,
        *,
        model: str = "openai:gpt-5-mini",
        stream: bool = False,
        reasoning_effort: str | None = None,
        text_verbosity: str | None = None,
        service_tier: str | None = None,
        provider_options: dict[str, Any] | None = None,
    ) -> None:
        parsed_model_spec: ModelSpec = parse_model_spec(model)
        self.parsed_model_spec = parsed_model_spec
        self.model_spec = str(parsed_model_spec)
        self.model = self.model_spec
        super().__init__(
            model_spec=parsed_model_spec,
            stream=stream,
            reasoning_effort=reasoning_effort,
            text_verbosity=text_verbosity,
            service_tier=service_tier,
            provider_options=provider_options,
        )


class OpenAITextClient(LLMTextClient):
    def __init__(self, *, model: str = "gpt-5-mini", **kwargs: Any) -> None:
        super().__init__(model=self._normalize_model(model), **kwargs)

    @staticmethod
    def _normalize_model(model: str) -> str:
        spec = parse_model_spec(model, default_provider=DEFAULT_PROVIDER)
        if spec.provider != DEFAULT_PROVIDER:
            raise ValueError(
                f"OpenAITextClient only supports the '{DEFAULT_PROVIDER}' provider, got {spec.provider!r}."
            )
        return str(spec)
