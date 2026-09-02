"""Tests for invoice sorter v2 first-page-only processing."""

from __future__ import annotations

import io
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import (  # noqa: E402
    extract_customer_name,
    extract_invoice_number,
    looks_like_invoice_page,
    ocr_pdf,
    parse_date_folder,
    process,
    process_invoice_file,
    process_uploaded_zip,
    retry_ocr_without_invoice_starts,
    zip_output_tree,
)
from tests.pdf_fixtures import SAMPLE_INVOICES, write_scanned_pdf, write_text_pdf  # noqa: E402


SAMPLE_PAGE = (
    "TAX INVOICE\n"
    "Invoice No. & Date : 20242500788 - 29/04/2024\n"
    "Details Of Recipient :(Billed to)\n"
    "PORITE INDIA PVT.LTD.,\n"
)


def test_extract_invoice_number_strips_printed_date():
    assert extract_invoice_number(SAMPLE_PAGE) == "20242500788"


def test_extract_customer_prefers_billed_to_recipient():
    assert extract_customer_name(SAMPLE_PAGE) == "PORITE INDIA PVT.LTD."


def test_looks_like_invoice_page():
    assert looks_like_invoice_page(SAMPLE_PAGE)
    assert not looks_like_invoice_page("DELIVERY CHALLAN\nGoods received")
    rapidocr_noisy = (
        "FILE COPY FORM GST INV - 1 INVOICE\n"
        "InvoiceNo.&Date:20242500788-29/04/2024\n"
        "PORITEINDIA PVT.LTD.\n"
    )
    assert looks_like_invoice_page(rapidocr_noisy)
    assert extract_invoice_number(rapidocr_noisy) == "20242500788"


def test_parse_date_folder():
    assert parse_date_folder("25-Jun-26").isoformat() == "2026-06-25"
    assert parse_date_folder("Invoice") is None


def test_ocr_pdf_reads_only_first_page(tmp_path):
    pdf_path = write_text_pdf(tmp_path / "3344.pdf", invoices=[SAMPLE_INVOICES[0]])
    page_texts = ocr_pdf(pdf_path)
    assert page_texts == [(0, SAMPLE_PAGE + "GSTIN : 27AABCP1234A1Z5")]


