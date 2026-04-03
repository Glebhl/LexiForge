from __future__ import annotations

__all__ = ["LessonFlowController", "LessonSetupController", "LoadingScreenController"]

_EXPORT_MAP = {
    "LessonFlowController": ("ui.controllers.lesson_flow", "LessonFlowController"),
    "LessonSetupController": ("ui.controllers.lesson_setup", "LessonSetupController"),
    "LoadingScreenController": ("ui.controllers.loading_screen", "LoadingScreenController"),
}


def __getattr__(name: str):
    from importlib import import_module

    try:
        module_name, attr_name = _EXPORT_MAP[name]
    except KeyError as exc:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}") from exc

    module = import_module(module_name)
    return getattr(module, attr_name)
