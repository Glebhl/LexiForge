from __future__ import annotations

__all__ = [
    "OpenAIChatSession",
    "OpenAITextClient",
    "REASONING_EFFORT_NONE",
    "REASONING_EFFORT_MINIMAL",
    "REASONING_EFFORT_LOW",
    "REASONING_EFFORT_MEDIUM",
    "REASONING_EFFORT_HIGH",
    "REASONING_EFFORT_XHIGH",
    "REASONING_EFFORTS",
    "SERVICE_TIER_AUTO",
    "SERVICE_TIER_FLEX",
    "SERVICE_TIERS",
    "TEXT_VERBOSITY_LOW",
    "TEXT_VERBOSITY_MEDIUM",
    "TEXT_VERBOSITY_HIGH",
    "TEXT_VERBOSITIES",
]

_EXPORT_MAP = {
    "OpenAIChatSession": ("llm_gateway.openai_chat", "OpenAIChatSession"),
    "OpenAITextClient": ("llm_gateway.openai_wrapper", "OpenAITextClient"),
    "REASONING_EFFORT_NONE": ("llm_gateway.openai_wrapper", "REASONING_EFFORT_NONE"),
    "REASONING_EFFORT_MINIMAL": ("llm_gateway.openai_wrapper", "REASONING_EFFORT_MINIMAL"),
    "REASONING_EFFORT_LOW": ("llm_gateway.openai_wrapper", "REASONING_EFFORT_LOW"),
    "REASONING_EFFORT_MEDIUM": ("llm_gateway.openai_wrapper", "REASONING_EFFORT_MEDIUM"),
    "REASONING_EFFORT_HIGH": ("llm_gateway.openai_wrapper", "REASONING_EFFORT_HIGH"),
    "REASONING_EFFORT_XHIGH": ("llm_gateway.openai_wrapper", "REASONING_EFFORT_XHIGH"),
    "REASONING_EFFORTS": ("llm_gateway.openai_wrapper", "REASONING_EFFORTS"),
    "SERVICE_TIER_AUTO": ("llm_gateway.openai_wrapper", "SERVICE_TIER_AUTO"),
    "SERVICE_TIER_FLEX": ("llm_gateway.openai_wrapper", "SERVICE_TIER_FLEX"),
    "SERVICE_TIERS": ("llm_gateway.openai_wrapper", "SERVICE_TIERS"),
    "TEXT_VERBOSITY_LOW": ("llm_gateway.openai_wrapper", "TEXT_VERBOSITY_LOW"),
    "TEXT_VERBOSITY_MEDIUM": ("llm_gateway.openai_wrapper", "TEXT_VERBOSITY_MEDIUM"),
    "TEXT_VERBOSITY_HIGH": ("llm_gateway.openai_wrapper", "TEXT_VERBOSITY_HIGH"),
    "TEXT_VERBOSITIES": ("llm_gateway.openai_wrapper", "TEXT_VERBOSITIES"),
}


def __getattr__(name: str):
    from importlib import import_module

    try:
        module_name, attr_name = _EXPORT_MAP[name]
    except KeyError as exc:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}") from exc

    module = import_module(module_name)
    return getattr(module, attr_name)
