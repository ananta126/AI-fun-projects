"""Tests for invoice sorter v2 first-page-only processing."""

from __future__ import annotations

import io
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core.sorter import (  # noqa: E402
    OcrLine,
    billed_to_region,
    customer_from_lines,
    extract_customer_name,
    extract_invoice_date,
    extract_invoice_number,
    extract_invoice_number_from_lines,
    looks_like_invoice_page,
    ocr_pdf,
    parse_date_folder,
    process,
    process_invoice_file,
    process_uploaded_zip,
    resolve_invoice_number,
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
    assert extract_invoice_date(SAMPLE_PAGE).year == 2024
    assert extract_invoice_date(SAMPLE_PAGE).isoformat() == "2024-04-29"


def test_extract_invoice_number_skips_pan_on_same_header_row():
    page = (
        "FORM GST INV - 1 INVOICE\n"
        "HIGHTEMP FURNACES LTD.\n"
        "CIN : U28991PN1983PLC013045  "
        "PANNo. : AAACH1727L  "
        "Invoice No. & Date : AAACH1727L - 11/04/2023\n"
        "GSTIN No. & GST Range : 27AAACH1727L1ZK - CNWD1\n"
        "20232400230 - 11/04/2023\n"
        "Details Of Recipient :(Billed to)\n"
        "RAPID MACHINING TECHNOLOGIES PVT LTD (KOLHAPUR)\n"
    )
    assert extract_invoice_number(page) == "20232400230"
    assert extract_invoice_number(page) != "AAACH1727L"
    assert extract_invoice_date(page).isoformat() == "2023-04-11"


def test_extract_customer_prefers_billed_to_recipient():
    assert extract_customer_name(SAMPLE_PAGE) == "Porite India Pvt. Ltd."


def test_extract_customer_skips_street_number_182():
    page = (
        "FORM GST INV - 1 INVOICE\n"
        "HIGHTEMP FURNACES LTD.\n"
        "Invoice No. & Date : 20222306356 - 11/12/2022\n"
        "Details Of Recipient :(Billed to)\n"
        "182, SHIROLI MIDC KOLHAPUR, KOLHAPUR, MAHARASHTRA, INDIA.\n"
        "RAPID MACHINING TECHNOLOGIES PVT LTD (KOLHAPUR)\n"
        "GSTIN/Unique ID : 27AAACR8959A1Z9\n"
        "Consignee (Shipped to) :\n"
        "182, SHIROLI MIDC KOLHAPUR\n"
    )
    assert extract_customer_name(page) == "Rapid Machining Tech.Pvt.Ltd."
    assert extract_customer_name(page) != "182"


def test_same_customer_collapses_kolhapur_folder_variants():
    expected = "Rapid Machining Tech.Pvt.Ltd."
    variants = [
        "RAPID MACHINING TECHNOLOGIES PVT LTD",
        "RAPID MACHINING TECHNOLOGIES PVT LTD (KOLHAPUR)",
        "RAPID MACHINING TECHNOLOGIES PVT LTD (KOLHAPUR], RAPID MACHINING TECHNOLOGIES PVT LTD (KOLHAPUR)",
    ]
    assert [extract_customer_name("Details Of Recipient :(Billed to)\n" + name) for name in variants] == [expected] * 3
    glued = (
        "Details Of Recipient :(Billed to)\n"
        "RAPID MACHINING TECHNOLOGIES PVT LTD (KOLHAPUR], "
        "RAPID MACHINING TECHNOLOGIES PVT LTD (KOLHAPUR)\n"
    )
    assert extract_customer_name(glued) == expected


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
    invoice_dir = input_root / "25-Jun-26" / "Invoice" / "01_2026"
    source = write_text_pdf(invoice_dir / "3344.pdf", invoices=[SAMPLE_INVOICES[0]])

    results = process(input_root, output_root)
    copied = [r for r in results if r["status"] == "COPIED"]

    assert len(copied) == 1
    assert copied[0]["invoice_number"] == "20242500788"
    assert copied[0]["customer"] == "Porite India Pvt. Ltd"
    assert copied[0]["source_pages"] == "1-3"

    destination = output_root / "Porite India Pvt. Ltd" / "2026" / "20242500788.pdf"
    done_source = input_root / "25-Jun-26_done" / "Invoice" / "01_2026_done" / "3344.pdf"
    assert destination.exists()
    assert done_source.exists()
    assert destination.stat().st_size == done_source.stat().st_size
    assert not source.exists()


def test_process_does_not_scan_supporting_pages(tmp_path, monkeypatch):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    source = write_scanned_pdf(
        input_root / "25-Jun-26" / "Invoice" / "01_2026" / "3344.pdf",
        invoices=[SAMPLE_INVOICES[0]],
    )

    calls = []
    original = __import__("core.sorter", fromlist=["ocr_scanned_page"]).ocr_scanned_page

    def tracked(page, scale=1.2):
        calls.append(page.number)
        return original(page, scale=scale)

    monkeypatch.setattr("core.sorter.ocr_scanned_page", tracked)
    process_invoice_file(source, input_root, output_root)
    assert calls == [0]


def test_missing_invoice_page_is_review(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    pdf_path = input_root / "25-Jun-26" / "Invoice" / "01_2026" / "notes.pdf"
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


def test_exception_excel_lists_unreadable_and_skipped(tmp_path):
    from openpyxl import load_workbook

    from core.sorter import EXCEPTION_REPORT_NAME

    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    write_text_pdf(
        input_root / "25-Jun-26" / "Invoice" / "01_2026" / "3344.pdf",
        invoices=[SAMPLE_INVOICES[0]],
    )
    import fitz

    bad = input_root / "26-Jun-26" / "Invoice" / "01_2026" / "notes.pdf"
    bad.parent.mkdir(parents=True)
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "DELIVERY CHALLAN\nNo invoice header here.")
    doc.save(bad)
    doc.close()
    (input_root / "27-Jun-26" / "PIS").mkdir(parents=True)

    results = process(input_root, output_root)
    report = output_root / EXCEPTION_REPORT_NAME
    assert report.exists()
    wb = load_workbook(report)
    assert {ws.title for ws in wb.worksheets} >= {"Summary", "Could_not_read", "Skipped"}
    unread = [row[1].value for row in wb["Could_not_read"].iter_rows(min_row=2) if row[0].value]
    skipped = [row[2].value for row in wb["Skipped"].iter_rows(min_row=2) if row[0].value]
    assert any(name and "notes.pdf" in str(name) for name in unread)
    assert "27-Jun-26" in skipped
    copied = [r for r in results if r["status"] == "COPIED"]
    assert copied


def test_retry_ocr_only_retries_first_page(tmp_path, monkeypatch):
    from PIL import Image
    from core.sorter import retry_ocr_first_page

    pdf_path = write_scanned_pdf(tmp_path / "3344.pdf", invoices=[SAMPLE_INVOICES[0]])
    calls = []

    def only_first_page(page, scale=1.7, fraction=0.55):
        calls.append(page.number)
        return Image.new("RGB", (10, 10), "white")

    monkeypatch.setattr("core.sorter.render_page_band", only_first_page)
    monkeypatch.setattr("core.sorter.ocr_image_rapid", lambda _image: SAMPLE_PAGE)
    retry_ocr_first_page(pdf_path, "")
    assert calls == [0]


def test_retry_wrapper_returns_only_first_page(tmp_path, monkeypatch):
    pdf_path = write_text_pdf(tmp_path / "3344.pdf", invoices=[SAMPLE_INVOICES[0]])

    monkeypatch.setattr("core.sorter.retry_ocr_first_page", lambda _path, text: text + " retry")
    updated = retry_ocr_without_invoice_starts(pdf_path, [(0, "old"), (1, "must not be returned")])
    assert updated == [(0, "old retry")]


def test_duplicate_destination_is_not_overwritten(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    invoice_dir = input_root / "25-Jun-26" / "Invoice" / "01_2026"
    write_text_pdf(invoice_dir / "3344.pdf", invoices=[SAMPLE_INVOICES[0]])
    import fitz

    other = invoice_dir / "3345.pdf"
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), SAMPLE_PAGE + "GSTIN : 27AABCP1234A1Z5\nExtra line so this file is not the same bytes.\n")
    doc.save(other)
    doc.close()

    first = process(input_root, output_root)
    # Run again only if the day was not marked _done. Two files share one invoice number,
    # so the day stays open and the second file must not overwrite the first.
    second_file_results = [row for row in first if row["source_file"].endswith("3345.pdf")]
    first_file_results = [row for row in first if row["source_file"].endswith("3344.pdf")]
    first = first_file_results
    second = second_file_results

    assert first[0]["status"] == "COPIED"
    assert second[0]["status"] == "REVIEW"
    assert second[0]["reason_code"] == "DUPLICATE_DESTINATION"
    dest_dir = output_root / "Porite India Pvt. Ltd" / "2026"
    assert (dest_dir / "20242500788.pdf").exists()
    assert not (dest_dir / "20242500788__DUPLICATE.pdf").exists()
    assert not (input_root / "25-Jun-26_done").exists()


