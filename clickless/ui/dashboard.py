"""Main dashboard view."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from app.bootstrap import ApplicationContext
from ui.components.stat_card import StatCard


class DashboardPage(QWidget):
    """Shows workflow counts, run statistics, and recent executions."""

    def __init__(self, ctx: ApplicationContext, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._ctx = ctx
        self._build_ui()
        self.refresh()

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        header = QHBoxLayout()
        title = QLabel("Dashboard")
        title.setObjectName("sectionTitle")
        title.setStyleSheet("font-size: 22px; font-weight: 600;")
        header.addWidget(title)
        header.addStretch()

        self._run_example_btn = QPushButton("Run Hello Clickless")
        self._run_example_btn.setObjectName("primaryButton")
        self._run_example_btn.clicked.connect(self._run_example_workflow)
        header.addWidget(self._run_example_btn)
        layout.addLayout(header)

        self._subtitle = QLabel(
            "Modular desktop workflow automation — Phase 1 foundation"
        )
        self._subtitle.setStyleSheet("color: #9aa0a8;")
        layout.addWidget(self._subtitle)

        grid = QGridLayout()
        grid.setSpacing(12)
        self._card_workflows = StatCard("Workflows in database")
        self._card_actions = StatCard("Registered actions")
        self._card_completed = StatCard("Completed runs")
        self._card_failed = StatCard("Failed runs")
        grid.addWidget(self._card_workflows, 0, 0)
        grid.addWidget(self._card_actions, 0, 1)
        grid.addWidget(self._card_completed, 0, 2)
        grid.addWidget(self._card_failed, 0, 3)
        layout.addLayout(grid)

        recent_label = QLabel("Recent executions")
        recent_label.setObjectName("sectionTitle")
        layout.addWidget(recent_label)

        self._runs_table = QTableWidget(0, 4)
        self._runs_table.setHorizontalHeaderLabels(
            ["Run ID", "Workflow", "Status", "Started"]
        )
        self._runs_table.horizontalHeader().setStretchLastSection(True)
        self._runs_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self._runs_table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        layout.addWidget(self._runs_table)

        self._status_line = QLabel("")
        self._status_line.setStyleSheet("color: #7aa2ff;")
        layout.addWidget(self._status_line)

    def refresh(self) -> None:
        db = self._ctx.database
        self._card_workflows.set_value(str(db.count_workflows()))
        self._card_actions.set_value(str(len(self._ctx.registry.list_actions())))
        counts = db.count_workflow_runs_by_status()
        self._card_completed.set_value(str(counts.get("completed", 0)))
        self._card_failed.set_value(str(counts.get("failed", 0)))

        runs = db.list_recent_runs(8)
        self._runs_table.setRowCount(len(runs))
        for row, run in enumerate(runs):
            self._runs_table.setItem(row, 0, QTableWidgetItem(run["run_id"][:8] + "…"))
            self._runs_table.setItem(row, 1, QTableWidgetItem(run["workflow_id"]))
            self._runs_table.setItem(row, 2, QTableWidgetItem(run["status"]))
            self._runs_table.setItem(row, 3, QTableWidgetItem(run["started_at"] or "—"))

    def _run_example_workflow(self) -> None:
        path = self._ctx.project_root / "workflows" / "examples" / "hello_clickless.json"
        self._run_example_btn.setEnabled(False)
        self._status_line.setText("Running Hello Clickless…")
        try:
            state = self._ctx.execution_manager.run_workflow_file(path, dry_run=False)
            self._status_line.setText(
                f"Last run: {state.status.value} ({len(state.step_results)} steps)"
            )
        except Exception as exc:
            self._status_line.setText(f"Run failed: {exc}")
        finally:
            self._run_example_btn.setEnabled(True)
            self.refresh()