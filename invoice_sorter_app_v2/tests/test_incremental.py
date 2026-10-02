"""Incremental filing: source-folder year, aliases, review, and _done."""

from __future__ import annotations

import csv
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core.db import Store  # noqa: E402
from core.pipeline import import_corrections  # noqa: E402
from core.sorter import load_official_customers, process, year_from_scan_folder  # noqa: E402
from tests.pdf_fixtures import invoice_page_text, write_text_pdf  # noqa: E402


def _write_page(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text, fontsize=11)
    doc.save(path)
    doc.close()
    return path


def _invoice(path: Path, invoice_no: str, customer: str) -> Path:
    text = invoice_page_text(invoice_no, "01/09/2026", customer)
    return _write_page(path, text)


def test_year_extraction_from_scan_folder():
    assert year_from_scan_folder("01-Sep-26") == 2026
    assert year_from_scan_folder("02-Oct-26") == 2026
    assert year_from_scan_folder("03-Jan-27") == 2027
    assert year_from_scan_folder("25 September") is None


def test_alias_reuses_existing_customer_folder(tmp_path):
    output_root = tmp_path / "Output"
    store = Store(output_root / "invoice_processor.db")
    store.seed(load_official_customers())
    skf = store.customer_by_name("SKF India Ltd.Pune")
    store.set_alias("SKF India Pvt Ltd", skf["customer_id"])
    store.close()

    input_root = tmp_path / "Input"
    _invoice(input_root / "01-Sep-26" / "Invoice" / "a.pdf", "20262500111", "SKF India Ltd.Pune")
    _invoice(input_root / "02-Sep-26" / "Invoice" / "b.pdf", "20262500222", "SKF India Pvt Ltd")

    results = process(input_root, output_root)
    copied = [row for row in results if row["status"] == "COPIED"]
    assert len(copied) == 2
    assert {row["customer_id"] for row in copied} == {skf["customer_id"]}
    customer_dir = output_root / "SKF India Ltd.Pune" / "2026"
    assert (customer_dir / "01-Sep-26" / "20262500111.pdf").exists()
    assert (customer_dir / "02-Sep-26" / "20262500222.pdf").exists()
    assert len([path for path in output_root.iterdir() if path.is_dir()]) == 1


