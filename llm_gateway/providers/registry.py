from __future__ import annotations

from collections.abc import Callable, Sequence
from importlib import import_module
from typing import Any

from ..model_spec import ModelSpec
from .base import BaseProvider
from ..types import LLMMessage, LLMResponse


ProviderLoader = Callable[[], BaseProvider]

_PROVIDERS: dict[str, BaseProvider] = {}
_PROVIDER_LOADERS: dict[str, ProviderLoader] = {
    "openai": lambda: import_module("llm_gateway.providers.openai").OpenAIProvider(),
    "google": lambda: import_module("llm_gateway.providers.google").GoogleProvider(),
}


def register_provider(name: str, provider: BaseProvider) -> None:
    _PROVIDERS[name.strip().lower()] = provider


def get_provider(name: str) -> BaseProvider:
    normalized_name = name.strip().lower()
    cached_provider = _PROVIDERS.get(normalized_name)
    if cached_provider is not None:
        return cached_provider

    try:
        loader = _PROVIDER_LOADERS[normalized_name]
    except KeyError as exc:
        raise KeyError(normalized_name) from exc

    provider = loader()
    _PROVIDERS[normalized_name] = provider
    return provider


def request_provider_response(
    *,
    model_spec: ModelSpec,
    messages: Sequence[LLMMessage],
    reasoning_effort: str | None = None,
    text_verbosity: str | None = None,
    service_tier: str | None = None,
    provider_options: dict[str, Any] | None = None,
    temperature: float | None = None,
    max_output_tokens: int | None = None,
) -> LLMResponse:
    provider_name = model_spec.provider.lower()
    try:
        provider = get_provider(provider_name)
    except KeyError as exc:
        available_names = sorted(set(_PROVIDERS) | set(_PROVIDER_LOADERS))
        available = ", ".join(available_names) or "none"
        raise ValueError(
            f"Unknown LLM provider {model_spec.provider!r}. Available providers: {available}."
        ) from exc

    return provider.request_response(
        messages=list(messages),
        model=model_spec.model,
        reasoning_effort=reasoning_effort,
        text_verbosity=text_verbosity,
        service_tier=service_tier,
        provider_options=provider_options or {},
        temperature=temperature,
        max_output_tokens=max_output_tokens,
    )


def get_registered_providers() -> tuple[str, ...]:
    return tuple(sorted(set(_PROVIDERS) | set(_PROVIDER_LOADERS)))
