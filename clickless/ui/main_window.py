"""Primary application window with sidebar navigation."""

from __future__ import annotations

from PySide6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QPushButton,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)

from app.bootstrap import ApplicationContext
from app.constants import APP_VERSION
from ui.dashboard import DashboardPage
from ui.styles.dark_theme import DARK_STYLESHEET


class MainWindow(QMainWindow):
    def __init__(self, ctx: ApplicationContext) -> None:
        super().__init__()
        self._ctx = ctx
        self.setWindowTitle("Clickless — Workflow Automation")
        self.setMinimumSize(1024, 640)
        self.setStyleSheet(DARK_STYLESHEET)

        central = QWidget()
        self.setCentralWidget(central)
        root = QHBoxLayout(central)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        sidebar = QWidget()
        sidebar.setObjectName("sidebar")
        side_layout = QVBoxLayout(sidebar)
        side_layout.setContentsMargins(8, 8, 8, 8)

        brand = QLabel("Clickless")
        brand.setObjectName("sidebarTitle")
        side_layout.addWidget(brand)

        self._nav_buttons: list[QPushButton] = []
        nav_items = [
            ("Dashboard", 0),
            ("Workflows", 1),
            ("Execution History", 2),
            ("Settings", 3),
        ]
        self._stack = QStackedWidget()
        self._stack.setObjectName("contentArea")

        self._dashboard = DashboardPage(ctx)
        self._stack.addWidget(self._dashboard)
        for title, _ in nav_items[1:]:
            placeholder = QWidget()
            pl_layout = QVBoxLayout(placeholder)
            pl = QLabel(f"{title}\n\n(Coming in a later phase)")
            pl.setStyleSheet("color: #9aa0a8; padding: 24px;")
            pl_layout.addWidget(pl)
            self._stack.addWidget(placeholder)

        for idx, (title, page_idx) in enumerate(nav_items):
            btn = QPushButton(title)
            btn.setObjectName("navButton")
            btn.setProperty("active", "false")
            btn.clicked.connect(lambda checked=False, i=page_idx: self._navigate(i))
            self._nav_buttons.append(btn)
            side_layout.addWidget(btn)

        side_layout.addStretch()
        version = QLabel(f"v{APP_VERSION} · Phase 1")
        version.setStyleSheet("color: #6b7280; font-size: 11px; padding: 8px;")
        side_layout.addWidget(version)

        root.addWidget(sidebar)
        root.addWidget(self._stack, stretch=1)
        self._navigate(0)

    def _navigate(self, index: int) -> None:
        self._stack.setCurrentIndex(index)
        for i, btn in enumerate(self._nav_buttons):
            btn.setProperty("active", "true" if i == index else "false")
            btn.style().unpolish(btn)
            btn.style().polish(btn)
        if index == 0:
            self._dashboard.refresh()