def test_unknown_customer_does_not_create_a_folder(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    _invoice(
        input_root / "01-Sep-26" / "Invoice" / "new.pdf",
        "20262500333",
        "Zenith Quartz Private Limited",
    )
    results = process(input_root, output_root)
    assert results[0]["status"] == "REVIEW"
    assert results[0]["reason_code"] == "CUSTOMER_NOT_MATCHED"
    assert "Zenith" in results[0]["customer"]
    assert results[0]["customer_id"] == ""
    assert (output_root / "customer_ids.csv").is_file()
    assert list(output_root.rglob("*.pdf")) == []
    assert not (input_root / "01-Sep-26_done").exists()


def test_new_year_creates_only_the_missing_year_folder(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    _invoice(input_root / "01-Sep-26" / "Invoice" / "a.pdf", "20262500111", "PORITE INDIA PVT.LTD.")
    _invoice(input_root / "03-Jan-27" / "Invoice" / "b.pdf", "20272500111", "PORITE INDIA PVT.LTD.")
    process(input_root, output_root)
    customer = output_root / "Porite India Pvt. Ltd"
    assert (customer / "2026" / "01-Sep-26" / "20262500111.pdf").exists()
    assert (customer / "2027" / "03-Jan-27" / "20272500111.pdf").exists()
    assert {path.name for path in customer.iterdir()} == {"2026", "2027"}


def test_new_scan_date_reuses_customer_and_year(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    _invoice(input_root / "01-Sep-26" / "Invoice" / "a.pdf", "20262500111", "PORITE INDIA PVT.LTD.")
    process(input_root, output_root)
    _invoice(input_root / "02-Sep-26" / "Invoice" / "b.pdf", "20262500222", "PORITE INDIA PVT.LTD.")
    process(input_root, output_root)
    year = output_root / "Porite India Pvt. Ltd" / "2026"
    assert (year / "01-Sep-26" / "20262500111.pdf").exists()
    assert (year / "02-Sep-26" / "20262500222.pdf").exists()
    assert {path.name for path in year.iterdir()} == {"01-Sep-26", "02-Sep-26"}


def test_completed_subfolder_is_marked_done(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    day = input_root / "01-Sep-26"
    _invoice(day / "Invoice" / "1_2023" / "a.pdf", "20262500111", "PORITE INDIA PVT.LTD.")
    process(input_root, output_root)
    assert (day.parent / "01-Sep-26_done" / "Invoice" / "1_2023_done").is_dir()


def test_restart_skips_done_folders(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    _invoice(input_root / "01-Sep-26" / "Invoice" / "a.pdf", "20262500111", "PORITE INDIA PVT.LTD.")
    first = process(input_root, output_root)
    assert first[0]["status"] == "COPIED"
    dest = output_root / "Porite India Pvt. Ltd" / "2026" / "01-Sep-26" / "20262500111.pdf"
    size = dest.stat().st_size
    second = process(input_root, output_root)
    assert [row for row in second if row.get("status") == "COPIED"] == []
    assert dest.stat().st_size == size
    assert list(output_root.rglob("*.pdf")) == [dest]


def test_partial_failure_does_not_mark_folder_done(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    day = input_root / "01-Sep-26"
    _invoice(day / "Invoice" / "1_2023" / "a.pdf", "20262500111", "PORITE INDIA PVT.LTD.")
    _write_page(day / "Invoice" / "2_2019" / "bad.pdf", "DELIVERY CHALLAN\nNo invoice header here at all, just notes.")
    process(input_root, output_root)
    assert (day / "Invoice" / "1_2023_done").is_dir()
    assert (day / "Invoice" / "2_2019").is_dir()
    assert not (day / "Invoice" / "2_2019_done").exists()
    assert not (input_root / "01-Sep-26_done").exists()


def test_review_correction_does_not_rerun_ocr(tmp_path, monkeypatch):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    _invoice(
        input_root / "01-Sep-26" / "Invoice" / "new.pdf",
        "20262500444",
        "Zenith Quartz Private Limited",
    )
    results = process(input_root, output_root)
    assert results[0]["status"] == "REVIEW"
    document_id = results[0]["document_id"]

    store = Store(output_root / "invoice_processor.db")
    porite = store.customer_by_name("Porite India Pvt. Ltd.")
    store.close()

    csv_path = tmp_path / "corrections.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            "Document ID", "Correct Customer ID", "Correct Invoice Number", "Correct Year",
        ])
        writer.writeheader()
        writer.writerow({
            "Document ID": document_id,
            "Correct Customer ID": porite["customer_id"],
            "Correct Invoice Number": "20262500444",
            "Correct Year": "",
        })

    def _boom(*_args, **_kwargs):
        raise AssertionError("OCR ran during correction import")

    monkeypatch.setattr("core.pipeline.ocr_first_page", _boom)
    monkeypatch.setattr("core.pipeline.retry_ocr_first_page", _boom)
    corrected = import_corrections(csv_path, output_root)
    assert corrected[0]["status"] == "COPIED"
    assert (output_root / "Porite India Pvt. Ltd" / "2026" / "01-Sep-26" / "20262500444.pdf").exists()


def test_duplicate_destination_is_not_overwritten(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    folder = input_root / "01-Sep-26" / "Invoice"
    _invoice(folder / "a.pdf", "20262500111", "PORITE INDIA PVT.LTD.")
    _write_page(
        folder / "b.pdf",
        invoice_page_text("20262500111", "01/09/2026", "PORITE INDIA PVT.LTD.") + "\nSecond scan of the same number.\n",
    )
    results = process(input_root, output_root)
    by_name = {Path(row["source_file"]).name: row for row in results}
    assert by_name["a.pdf"]["status"] == "COPIED"
    assert by_name["b.pdf"]["status"] == "REVIEW"
    assert by_name["b.pdf"]["reason_code"] == "DUPLICATE_DESTINATION"
    dest = output_root / "Porite India Pvt. Ltd" / "2026" / "01-Sep-26"
    assert (dest / "20262500111.pdf").exists()
    assert not (dest / "20262500111__DUPLICATE.pdf").exists()
    assert not (input_root / "01-Sep-26_done").exists()


def test_supporting_pages_stay_in_the_copied_pdf(tmp_path, monkeypatch):
    from core.sorter import ocr_scanned_page
    from tests.pdf_fixtures import SAMPLE_INVOICES, write_text_pdf

    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    source = write_text_pdf(input_root / "01-Sep-26" / "Invoice" / "3344.pdf", invoices=[SAMPLE_INVOICES[0]])
    calls = []

    def tracked(page, scale=1.2):
        calls.append(page.number)
        return ocr_scanned_page(page, scale=scale)

    monkeypatch.setattr("core.sorter.ocr_scanned_page", tracked)
    process(input_root, output_root)
    assert calls == []  # embedded text is used; supporting pages are not rendered
    original = fitz.open(source if source.exists() else input_root / "01-Sep-26_done" / "Invoice" / "3344.pdf")
    copied = fitz.open(output_root / "Porite India Pvt. Ltd" / "2026" / "01-Sep-26" / "20242500788.pdf")
    assert original.page_count == copied.page_count == 3
    original.close()
    copied.close()


def test_three_days_share_one_customer_year(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    for day, number in (("01-Sep-26", "20262500111"), ("02-Sep-26", "20262500222"), ("03-Sep-26", "20262500333")):
        _invoice(input_root / day / "Invoice" / f"{number}.pdf", number, "PORITE INDIA PVT.LTD.")
    process(input_root, output_root)
    year = output_root / "Porite India Pvt. Ltd" / "2026"
    assert {path.name for path in (output_root / "Porite India Pvt. Ltd").iterdir()} == {"2026"}
    assert {path.name for path in year.iterdir()} == {"01-Sep-26", "02-Sep-26", "03-Sep-26"}
    for day, number in (("01-Sep-26", "20262500111"), ("02-Sep-26", "20262500222"), ("03-Sep-26", "20262500333")):
        assert (year / day / f"{number}.pdf").is_file()
