from __future__ import annotations

from importlib import import_module
from typing import Any

__all__ = [
    "Backend",
    "Router",
    "get_api_keys_store",
    "get_settings_store",
    "install_critical_error_logging",
    "setup_logging",
]

_EXPORT_MAP = {
    "Backend": ("app.backend", "Backend"),
    "Router": ("app.router", "Router"),
    "get_api_keys_store": ("app.api_keys", "get_api_keys_store"),
    "get_settings_store": ("app.settings", "get_settings_store"),
    "install_critical_error_logging": ("app.logging_config", "install_critical_error_logging"),
    "setup_logging": ("app.logging_config", "setup_logging"),
}


def __getattr__(name: str) -> Any:
    try:
        module_name, attr_name = _EXPORT_MAP[name]
    except KeyError as exc:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}") from exc

    module = import_module(module_name)
    return getattr(module, attr_name)
