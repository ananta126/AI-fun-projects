"""Dashboard statistic card widget."""

from __future__ import annotations

from PySide6.QtWidgets import QLabel, QVBoxLayout, QWidget


class StatCard(QWidget):
    def __init__(self, title: str, value: str = "—", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("statCard")

        self._value_label = QLabel(value)
        self._value_label.setObjectName("statCardValue")
        title_label = QLabel(title)
        title_label.setObjectName("statCardTitle")

        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.addWidget(title_label)
        layout.addWidget(self._value_label)

    def set_value(self, value: str) -> None:
        self._value_label.setText(value)