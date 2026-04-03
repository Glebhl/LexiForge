import logging
import sys
import threading
from logging.handlers import RotatingFileHandler
from pathlib import Path

LOG_FILE_PATH = Path("app.log")
NOISY_LOGGER_LEVELS = {
    "httpx": logging.WARNING,
    "httpcore.http11": logging.WARNING,
    "httpcore.connection": logging.WARNING,
    "openai._base_client": logging.WARNING,
}


def _configure_library_loggers() -> None:
    for logger_name, level in NOISY_LOGGER_LEVELS.items():
        logging.getLogger(logger_name).setLevel(level)


def install_critical_error_logging() -> None:
    def _log_unhandled_exception(
        exc_type: type[BaseException],
        exc_value: BaseException,
        exc_traceback,
        *,
        source: str,
    ) -> None:
        if issubclass(exc_type, KeyboardInterrupt):
            sys.__excepthook__(exc_type, exc_value, exc_traceback)
            return

        logging.getLogger(source).critical(
            "Unhandled critical error",
            exc_info=(exc_type, exc_value, exc_traceback),
        )

    def _sys_excepthook(exc_type: type[BaseException], exc_value: BaseException, exc_traceback) -> None:
        _log_unhandled_exception(exc_type, exc_value, exc_traceback, source="app.unhandled")

    def _threading_excepthook(args: threading.ExceptHookArgs) -> None:
        _log_unhandled_exception(
            args.exc_type,
            args.exc_value,
            args.exc_traceback,
            source=f"app.unhandled.thread.{args.thread.name if args.thread else 'unknown'}",
        )

    def _asyncio_exception_handler(loop, context: dict[str, object]) -> None:
        logger = logging.getLogger("app.unhandled.asyncio")
        exception = context.get("exception")
        message = str(context.get("message", "Unhandled asyncio error"))

        if isinstance(exception, BaseException):
            logger.critical(message, exc_info=(type(exception), exception, exception.__traceback__))
            return

        logger.critical("%s | context=%s", message, context)

    sys.excepthook = _sys_excepthook
    threading.excepthook = _threading_excepthook

    try:
        import asyncio

        asyncio.get_event_loop_policy().get_event_loop().set_exception_handler(_asyncio_exception_handler)
    except RuntimeError:
        pass


def setup_logging(level: int = logging.INFO, log_to_file: bool = False) -> None:
    fmt = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"
    formatter = logging.Formatter(fmt=fmt, datefmt=datefmt)

    root = logging.getLogger()
    root.setLevel(level)

    if not any(isinstance(handler, logging.StreamHandler) and not isinstance(handler, RotatingFileHandler) for handler in root.handlers):
        console = logging.StreamHandler()
        console.setLevel(level)
        console.setFormatter(formatter)
        root.addHandler(console)

    if log_to_file:
        # Recreate the file handler on each startup so the log file is cleared.
        for handler in list(root.handlers):
            if isinstance(handler, RotatingFileHandler):
                root.removeHandler(handler)
                handler.close()

        LOG_FILE_PATH.write_text("", encoding="utf-8")
        file_handler = RotatingFileHandler(
            filename=LOG_FILE_PATH,
            mode="w",
            maxBytes=5_000_000,
            backupCount=3,
            encoding="utf-8",
        )
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        root.addHandler(file_handler)

    _configure_library_loggers()
    install_critical_error_logging()
