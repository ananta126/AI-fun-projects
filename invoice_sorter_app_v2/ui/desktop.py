"""PySide6 desktop UI for the invoice sorter engine."""

from __future__ import annotations

import sys
from pathlib import Path

from PySide6.QtCore import QObject, Qt, QThread, Signal
from PySide6.QtWidgets import (
    QApplication,
    QFileDialog,
    QFormLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QProgressBar,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.sorter import process  # noqa: E402


class SortWorker(QObject):
    progress = Signal(int, int, str)
    finished = Signal(list)
    failed = Signal(str)

    def __init__(self, source: Path, output: Path):
        super().__init__()
        self.source = source
        self.output = output

    def run(self):
        try:
            def on_progress(done, total, name):
                self.progress.emit(done, total, name or "")

            results = process(self.source, self.output, progress=on_progress)
            self.finished.emit(results)
        except Exception as exc:  # noqa: BLE001 — surface any engine error in the UI
            self.failed.emit(str(exc))


class InvoiceSorterWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Invoice Sorter")
        self.resize(980, 640)
        self._thread = None
        self._worker = None

        intro = QLabel(
            "Each PDF is one invoice. Page 1 is read; the whole file is copied to "
            "Customer / printed year / source day folder / GST invoice no.pdf"
        )
        intro.setWordWrap(True)

        self.input_edit = QLineEdit()
        self.input_edit.setPlaceholderText(r"C:\Invoices\June 26  or  month.zip")
        self.output_edit = QLineEdit()
        self.output_edit.setPlaceholderText(r"C:\Invoices\Output")

        browse_in = QPushButton("Browse…")
        browse_in.clicked.connect(self._browse_input)
        browse_out = QPushButton("Browse…")
        browse_out.clicked.connect(self._browse_output)

        in_row = QHBoxLayout()
        in_row.addWidget(self.input_edit)
        in_row.addWidget(browse_in)
        out_row = QHBoxLayout()
        out_row.addWidget(self.output_edit)
        out_row.addWidget(browse_out)

        form = QFormLayout()
        form.addRow("Input zip or folder", in_row)
        form.addRow("Output root", out_row)

        self.run_button = QPushButton("Sort invoices")
        self.run_button.clicked.connect(self._start)
        self.progress = QProgressBar()
        self.progress.setRange(0, 100)
        self.status = QLabel(
            "Ready. PIS folders are ignored. PaddleOCR stays off unless INVOICE_SORTER_USE_PADDLE=1."
        )
        self.status.setWordWrap(True)

        self.table = QTableWidget(0, 7)
        self.table.setHorizontalHeaderLabels(
            ["Status", "Invoice", "Customer", "Year", "Source day", "Source file", "Reason"]
        )
        self.table.horizontalHeader().setStretchLastSection(True)

        layout = QVBoxLayout()
        layout.addWidget(intro)
        layout.addLayout(form)
        layout.addWidget(self.run_button)
        layout.addWidget(self.progress)
        layout.addWidget(self.status)
        layout.addWidget(self.table)

        container = QWidget()
        container.setLayout(layout)
        self.setCentralWidget(container)

    def _browse_input(self):
        path, _ = QFileDialog.getOpenFileName(self, "Choose zip", "", "Zip (*.zip);;All files (*)")
        if not path:
            path = QFileDialog.getExistingDirectory(self, "Choose input folder")
        if path:
            self.input_edit.setText(path)

    def _browse_output(self):
        path = QFileDialog.getExistingDirectory(self, "Choose output folder")
        if path:
            self.output_edit.setText(path)

    def _start(self):
        source = Path(self.input_edit.text().strip())
        output = Path(self.output_edit.text().strip())
        if not source.exists():
            QMessageBox.warning(self, "Input missing", "Choose an existing zip or folder.")
            return
        if not str(output).strip():
            QMessageBox.warning(self, "Output missing", "Choose an output folder.")
            return
        output.mkdir(parents=True, exist_ok=True)

        self.run_button.setEnabled(False)
        self.progress.setValue(0)
        self.status.setText("Reading page 1 of each invoice…")
        self.table.setRowCount(0)

        self._thread = QThread(self)
        self._worker = SortWorker(source, output)
        self._worker.moveToThread(self._thread)
        self._thread.started.connect(self._worker.run)
        self._worker.progress.connect(self._on_progress)
        self._worker.finished.connect(self._on_finished)
        self._worker.failed.connect(self._on_failed)
        self._worker.finished.connect(self._thread.quit)
        self._worker.failed.connect(self._thread.quit)
        self._thread.finished.connect(self._cleanup_worker)
        self._thread.start()

    def _on_progress(self, done: int, total: int, name: str):
        if total:
            self.progress.setValue(int(100 * done / total))
        label = f"Reading page 1: {done} of {total}"
        if name:
            label = f"{label}: {name}"
        self.status.setText(label)

    def _on_finished(self, results: list):
        self.run_button.setEnabled(True)
        self.progress.setValue(100)
        copied = sum(r.get("status") == "COPIED" for r in results)
        review = sum(r.get("status") == "REVIEW" for r in results)
        skipped = sum(r.get("status") == "SKIPPED" for r in results)
        self.status.setText(f"Done. Copied {copied}, review {review}, skipped {skipped}.")
        self.table.setRowCount(len(results))
        for row, item in enumerate(results):
            values = [
                item.get("status", ""),
                item.get("invoice_number", ""),
                item.get("customer", ""),
                item.get("year", ""),
                item.get("date_folder", ""),
                item.get("source_file", ""),
                item.get("reason", ""),
            ]
            for col, value in enumerate(values):
                cell = QTableWidgetItem(str(value))
                if item.get("status") == "REVIEW":
                    cell.setForeground(Qt.red)
                self.table.setItem(row, col, cell)
        self.table.resizeColumnsToContents()

    def _on_failed(self, message: str):
        self.run_button.setEnabled(True)
        QMessageBox.critical(self, "Sort failed", message)
        self.status.setText(message)

    def _cleanup_worker(self):
        if self._worker is not None:
            self._worker.deleteLater()
            self._worker = None
        if self._thread is not None:
            self._thread.deleteLater()
            self._thread = None


def main():
    app = QApplication(sys.argv)
    window = InvoiceSorterWindow()
    window.show()
    sys.exit(app.exec())
