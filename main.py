import ctypes
import logging
import sys
from pathlib import Path

import webview
from dotenv import load_dotenv

from app.backend import Backend
from app.logging_config import setup_logging
from app.router import Router

logger = logging.getLogger(__name__)
PROJECT_ROOT = Path(__file__).resolve().parent
ASSETS_DIR = PROJECT_ROOT / "ui" / "assets" / "icons"
APP_ICON_PATH = ASSETS_DIR / "logo.ico"
APP_USER_MODEL_ID = "glosium.desktop.app"


class GlosiumApp:
    def __init__(self) -> None:
        self.backend = Backend()
        self.router: Router | None = None
        self._window_shown = False
        self._native_icon = None
        self.window = webview.create_window(
            "Glosium",
            js_api=self.backend,
            width=1200,
            height=860,
            min_size=(800, 600),
            background_color="#121314",
        )
        self.window.events.before_show += self._apply_windows_icon

    def bootstrap(self) -> None:
        from ui.controllers.lesson_setup import LessonSetupController

        logger.debug("Bootstrapping pywebview window")
        self.router = Router(self.window, self.backend, PROJECT_ROOT)
        self.window.events.loaded += self._show_window_once
        self.router.navigate_to(LessonSetupController)

    def _show_window_once(self) -> None:
        if self._window_shown:
            return

        self._window_shown = True
        self.window.show()
        logger.info("Application started successfully")

    def _apply_windows_icon(self) -> None:
        if sys.platform != "win32":
            return

        if not APP_ICON_PATH.exists():
            logger.warning("Application icon was not found: %s", APP_ICON_PATH)
            return

        native_window = getattr(self.window, "native", None)
        if native_window is None:
            logger.warning("Native window handle is unavailable; icon override was skipped")
            return

        try:
            import clr

            clr.AddReference("System.Drawing")
            from System.Drawing import Icon

            self._native_icon = Icon(str(APP_ICON_PATH))
            native_window.Icon = self._native_icon
            native_window.ShowIcon = True
            logger.debug("Windows app icon was applied from %s", APP_ICON_PATH)
        except Exception:  # noqa: BLE001
            logger.warning("Failed to apply the Windows app icon", exc_info=True)


def main() -> int:
    setup_logging(logging.DEBUG, log_to_file=True)

    try:
        logger.debug("dotenv initialization")
        load_dotenv()
        logger.debug("dotenv was initialized")

        logger.debug("Application startup")

        if sys.platform == "win32":
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(APP_USER_MODEL_ID)

        app = GlosiumApp()
        webview.start(app.bootstrap, icon=str(APP_ICON_PATH))
        return 0
    except Exception:  # noqa: BLE001
        logger.critical("Application terminated due to a critical startup error", exc_info=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