def test_nested_june_folder_creates_customer_then_day(tmp_path):
    input_root = tmp_path / "June 26"
    output_root = tmp_path / "Output"
    write_text_pdf(
        input_root / "25-Jun-26" / "Invoice" / "01_2026" / "3344.pdf",
        invoices=[SAMPLE_INVOICES[0]],
    )
    write_text_pdf(
        input_root / "26-Jun-26" / "Invoice" / "01_2026" / "other.pdf",
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
    assert (output_root / "Porite India Pvt. Ltd" / "2026" / "20242500788.pdf").exists()
    assert (output_root / "Porite India Pvt. Ltd" / "2026" / "20242500686.pdf").exists()
    assert (input_root / "25-Jun-26_done").is_dir()
    assert (input_root / "27-Jun-26" / "PIS").is_dir()
    assert not (input_root / "27-Jun-26_done").exists()


def test_zip_input_extracts_then_sorts_by_customer_and_day(tmp_path):
    import zipfile

    bundle = tmp_path / "bundle"
    write_text_pdf(
        bundle / "June 26" / "25-Jun-26" / "Invoice" / "01_2026" / "3344.pdf",
        invoices=[SAMPLE_INVOICES[0]],
    )
    write_text_pdf(
        bundle / "June 26" / "30-Jun-26" / "Invoice" / "01_2026" / "later.pdf",
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


def test_two_inner_units_under_same_day(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    write_text_pdf(
        input_root / "25-Jun-26" / "Invoice" / "1_2024" / "a.pdf",
        invoices=[SAMPLE_INVOICES[0]],
    )
    write_text_pdf(
        input_root / "25-Jun-26" / "Invoice" / "2_2023" / "b.pdf",
        invoices=[SAMPLE_INVOICES[1]],
    )
    results = process(input_root, output_root)
    copied = [r for r in results if r["status"] == "COPIED"]
    assert {(r["invoice_number"], r["date_folder"]) for r in copied} == {
        ("20242500788", "25-Jun-26"),
        ("20242500752", "25-Jun-26"),
    }
    assert (output_root / "Porite India Pvt. Ltd" / "2024" / "20242500788.pdf").exists()
    assert (output_root / "Porite India Pvt. Ltd" / "2023" / "20242500752.pdf").exists()


def test_zip_reextract_when_archive_updated(tmp_path):
    import os
    import time
    import zipfile

    bundle = tmp_path / "bundle"
    day = bundle / "25-Jun-26" / "Invoice"
    write_text_pdf(day / "2_2023" / "b.pdf", invoices=[SAMPLE_INVOICES[1]])
    zip_path = tmp_path / "25-Jun-26.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        for file in bundle.rglob("*.pdf"):
            zf.write(file, file.relative_to(bundle))

    output_root = tmp_path / "Output"
    first = process(zip_path, output_root)
    assert len([r for r in first if r["status"] == "COPIED"]) == 1
    extract = tmp_path / "25-Jun-26_extracted"
    assert (extract / ".invoice_sorter_zip_source").is_file()
    assert not (extract / "25-Jun-26" / "Invoice" / "1_2024").exists()

    write_text_pdf(day / "1_2024" / "a.pdf", invoices=[SAMPLE_INVOICES[0]])
    with zipfile.ZipFile(zip_path, "w") as zf:
        for file in bundle.rglob("*.pdf"):
            zf.write(file, file.relative_to(bundle))
    time.sleep(0.05)
    os.utime(zip_path, (time.time(), time.time()))

    from core.sorter import resolve_input

    resolve_input(zip_path)
    assert (extract / "25-Jun-26" / "Invoice" / "1_2024" / "a.pdf").is_file()

    process(zip_path, output_root)
    base = output_root / "Porite India Pvt. Ltd"
    assert (base / "2024" / "20242500788.pdf").exists()
    assert (base / "2023" / "20242500752.pdf").exists()


def test_uploaded_zip_returns_downloadable_customer_archive(tmp_path):
    import zipfile

    bundle = tmp_path / "bundle"
    write_text_pdf(
        bundle / "June 26" / "25-Jun-26" / "Invoice" / "01_2026" / "3344.pdf",
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
    assert any("Porite India Pvt. Ltd" in name and "/2026/" in name.replace("\\", "/") for name in listing)


def test_zip_output_tree_empty(tmp_path):
    assert zip_output_tree(tmp_path) is not None


def _ocr_available() -> bool:
    try:
        import rapidocr  # noqa: F401
        return True
    except ImportError:
        return False


def test_output_year_comes_from_invoice_unit_not_printed_date(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    write_text_pdf(
        input_root / "01-Sep-26" / "Invoice" / "01_2026" / "3344.pdf",
        invoices=[SAMPLE_INVOICES[0]],
    )

    results = process(input_root, output_root)
    copied = results[0]
    assert copied["status"] == "COPIED"
    assert copied["year"] == "2026"
    assert copied["date_folder"] == "01-Sep-26"
    destination = output_root / "Porite India Pvt. Ltd" / "2026" / "20242500788.pdf"
    assert destination.exists()
    assert not (output_root / "Porite India Pvt. Ltd" / "2024").exists()


def test_missing_printed_date_still_uses_invoice_unit_year(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    page = (
        "TAX INVOICE\n"
        "Invoice No. & Date : 20242500788\n"
        "Details Of Recipient :(Billed to)\n"
        "PORITE INDIA PVT.LTD.,\n"
        "GSTIN : 27AABCP1234A1Z5\n"
    )
    import fitz

    pdf_path = input_root / "25-Jun-26" / "Invoice" / "01_2026" / "nodate.pdf"
    pdf_path.parent.mkdir(parents=True)
    doc = fitz.open()
    fitz_page = doc.new_page()
    fitz_page.insert_text((72, 72), page)
    doc.save(pdf_path)
    doc.close()

    results = process_invoice_file(pdf_path, input_root, output_root)
    assert results[0]["status"] == "COPIED"
    assert results[0]["invoice_number"] == "20242500788"
    assert results[0]["year"] == "2026"
    assert (output_root / "Porite India Pvt. Ltd" / "2026" / "20242500788.pdf").exists()


@pytest.mark.skipif(not _ocr_available(), reason="RapidOCR is not installed")
def test_ocr_scanned_pdf_reads_only_first_page(tmp_path):
    pdf_path = write_scanned_pdf(tmp_path / "3344.pdf", invoices=[SAMPLE_INVOICES[0]])
    page_texts = ocr_pdf(pdf_path)
    assert len(page_texts) == 1
    assert page_texts[0][0] == 0
    assert extract_invoice_number(page_texts[0][1]) == "20242500788"


def _line(text: str, x0: float, y0: float, x1: float, y1: float) -> OcrLine:
    return OcrLine(text, (x0, y0, x1, y1), 0.9)


def _hightemp_page_lines(*, billed_y: float = 120) -> list[OcrLine]:
    """3874.pdf layout: seller letterhead above, customer under Billed to, consignee to the right."""
    return [
        _line("HIGHTEMP FURNACES LTD.", 40, 30, 280, 48),
        _line("Email: pune@hightempfurnaces.com", 40, 62, 280, 76),
        _line("GAT NO.615, VILLAGE IKURULI NEAR CHAKAN", 40, 78, 300, 92),
        _line("Phone No:02135-639450 PANNo. AAACH1727L", 40, 94, 360, 108),
        _line("GSTIN No. & GST Range : 27AAACH1727L1ZK", 400, 50, 700, 66),
        _line("Invoice No. & Date : 20232400469 - 18/04/2023", 400, 28, 760, 44),
        _line("Details Of Recipient (Billed to)", 40, billed_y, 280, billed_y + 16),
        _line("RAPID MACHINING TECHNOLOGIES PVT LTD (KOLHAPUR)", 40, billed_y + 22, 420, billed_y + 38),
        _line("182, SHIROLI MIDC KOLHAPUR, MAHARASHTRA, INDIA.", 40, billed_y + 40, 420, billed_y + 56),
        _line("Consignee(Shipped to):", 460, billed_y, 700, billed_y + 16),
        _line("OTHER CONSIGNEE PVT LTD", 460, billed_y + 22, 720, billed_y + 38),
        _line("GSTIN/Unique ID : 27AAACR8959A1Z9", 40, billed_y + 64, 360, billed_y + 80),
    ]


def _invoice_label_below_lines(invoice_no: str, *, label: str = "Invoice No.") -> list[OcrLine]:
    """01_2022-style layout: label and number on separate OCR lines."""
    return [
        _line("TAX INVOICE", 40, 10, 200, 26),
        _line(label, 400, 28, 520, 44),
        _line(invoice_no, 400, 48, 520, 64),
        _line("Details Of Recipient (Billed to)", 40, 120, 280, 136),
        _line("PORITE INDIA PVT.LTD.", 40, 142, 360, 158),
    ]


def test_spatial_invoice_number_below_label_212201807():
    lines = _invoice_label_below_lines("212201807")
    assert extract_invoice_number("Invoice No.") is None
    assert extract_invoice_number_from_lines(lines) == "212201807"
    assert resolve_invoice_number("Invoice No.", lines) == "212201807"


def test_spatial_invoice_number_below_label_212201802():
    lines = _invoice_label_below_lines("212201802", label="Invoice Number")
    assert extract_invoice_number_from_lines(lines) == "212201802"


def test_spatial_invoice_label_variants():
    for label in ("InvoiceNo.", "lnvoice No.", "Inv No :"):
        lines = _invoice_label_below_lines("212201807", label=label)
        assert extract_invoice_number_from_lines(lines) == "212201807"


def test_spatial_invoice_on_same_row_as_label():
    lines = [
        _line("Invoice No. 212201807", 400, 28, 620, 44),
    ]
    assert extract_invoice_number_from_lines(lines) == "212201807"


def test_3874_layout_uses_billed_to_not_letterhead():
    name = customer_from_lines(_hightemp_page_lines())
    assert name == "RAPID MACHINING TECHNOLOGIES PVT LTD"
    assert "HIGHTEMP" not in name
    assert "AAACH1727L" not in name
    assert "182" not in name
    header = "\n".join(line.text for line in _hightemp_page_lines())
    assert extract_invoice_number(header) == "20232400469"


def test_customer_on_same_line_as_billed_to():
    lines = [_line("Billed to PORITE INDIA PVT.LTD.", 40, 40, 400, 56)]
    assert customer_from_lines(lines) == "PORITE INDIA PVT.LTD"


def test_billed_to_label_tolerates_ocr_spelling():
    lines = [
        _line("HIGHTEMP FURNACES LTD.", 40, 20, 280, 36),
        _line("Detalls Of Recipent (Billed t0)", 40, 80, 300, 96),
        _line("RAPID MACHINING TECHNOLOGIES PVT LTD", 40, 104, 420, 120),
    ]
    assert customer_from_lines(lines) == "RAPID MACHINING TECHNOLOGIES PVT LTD"


def test_seller_at_top_is_not_the_customer():
    assert "HIGHTEMP" not in customer_from_lines(_hightemp_page_lines())


def test_address_after_customer_name_is_not_returned():
    name = billed_to_region(
        "Details Of Recipient (Billed to)\n"
        "RAPID MACHINING TECHNOLOGIES PVT LTD\n"
        "182, SHIROLI MIDC KOLHAPUR\n"
    )
    assert name == "RAPID MACHINING TECHNOLOGIES PVT LTD"
    assert not name.startswith("182")


def test_missing_billed_to_section_returns_nothing():
    lines = [
        _line("HIGHTEMP FURNACES LTD.", 40, 20, 280, 36),
        _line("RAPID MACHINING TECHNOLOGIES PVT LTD", 40, 80, 420, 96),
    ]
    assert customer_from_lines(lines) == ""


def test_billed_to_column_ignores_the_other_company():
    name = customer_from_lines(_hightemp_page_lines())
    assert name.startswith("RAPID MACHINING")
    assert "OTHER CONSIGNEE" not in name


def test_billed_to_section_can_sit_lower_on_the_page():
    name = customer_from_lines(_hightemp_page_lines(billed_y=240))
    assert name == "RAPID MACHINING TECHNOLOGIES PVT LTD"


def test_3874_pdf_page_one_customer_and_invoice_number():
    import fitz

    pdf_path = Path(__file__).resolve().parent / "fixtures" / "3874.pdf"
    assert pdf_path.is_file()
    doc = fitz.open(pdf_path)
    assert len(doc) == 4
    assert len(doc[0].get_text("text").strip()) < 40
    doc.close()
    if not _ocr_available():
        pytest.skip("RapidOCR is not installed")
    from core.sorter import ocr_first_page

    text, page_count, lines = ocr_first_page(pdf_path)
    assert page_count == 4
    assert extract_invoice_number(text) == "20232400469"
    customer = customer_from_lines(lines)
    assert customer == "RAPID MACHINING TECHNOLOGIES PVT LTD"
    assert "HIGHTEMP" not in customer
    assert "AAACH1727L" not in customer
