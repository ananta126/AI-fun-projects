"""Clickless desktop entry point."""

from __future__ import annotations

import sys
from pathlib import Path

from PySide6.QtWidgets import QApplication

from app.bootstrap import bootstrap
from app.constants import APP_NAME, APP_ORG
from ui.main_window import MainWindow


def main() -> int:
    project_root = Path(__file__).resolve().parent
    ctx = bootstrap(project_root)

    app = QApplication(sys.argv)
    app.setApplicationName(APP_NAME)
    app.setOrganizationName(APP_ORG)

    window = MainWindow(ctx)
    window.show()

    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())