def test_process_one_pdf_as_one_complete_invoice_package(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    invoice_dir = input_root / "25-Jun-26" / "Invoice"
    source = write_text_pdf(invoice_dir / "3344.pdf", invoices=[SAMPLE_INVOICES[0]])

    results = process(input_root, output_root)
    copied = [r for r in results if r["status"] == "COPIED"]

    assert len(copied) == 1
    assert copied[0]["invoice_number"] == "20242500788"
    assert copied[0]["customer"] == "PORITE INDIA PVT.LTD"
    assert copied[0]["source_pages"] == "1-3"

    destination = output_root / "PORITE INDIA PVT.LTD" / "25-Jun-26" / "20242500788.pdf"
    assert destination.exists()
    assert destination.stat().st_size == source.stat().st_size
    assert source.exists()


def test_process_does_not_scan_supporting_pages(tmp_path, monkeypatch):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    source = write_scanned_pdf(
        input_root / "25-Jun-26" / "Invoice" / "3344.pdf",
        invoices=[SAMPLE_INVOICES[0]],
    )

    calls = []
    original = __import__("app").ocr_scanned_page

    def tracked(page, scale=1.2):
        calls.append(page.number)
        return original(page, scale=scale)

    monkeypatch.setattr("app.ocr_scanned_page", tracked)
    process_invoice_file(source, input_root, output_root)
    assert calls == [0]


def test_missing_invoice_page_is_review(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    pdf_path = input_root / "25-Jun-26" / "Invoice" / "notes.pdf"
    pdf_path.parent.mkdir(parents=True)
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "DELIVERY CHALLAN\nNo invoice header here.")
    doc.save(pdf_path)
    doc.close()

    results = process_invoice_file(pdf_path, input_root, output_root)
    assert results[0]["status"] == "REVIEW"
    assert "page 1" in results[0]["reason"]


def test_missing_invoice_folder_is_skipped(tmp_path):
    input_root = tmp_path / "Input"
    (input_root / "25-Jun-26" / "PIS").mkdir(parents=True)
    results = process(input_root, tmp_path / "Output")
    assert results[0]["status"] == "SKIPPED"


def test_retry_ocr_only_retries_first_page(tmp_path, monkeypatch):
    from PIL import Image
    from app import retry_ocr_first_page

    pdf_path = write_scanned_pdf(tmp_path / "3344.pdf", invoices=[SAMPLE_INVOICES[0]])
    calls = []

    def only_first_page(page, scale=1.7, fraction=0.55):
        calls.append(page.number)
        return Image.new("RGB", (10, 10), "white")

    monkeypatch.setattr("app.render_page_band", only_first_page)
    monkeypatch.setattr("app.ocr_image_rapid", lambda _image: SAMPLE_PAGE)
    retry_ocr_first_page(pdf_path, "")
    assert calls == [0]


def test_retry_wrapper_returns_only_first_page(tmp_path, monkeypatch):
    pdf_path = write_text_pdf(tmp_path / "3344.pdf", invoices=[SAMPLE_INVOICES[0]])

    monkeypatch.setattr("app.retry_ocr_first_page", lambda _path, text: text + " retry")
    updated = retry_ocr_without_invoice_starts(pdf_path, [(0, "old"), (1, "must not be returned")])
    assert updated == [(0, "old retry")]


def test_duplicate_destination_is_not_overwritten(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    invoice_dir = input_root / "25-Jun-26" / "Invoice"
    write_text_pdf(invoice_dir / "3344.pdf", invoices=[SAMPLE_INVOICES[0]])

    first = process(input_root, output_root)
    second = process(input_root, output_root)

    assert first[0]["status"] == "COPIED"
    assert second[0]["status"] == "COPIED"
    dest_dir = output_root / "PORITE INDIA PVT.LTD" / "25-Jun-26"
    assert (dest_dir / "20242500788.pdf").exists()
    assert (dest_dir / "20242500788__DUPLICATE.pdf").exists()


def test_nested_june_folder_creates_customer_then_day(tmp_path):
    input_root = tmp_path / "June 26"
    output_root = tmp_path / "Output"
    write_text_pdf(
        input_root / "25-Jun-26" / "Invoice" / "3344.pdf",
        invoices=[SAMPLE_INVOICES[0]],
    )
    write_text_pdf(
        input_root / "26-Jun-26" / "Invoice" / "other.pdf",
        invoices=[SAMPLE_INVOICES[2]],
    )
    (input_root / "27-Jun-26" / "PIS").mkdir(parents=True)

    results = process(input_root, output_root)
    copied = [r for r in results if r["status"] == "COPIED"]
    skipped = [r for r in results if r["status"] == "SKIPPED"]

    assert {(r["invoice_number"], r["date_folder"]) for r in copied} == {
        ("20242500788", "25-Jun-26"),
        ("20242500686", "26-Jun-26"),
    }
    assert skipped[0]["date_folder"] == "27-Jun-26"
    assert (output_root / "PORITE INDIA PVT.LTD" / "25-Jun-26" / "20242500788.pdf").exists()
    assert (output_root / "PORITE INDIA PVT.LTD" / "26-Jun-26" / "20242500686.pdf").exists()


def test_zip_input_extracts_then_sorts_by_customer_and_day(tmp_path):
    import zipfile

    bundle = tmp_path / "bundle"
    write_text_pdf(
        bundle / "June 26" / "25-Jun-26" / "Invoice" / "3344.pdf",
        invoices=[SAMPLE_INVOICES[0]],
    )
    write_text_pdf(
        bundle / "June 26" / "30-Jun-26" / "Invoice" / "later.pdf",
        invoices=[SAMPLE_INVOICES[1]],
    )
    zip_path = tmp_path / "June 26-20260831T053601Z-001.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        for file in bundle.rglob("*.pdf"):
            zf.write(file, file.relative_to(bundle))

    output_root = tmp_path / "Output"
    results = process(zip_path, output_root)
    copied = [r for r in results if r["status"] == "COPIED"]
    assert {(r["invoice_number"], r["date_folder"]) for r in copied} == {
        ("20242500788", "25-Jun-26"),
        ("20242500752", "30-Jun-26"),
    }


def test_uploaded_zip_returns_downloadable_customer_archive(tmp_path):
    import zipfile

    bundle = tmp_path / "bundle"
    write_text_pdf(
        bundle / "June 26" / "25-Jun-26" / "Invoice" / "3344.pdf",
        invoices=[SAMPLE_INVOICES[0]],
    )
    src_zip = tmp_path / "month.zip"
    with zipfile.ZipFile(src_zip, "w") as zf:
        for file in bundle.rglob("*.pdf"):
            zf.write(file, file.relative_to(bundle))

    results, out_bytes = process_uploaded_zip(src_zip.read_bytes(), "June 26.zip", tmp_path / "work")
    copied = [r for r in results if r["status"] == "COPIED"]
    assert copied[0]["invoice_number"] == "20242500788"

    listing = zipfile.ZipFile(io.BytesIO(out_bytes)).namelist()
    assert any(name.endswith("20242500788.pdf") for name in listing)
    assert any("PORITE INDIA PVT.LTD" in name for name in listing)


def test_zip_output_tree_empty(tmp_path):
    assert zip_output_tree(tmp_path) is not None


def _ocr_available() -> bool:
    try:
        import rapidocr  # noqa: F401
        return True
    except ImportError:
        return False


@pytest.mark.skipif(not _ocr_available(), reason="RapidOCR is not installed")
def test_ocr_scanned_pdf_reads_only_first_page(tmp_path):
    pdf_path = write_scanned_pdf(tmp_path / "3344.pdf", invoices=[SAMPLE_INVOICES[0]])
    page_texts = ocr_pdf(pdf_path)
    assert len(page_texts) == 1
    assert page_texts[0][0] == 0
    assert extract_invoice_number(page_texts[0][1]) == "20242500788"
