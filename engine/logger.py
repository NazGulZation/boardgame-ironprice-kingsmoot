"""
IRON PRICE: Kingsmoot — Persistent Logging Subsystem
Pure Python standard library logging to file and console for bug tracking.
"""
import logging
import sys
from pathlib import Path
from typing import List, Optional

# Project root directory
ROOT_DIR = Path(__file__).resolve().parent.parent
LOGS_DIR = ROOT_DIR / "logs"
GAME_LOG_FILE = LOGS_DIR / "game.log"
ERROR_LOG_FILE = LOGS_DIR / "error.log"

_initialized = False


class SafeStreamHandler(logging.StreamHandler):
    """Console handler that avoids UnicodeEncodeError on Windows terminals with non-UTF8 code pages."""
    def emit(self, record):
        try:
            msg = self.format(record)
            stream = self.stream
            try:
                stream.write(msg + self.terminator)
            except UnicodeEncodeError:
                encoding = getattr(stream, "encoding", "ascii") or "ascii"
                safe_msg = msg.encode(encoding, errors="backslashreplace").decode(encoding)
                stream.write(safe_msg + self.terminator)
            self.flush()
        except Exception:
            self.handleError(record)


def setup_logging(log_level: int = logging.INFO) -> logging.Logger:
    """Initialize handlers for game and error log files."""
    global _initialized
    logger = logging.getLogger("ironprice")
    if _initialized:
        return logger

    logger.setLevel(logging.DEBUG)
    logger.propagate = False

    # Ensure logs/ directory exists
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    formatter = logging.Formatter(
        fmt="[%(asctime)s] [%(levelname)-7s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 1. Main Game Log Handler (INFO and above, UTF-8 preserved)
    game_handler = logging.FileHandler(str(GAME_LOG_FILE), encoding="utf-8")
    game_handler.setLevel(log_level)
    game_handler.setFormatter(formatter)
    logger.addHandler(game_handler)

    # 2. Dedicated Error Log Handler (ERROR and above, UTF-8 preserved)
    error_handler = logging.FileHandler(str(ERROR_LOG_FILE), encoding="utf-8")
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)

    # 3. Unicode-Safe Console Stream Handler
    console_handler = SafeStreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    _initialized = True
    logger.info("Logging initialized. Writing to %s and %s", GAME_LOG_FILE, ERROR_LOG_FILE)
    return logger


def get_logger(child_name: Optional[str] = None) -> logging.Logger:
    """Get a logger, configuring the parent ironprice logger if not yet setup."""
    if not _initialized:
        setup_logging()
    if child_name:
        return logging.getLogger(f"ironprice.{child_name}")
    return logging.getLogger("ironprice")


def get_recent_logs(max_lines: int = 100) -> List[str]:
    """Read the most recent lines from game.log."""
    if not GAME_LOG_FILE.exists():
        return []
    try:
        with open(GAME_LOG_FILE, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
            return [line.rstrip() for line in lines[-max_lines:]]
    except Exception as e:
        return [f"Error reading log file: {e}"]
