"""PySide6 desktop UI for the invoice sorter engine."""

from __future__ import annotations

import sys
import traceback
from pathlib import Path

from PySide6.QtCore import QObject, Qt, QThread, QUrl, Signal
from PySide6.QtGui import QDesktopServices
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

from core.customer_master import CustomerMasterError, describe_master_files_status  # noqa: E402
from core.pipeline import import_corrections  # noqa: E402
from core.review_csv import ALIAS_MAPPING_NAME, CUSTOMER_LIST_NAME, REVIEW_CSV_NAME  # noqa: E402
from core.sorter import EXCEPTION_REPORT_NAME, app_root, process  # noqa: E402
from core.version import app_version  # noqa: E402

SORT_ERROR_LOG = "invoice_sorter_sort_error.log"


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
        except CustomerMasterError as exc:
            try:
                (self.output / SORT_ERROR_LOG).write_text(str(exc), encoding="utf-8")
            except OSError:
                pass
            self.failed.emit(str(exc))
        except Exception:  # noqa: BLE001 — surface any engine error in the UI
            tb = traceback.format_exc()
            try:
                (self.output / SORT_ERROR_LOG).write_text(tb, encoding="utf-8")
            except OSError:
                pass
            self.failed.emit(tb)


class InvoiceSorterWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle(f"Invoice Sorter ({app_version()})")
        self.resize(1100, 680)
        self._thread = None
        self._worker = None

        intro = QLabel(
            "Desktop app — no browser. Each PDF is one invoice. Page 1 is read; "
            "the whole file is copied to Official Customer / YYYY / invoice number.pdf. "
            "YYYY comes from the folder under invoice/ (e.g. 01_2022 → 2022), not the scan-date folder. "
            "Unknown customers stay in the review CSV until you fill Correct Customer ID."
        )
        intro.setWordWrap(True)

        self.input_edit = QLineEdit()
        self.input_edit.setPlaceholderText(r"C:\Invoices\June 26  or  month.zip")
        self.output_edit = QLineEdit()
        self.output_edit.setPlaceholderText(r"C:\Invoices\Output")
        self._output_root = None
        self._report_path = None
        self._review_path = None
        self._customer_list_path = None
        self._alias_mapping_path = app_root() / ALIAS_MAPPING_NAME

        browse_zip = QPushButton("Choose zip")
        browse_zip.clicked.connect(self._browse_zip)
        browse_folder = QPushButton("Choose folder")
        browse_folder.clicked.connect(self._browse_input_folder)
        browse_out = QPushButton("Choose folder")
        browse_out.clicked.connect(self._browse_output)

        in_row = QHBoxLayout()
        in_row.addWidget(self.input_edit)
        in_row.addWidget(browse_zip)
        in_row.addWidget(browse_folder)
        out_row = QHBoxLayout()
        out_row.addWidget(self.output_edit)
        out_row.addWidget(browse_out)

        form = QFormLayout()
        form.addRow("Input zip or folder", in_row)
        form.addRow("Output root", out_row)

        self.run_button = QPushButton("Sort invoices")
        self.run_button.clicked.connect(self._start)
        self.open_output_button = QPushButton("Open output folder")
        self.open_output_button.setEnabled(False)
        self.open_output_button.clicked.connect(self._open_output)
        self.open_report_button = QPushButton("Open Excel report")
        self.open_report_button.setEnabled(False)
        self.open_report_button.clicked.connect(self._open_report)
        self.open_review_button = QPushButton("Open review CSV")
        self.open_review_button.setEnabled(False)
        self.open_review_button.clicked.connect(self._open_review)
        self.open_customers_button = QPushButton("Open customer list")
        self.open_customers_button.setEnabled(False)
        self.open_customers_button.clicked.connect(self._open_customers)
        self.open_aliases_button = QPushButton("Open alias mapping")
        self.open_aliases_button.setEnabled(self._alias_mapping_path.is_file())
        self.open_aliases_button.clicked.connect(self._open_aliases)
        self.import_button = QPushButton("Import corrections")
        self.import_button.clicked.connect(self._import_corrections)
        self.progress = QProgressBar()
        self.progress.setRange(0, 100)
        self.status = QLabel(
            "Ready. PIS folders are ignored. Output year comes from invoice/NN_YYYY (e.g. 01_2022 → 2022). "
            "Finished source folders are renamed with _done."
        )
        self.status.setWordWrap(True)

        actions = QHBoxLayout()
        actions.addWidget(self.run_button)
        actions.addWidget(self.open_output_button)
        actions.addWidget(self.open_report_button)
        actions2 = QHBoxLayout()
        actions2.addWidget(self.open_review_button)
        actions2.addWidget(self.open_customers_button)
        actions2.addWidget(self.open_aliases_button)
        actions2.addWidget(self.import_button)

        self.table = QTableWidget(0, 8)
        self.table.setHorizontalHeaderLabels(
            ["Status", "Document", "Invoice", "Customer", "Customer ID", "Year", "Source day", "Reason"]
        )
        self.table.horizontalHeader().setStretchLastSection(True)

        layout = QVBoxLayout()
        layout.addWidget(intro)
        layout.addLayout(form)
        layout.addLayout(actions)
        layout.addLayout(actions2)
        layout.addWidget(self.progress)
        layout.addWidget(self.status)
        layout.addWidget(self.table)

        container = QWidget()
        container.setLayout(layout)
        self.setCentralWidget(container)
        self._refresh_master_status()

    def _refresh_master_status(self):
        master_line = describe_master_files_status()
        self.status.setText(
            f"Build {app_version()}. {master_line} "
            "PIS folders are ignored. Output year comes from invoice/NN_YYYY (e.g. 01_2022 → 2022). "
            "Finished source folders are renamed with _done."
        )

    def _browse_zip(self):
        path, _ = QFileDialog.getOpenFileName(self, "Choose invoice zip", "", "Zip (*.zip)")
        if path:
            self.input_edit.setText(path)

    def _browse_input_folder(self):
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

        self._output_root = output
        self.run_button.setEnabled(False)
        self.open_output_button.setEnabled(False)
        self.open_report_button.setEnabled(False)
        self.open_review_button.setEnabled(False)
        self.open_customers_button.setEnabled(False)
        self.open_aliases_button.setEnabled(False)
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
        self.open_output_button.setEnabled(self._output_root is not None)
        self._report_path = None
        self._review_path = None
        self._customer_list_path = None
        self._alias_mapping_path = app_root() / ALIAS_MAPPING_NAME
        if self._output_root is not None:
            report = self._output_root / EXCEPTION_REPORT_NAME
            if report.exists():
                self._report_path = report
            review_csv = self._output_root / REVIEW_CSV_NAME
            if review_csv.exists():
                self._review_path = review_csv
            customers = self._output_root / CUSTOMER_LIST_NAME
            if customers.exists():
                self._customer_list_path = customers
            aliases = self._output_root / ALIAS_MAPPING_NAME
            if aliases.exists():
                self._alias_mapping_path = aliases
        self.open_report_button.setEnabled(self._report_path is not None)
        self.open_review_button.setEnabled(self._review_path is not None)
        self.open_customers_button.setEnabled(self._customer_list_path is not None)
        self.open_aliases_button.setEnabled(self._alias_mapping_path.is_file())
        self.progress.setValue(100)
        copied = sum(r.get("status") == "COPIED" for r in results)
        review = sum(r.get("status") == "REVIEW" for r in results)
        failed = sum(r.get("status") == "FAILED" for r in results)
        skipped = sum(r.get("status") == "SKIPPED" for r in results)
        status = f"Done. Copied {copied}, review {review}, failed {failed}, skipped {skipped}."
        if self._report_path:
            status += f" Excel report: {self._report_path.name}"
        self.status.setText(status)
        self.table.setRowCount(len(results))
        for row, item in enumerate(results):
            values = [
                item.get("status", ""),
                item.get("document_id", ""),
                item.get("invoice_number", ""),
                item.get("customer", ""),
                item.get("customer_id", ""),
                item.get("year", ""),
                item.get("date_folder", ""),
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
        log_hint = ""
        if self._output_root is not None:
            log_path = self._output_root / SORT_ERROR_LOG
            if log_path.is_file():
                log_hint = f"\n\nDetails saved to:\n{log_path}"
        is_master = "Cannot sort:" in message or "Customer master" in message
        display = message
        if not is_master and len(display) > 3500:
            display = display[:3500] + "\n…(truncated)" + log_hint
        elif log_hint and log_hint not in display:
            display = display + log_hint
        title = "Customer master" if is_master else "Sort failed"
        QMessageBox.critical(self, title, display)
        if is_master:
            self._refresh_master_status()
        else:
            short = message.splitlines()[-1] if message else "Sort failed"
            self.status.setText(short[:500])

    def _open_output(self):
        if self._output_root is None:
            return
        QDesktopServices.openUrl(QUrl.fromLocalFile(str(self._output_root)))

    def _open_report(self):
        if self._report_path is None:
            return
        QDesktopServices.openUrl(QUrl.fromLocalFile(str(self._report_path)))

    def _open_review(self):
        if self._review_path is None:
            return
        QDesktopServices.openUrl(QUrl.fromLocalFile(str(self._review_path)))

    def _open_customers(self):
        if self._customer_list_path is None:
            return
        QDesktopServices.openUrl(QUrl.fromLocalFile(str(self._customer_list_path)))

    def _open_aliases(self):
        if not self._alias_mapping_path.is_file():
            return
        QDesktopServices.openUrl(QUrl.fromLocalFile(str(self._alias_mapping_path)))

    def _import_corrections(self):
        if self._output_root is None:
            typed = Path(self.output_edit.text().strip()) if self.output_edit.text().strip() else None
            if typed is not None and typed.is_dir():
                self._output_root = typed
        if self._output_root is None:
            QMessageBox.warning(self, "Output missing", "Choose the output folder from a previous sort, then import.")
            return
        path, _ = QFileDialog.getOpenFileName(self, "Corrections CSV", "", "CSV (*.csv)")
        if not path:
            return
        try:
            results = import_corrections(Path(path), self._output_root)
        except Exception as exc:  # noqa: BLE001 — show the import error in the window
            QMessageBox.critical(self, "Import failed", str(exc))
            return
        self._on_finished(results)
        copied = sum(item.get("status") == "COPIED" for item in results)
        review = sum(item.get("status") == "REVIEW" for item in results)
        self.status.setText(f"Corrections applied. Copied {copied}, still in review {review}. OCR was not repeated.")

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
