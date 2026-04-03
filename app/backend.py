from __future__ import annotations

import logging
from threading import Lock, Thread
from collections.abc import Callable, Mapping
from typing import Any

logger = logging.getLogger(__name__)


class Backend:
    """
    JS API bridge for pywebview.
    """

    def __init__(self) -> None:
        self._ui_event_handler: Callable[[str, dict[str, Any]], None] | None = None
        self._state: dict[str, Any] = {}
        self._state_lock = Lock()

    def set_ui_event_handler(
        self,
        handler: Callable[[str, dict[str, Any]], None] | None,
    ) -> None:
        self._ui_event_handler = handler

    def emit_event(
        self,
        event_name: str,
        payload: Mapping[str, Any] | None = None,
    ) -> dict[str, bool]:
        payload_dict: dict[str, Any] = dict(payload or {})
        logger.debug("UI event received: name=%s payload=%s", event_name, payload_dict)

        if self._ui_event_handler is None:
            logger.warning("UI event dropped because no handler is active: %s", event_name)
            return {"accepted": False}

        # Run the actual handler out-of-band so pywebview can resolve the JS promise
        # before a controller triggers navigation and tears down the current page.
        Thread(
            target=self._ui_event_handler,
            args=(event_name, payload_dict),
            daemon=True,
        ).start()
        return {"accepted": True}

    def log(self, message: str) -> None:
        logger.debug("JS: %s", message)

    def set_state(self, key: str, value: Any) -> None:
        with self._state_lock:
            self._state[key] = value

    def get_state(self, key: str) -> Any:
        with self._state_lock:
            return self._state.get(key)

    def clear_state(self, key: str) -> None:
        with self._state_lock:
            self._state.pop(key, None)
