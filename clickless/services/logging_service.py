"""Structured application logging setup."""

from __future__ import annotations

import logging
from pathlib import Path


def setup_logging(log_level: str = "INFO", log_file: Path | None = None) -> logging.Logger:
    """Configure root logging for Clickless."""
    level = getattr(logging, log_level.upper(), logging.INFO)
    logger = logging.getLogger("clickless")
    logger.setLevel(level)
    logger.handlers.clear()

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console = logging.StreamHandler()
    console.setFormatter(formatter)
    logger.addHandler(console)

    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger