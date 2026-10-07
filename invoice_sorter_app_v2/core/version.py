"""Application build id shown in the desktop title and support logs."""

from __future__ import annotations

from pathlib import Path

from core.sorter import app_root

_VERSION_FILENAME = "VERSION.txt"


def app_version() -> str:
    for folder in (app_root(), Path(__file__).resolve().parents[1]):
        path = folder / _VERSION_FILENAME
        if path.is_file():
            line = path.read_text(encoding="utf-8").strip().splitlines()
            if line:
                return line[0].strip()
    return "dev"
