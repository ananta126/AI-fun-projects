"""Tests for invoice sorter v2.

The original sample (`3344.pdf`) was not uploaded with this run.
These tests reconstruct the documented layout from app.py / README:
  - scanned-style image PDFs
  - Invoice No. & Date : 20242500788 - 29/04/2024
  - billed-to customer PORITE INDIA PVT.LTD.
  - one PDF with invoice starts on pages 1, 4, 9 (13 pages total)
"""

from __future__ import annotations

import io
import shutil
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import (  # noqa: E402
    extract_customer_name,
    extract_invoice_number,
    find_invoice_starts,
    looks_like_invoice_page,
    ocr_pdf,
    parse_date_folder,
    process,
    process_invoice_file,
    process_uploaded_zip,
    split_invoice_packages,
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
    challan = (
        "Original For Consignee\n"
        "Total Invoice Value (In Word) Indian Rupees One Lakh\n"
        "Outward No: LL2-4Y invoice No,; ——__ |\n"
    )
    assert not looks_like_invoice_page(challan)
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


def test_split_packages_match_documented_page_ranges(tmp_path):
    pdf_path = write_text_pdf(tmp_path / "3344.pdf")
    page_texts = ocr_pdf(pdf_path)
    starts = find_invoice_starts(page_texts)
    assert starts == [0, 3, 8]
    assert len(page_texts) == 13

    packages = split_invoice_packages(pdf_path, starts)
    ranges = [(start, end) for start, end, _path in packages]
    assert ranges == [(0, 3), (3, 8), (8, 13)]

    for _, _, package_path in packages:
        if package_path.exists():
            package_path.unlink()


def test_process_text_pdf_into_customer_date_folders(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    invoice_dir = input_root / "25-Jun-26" / "Invoice"
    source = write_text_pdf(invoice_dir / "3344.pdf")

    results = process(input_root, output_root)

    copied = [r for r in results if r["status"] == "COPIED"]
    assert [r["invoice_number"] for r in copied] == [
        "20242500788",
        "20242500752",
        "20242500686",
    ]
    assert all(r["customer"] == "PORITE INDIA PVT.LTD" for r in copied)
    assert all(r["source_pages"] for r in copied)

    # Windows folders cannot end with a period, so safe_name strips it.
    customer_dir = output_root / "PORITE INDIA PVT.LTD" / "25-Jun-26"
    for invoice in SAMPLE_INVOICES:
        dest = customer_dir / f"{invoice['invoice_no']}.pdf"
        assert dest.exists(), dest
        assert dest.stat().st_size > 0

    # Source file is copied, not moved.
    assert source.exists()


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
    assert "No GST invoice page detected" in results[0]["reason"]


def test_missing_invoice_folder_is_skipped(tmp_path):
    input_root = tmp_path / "Input"
    (input_root / "25-Jun-26" / "PIS").mkdir(parents=True)
    results = process(input_root, tmp_path / "Output")
    assert results[0]["status"] == "SKIPPED"


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


def _ocr_available() -> bool:
    try:
        import rapidocr  # noqa: F401
        return True
    except ImportError:
        return False


def test_retry_ocr_skips_pages_that_already_have_embedded_text(tmp_path, monkeypatch):
    from app import retry_ocr_without_invoice_starts

    pdf_path = write_text_pdf(tmp_path / "3344.pdf")
    page_texts = [
        (page_no, "DELIVERY CHALLAN\nGoods received. Extra padding so this is long enough.")
        for page_no in range(13)
    ]

    def fail_ocr(_image):
        raise AssertionError("embedded-text pages should not be re-OCR'd")

    monkeypatch.setattr("app.ocr_image_rapid", fail_ocr)
    monkeypatch.setattr("app.ocr_image_paddle", fail_ocr)
    updated = retry_ocr_without_invoice_starts(pdf_path, page_texts)
    assert updated == page_texts


@pytest.mark.skipif(not _ocr_available(), reason="PaddleOCR/RapidOCR is not installed")
def test_ocr_scanned_pdf_extracts_sample_invoices(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    invoice_dir = input_root / "25-Jun-26" / "Invoice"
    write_scanned_pdf(invoice_dir / "3344.pdf")

    results = process(input_root, output_root)
    copied = [r for r in results if r["status"] == "COPIED"]
    assert [r["invoice_number"] for r in copied] == [
        "20242500788",
        "20242500752",
        "20242500686",
    ]
    assert all(r["customer"] == "PORITE INDIA PVT.LTD" for r in copied)


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
    customer = output_root / "PORITE INDIA PVT.LTD"
    assert (customer / "25-Jun-26" / "20242500788.pdf").exists()
    assert (customer / "30-Jun-26" / "20242500752.pdf").exists()


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

    results, out_bytes = process_uploaded_zip(
        src_zip.read_bytes(),
        "June 26.zip",
        tmp_path / "work",
    )
    copied = [r for r in results if r["status"] == "COPIED"]
    assert copied[0]["invoice_number"] == "20242500788"

    listing = zipfile.ZipFile(io.BytesIO(out_bytes)).namelist()
    assert any(name.endswith("20242500788.pdf") for name in listing)
    assert any("PORITE INDIA PVT.LTD" in name for name in listing)

