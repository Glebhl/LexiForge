from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, frozen=True)
class LLMMessage:
    role: str
    content: str


@dataclass(slots=True, frozen=True)
class LLMTokenUsage:
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None
    details: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class LLMResponse:
    text: str
    response_id: str | None = None
    usage: LLMTokenUsage | None = None
    raw: Any | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
