"""Incremental filing: source-folder year, aliases, review, and _done."""

from __future__ import annotations

import csv
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core.customer_master import load_customer_master  # noqa: E402
from core.db import Store  # noqa: E402
from core.matching import AliasRef, CustomerRef, match_customer, normalize_customer  # noqa: E402
from core.pipeline import import_corrections  # noqa: E402
from core.sorter import (  # noqa: E402
    load_official_customers,
    process,
    year_from_invoice_unit,
    year_from_scan_folder,
)
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


def _invoice_in_unit(
    input_root: Path,
    scan_day: str,
    unit_folder: str,
    filename: str,
    invoice_no: str,
    customer: str,
) -> Path:
    """Place a PDF under ``Invoice/<unit_folder>/`` (sequence_YEAR)."""
    return _invoice(
        input_root / scan_day / "Invoice" / unit_folder / filename,
        invoice_no,
        customer,
    )


def test_year_extraction_from_scan_folder():
    assert year_from_scan_folder("01-Sep-26") == 2026
    assert year_from_scan_folder("02-Oct-26") == 2026
    assert year_from_scan_folder("03-Jan-27") == 2027
    assert year_from_scan_folder("25 September") is None


def test_year_extraction_from_invoice_unit_folder():
    assert year_from_invoice_unit("01_2022") == 2022
    assert year_from_invoice_unit("02_2023") == 2023
    assert year_from_invoice_unit("03_2022") == 2022
    assert year_from_invoice_unit("abc") is None
    assert year_from_invoice_unit("1_23") is None


def test_output_year_from_invoice_unit_not_scan_date(tmp_path):
    """TEST 1–3: filing year from 01_2022, 02_2023, 03_2024 (not scan-date 2026)."""
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    customer = "PORITE INDIA PVT.LTD."
    _invoice_in_unit(input_root, "01-Sep-26", "01_2022", "t1.pdf", "20222500111", customer)
    _invoice_in_unit(input_root, "01-Sep-26", "02_2023", "t2.pdf", "20232500111", customer)
    _invoice_in_unit(input_root, "01-Sep-26", "03_2024", "t3.pdf", "20242500112", customer)
    _invoice(
        input_root / "01-Jan-27" / "Invoice" / "03_2022" / "t4.pdf",
        "20222500112",
        customer,
    )
    results = process(input_root, output_root)
    copied = {Path(row["source_file"]).parent.name: row for row in results if row["status"] == "COPIED"}
    assert copied["01_2022"]["year"] == "2022"
    assert copied["02_2023"]["year"] == "2023"
    assert copied["03_2024"]["year"] == "2024"
    assert copied["03_2022"]["year"] == "2022"
    base = output_root / "Porite India Pvt. Ltd"
    assert (base / "2022" / "20222500111.pdf").exists()
    assert (base / "2022" / "20222500112.pdf").exists()
    assert (base / "2023" / "20232500111.pdf").exists()
    assert (base / "2024" / "20242500112.pdf").exists()
    assert not (base / "2026").exists()
    assert not (base / "2027").exists()


def test_direct_pdf_under_invoice_year_not_detected(tmp_path):
    """TEST 4: PDF directly under Invoice/ → INVOICE_YEAR_NOT_DETECTED."""
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    _invoice(
        input_root / "01-Sep-26" / "Invoice" / "invoice.pdf",
        "20262500999",
        "PORITE INDIA PVT.LTD.",
    )
    results = process(input_root, output_root)
    assert len(results) == 1
    assert results[0]["status"] == "REVIEW"
    assert results[0]["reason_code"] == "INVOICE_YEAR_NOT_DETECTED"
    assert list(output_root.rglob("*.pdf")) == []


def test_invalid_invoice_unit_folder_names_review(tmp_path):
    """TEST 5–6: 01-2022 and 2022 unit folders → INVOICE_YEAR_NOT_DETECTED."""
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    customer = "PORITE INDIA PVT.LTD."
    _invoice(
        input_root / "01-Sep-26" / "Invoice" / "01-2022" / "a.pdf",
        "20262500101",
        customer,
    )
    _invoice(
        input_root / "01-Sep-26" / "Invoice" / "2022" / "b.pdf",
        "20262500102",
        customer,
    )
    results = process(input_root, output_root)
    assert len(results) == 2
    assert {row["reason_code"] for row in results} == {"INVOICE_YEAR_NOT_DETECTED"}
    assert list(output_root.rglob("*.pdf")) == []


def test_invalid_invoice_unit_folder_year_review(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    _invoice(
        input_root / "04-Aug-26" / "Invoice" / "abc" / "bad.pdf",
        "20262500999",
        "PORITE INDIA PVT.LTD.",
    )
    results = process(input_root, output_root)
    assert len(results) == 1
    assert results[0]["status"] == "REVIEW"
    assert results[0]["reason_code"] == "INVOICE_YEAR_NOT_DETECTED"
    assert list(output_root.rglob("*.pdf")) == []


def test_alias_reuses_existing_customer_folder(tmp_path):
    output_root = tmp_path / "Output"
    store = Store(output_root / "invoice_processor.db")
    store.seed(load_official_customers())
    skf = store.customer_by_name("SKF India Ltd.Pune")
    store.set_alias("SKF India Pvt Ltd", skf["customer_id"])
    store.close()

    input_root = tmp_path / "Input"
    _invoice_in_unit(input_root, "01-Sep-26", "01_2026", "a.pdf", "20262500111", "SKF India Ltd.Pune")
    _invoice_in_unit(input_root, "02-Sep-26", "01_2026", "b.pdf", "20262500222", "SKF India Pvt Ltd")

    results = process(input_root, output_root)
    copied = [row for row in results if row["status"] == "COPIED"]
    assert len(copied) == 2
    assert {row["customer_id"] for row in copied} == {skf["customer_id"]}
    customer_dir = output_root / "SKF India Ltd.Pune" / "2026"
    assert (customer_dir / "20262500111.pdf").exists()
    assert (customer_dir / "20262500222.pdf").exists()
    assert len([path for path in output_root.iterdir() if path.is_dir()]) == 1


def test_unknown_customer_does_not_create_a_folder(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    _invoice_in_unit(
        input_root,
        "01-Sep-26",
        "01_2026",
        "new.pdf",
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
    _invoice_in_unit(input_root, "01-Sep-26", "01_2026", "a.pdf", "20262500111", "PORITE INDIA PVT.LTD.")
    _invoice_in_unit(input_root, "03-Jan-27", "01_2027", "b.pdf", "20272500111", "PORITE INDIA PVT.LTD.")
    process(input_root, output_root)
    customer = output_root / "Porite India Pvt. Ltd"
    assert (customer / "2026" / "20262500111.pdf").exists()
    assert (customer / "2027" / "20272500111.pdf").exists()
    assert {path.name for path in customer.iterdir()} == {"2026", "2027"}


def test_new_scan_date_reuses_customer_and_year(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    _invoice_in_unit(input_root, "01-Sep-26", "01_2026", "a.pdf", "20262500111", "PORITE INDIA PVT.LTD.")
    process(input_root, output_root)
    _invoice_in_unit(input_root, "02-Sep-26", "01_2026", "b.pdf", "20262500222", "PORITE INDIA PVT.LTD.")
    process(input_root, output_root)
    year = output_root / "Porite India Pvt. Ltd" / "2026"
    assert (year / "20262500111.pdf").exists()
    assert (year / "20262500222.pdf").exists()
    assert {path.name for path in year.iterdir()} == {"20262500111.pdf", "20262500222.pdf"}


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
    _invoice(input_root / "01-Sep-26" / "Invoice" / "01_2026" / "a.pdf", "20262500111", "PORITE INDIA PVT.LTD.")
    first = process(input_root, output_root)
    assert first[0]["status"] == "COPIED"
    dest = output_root / "Porite India Pvt. Ltd" / "2026" / "20262500111.pdf"
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
    _invoice_in_unit(
        input_root,
        "01-Sep-26",
        "01_2026",
        "new.pdf",
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
    monkeypatch.setattr("core.pipeline.retry_first_page_read", _boom)
    corrected = import_corrections(csv_path, output_root)
    assert corrected[0]["status"] == "COPIED"
    assert (output_root / "Porite India Pvt. Ltd" / "2026" / "20262500444.pdf").exists()


def test_gkn_reuses_customer_folder_and_adds_year(tmp_path):
    """TEST 7–8: reuse GKN driveline Pune / 2022; add 2023 subfolder on a later run."""
    output_root = tmp_path / "Output"
    store = Store(output_root / "invoice_processor.db")
    store.seed(load_official_customers())
    gkn = store.customer_by_id("C037")
    store.set_alias("GKN DRIVELINE INDIA LIMITED", gkn["customer_id"])
    store.close()

    input_root = tmp_path / "Input"
    ocr_name = "GKN DRIVELINE INDIA LIMITED"
    _invoice_in_unit(input_root, "01-Sep-26", "01_2022", "a.pdf", "20222500001", ocr_name)
    process(input_root, output_root)
    gkn_root = output_root / "GKN driveline Pune"
    assert (gkn_root / "2022" / "20222500001.pdf").exists()
    assert {path.name for path in gkn_root.iterdir()} == {"2022"}

    _invoice_in_unit(input_root, "02-Sep-26", "01_2023", "b.pdf", "20232500002", ocr_name)
    process(input_root, output_root)
    assert (gkn_root / "2022" / "20222500001.pdf").exists()
    assert (gkn_root / "2023" / "20232500002.pdf").exists()
    assert {path.name for path in gkn_root.iterdir()} == {"2022", "2023"}
    assert len([path for path in output_root.iterdir() if path.is_dir()]) == 1


def test_gkn_ocr_alias_files_under_official_customer_folder(tmp_path):
    """TEST 9: OCR alias name must not become the output folder; use official_name."""
    output_root = tmp_path / "Output"
    store = Store(output_root / "invoice_processor.db")
    store.seed(load_official_customers())
    gkn = store.customer_by_id("C037")
    store.set_alias("GKN Driveline India Limited", gkn["customer_id"])
    store.close()

    input_root = tmp_path / "Input"
    _invoice_in_unit(
        input_root,
        "01-Sep-26",
        "01_2022",
        "gkn.pdf",
        "20222500099",
        "GKN Driveline India Limited",
    )
    results = process(input_root, output_root)
    copied = results[0]
    assert copied["status"] == "COPIED"
    assert copied["customer_id"] == "C037"
    assert copied["customer"] == "GKN driveline Pune"
    assert copied["year"] == "2022"
    assert (output_root / "GKN driveline Pune" / "2022" / "20222500099.pdf").exists()
    assert not (output_root / "GKN Driveline India Limited").exists()


def test_duplicate_destination_is_not_overwritten(tmp_path):
    """TEST 10: second file with same destination → DUPLICATE_DESTINATION."""
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    folder = input_root / "01-Sep-26" / "Invoice" / "01_2026"
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
    dest = output_root / "Porite India Pvt. Ltd" / "2026"
    assert (dest / "20262500111.pdf").exists()
    assert not (dest / "20262500111__DUPLICATE.pdf").exists()
    assert not (input_root / "01-Sep-26_done").exists()


def test_supporting_pages_stay_in_the_copied_pdf(tmp_path, monkeypatch):
    from core.sorter import ocr_scanned_page
    from tests.pdf_fixtures import SAMPLE_INVOICES, write_text_pdf

    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    source = write_text_pdf(
        input_root / "01-Sep-26" / "Invoice" / "01_2026" / "3344.pdf",
        invoices=[SAMPLE_INVOICES[0]],
    )
    calls = []

    def tracked(page, scale=1.2):
        calls.append(page.number)
        return ocr_scanned_page(page, scale=scale)

    monkeypatch.setattr("core.sorter.ocr_scanned_page", tracked)
    process(input_root, output_root)
    assert calls == []  # embedded text is used; supporting pages are not rendered
    original = fitz.open(
        source if source.exists() else input_root / "01-Sep-26_done" / "Invoice" / "01_2026_done" / "3344.pdf"
    )
    copied = fitz.open(output_root / "Porite India Pvt. Ltd" / "2026" / "20242500788.pdf")
    assert original.page_count == copied.page_count == 3
    original.close()
    copied.close()


def test_three_days_share_one_customer_year(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    for day, number, unit in (
        ("01-Sep-26", "20262500111", "01_2026"),
        ("02-Sep-26", "20262500222", "01_2026"),
        ("03-Sep-26", "20262500333", "01_2026"),
    ):
        _invoice_in_unit(input_root, day, unit, f"{number}.pdf", number, "PORITE INDIA PVT.LTD.")
    process(input_root, output_root)
    year = output_root / "Porite India Pvt. Ltd" / "2026"
    assert {path.name for path in (output_root / "Porite India Pvt. Ltd").iterdir()} == {"2026"}
    assert {path.name for path in year.iterdir()} == {
        "20262500111.pdf",
        "20262500222.pdf",
        "20262500333.pdf",
    }
    for _day, number in (("01-Sep-26", "20262500111"), ("02-Sep-26", "20262500222"), ("03-Sep-26", "20262500333")):
        assert (year / f"{number}.pdf").is_file()


def test_every_review_required_spelling_stays_unmatched():
    master = load_customer_master()
    customers = [
        CustomerRef(item.customer_id, item.official_name, normalize_customer(item.official_name))
        for item in master.customers
    ]
    aliases = [
        AliasRef(normalize_customer(item.alias), item.customer_id, item.alias)
        for item in master.aliases
    ]
    accepted = [
        norm for norm in master.review_norms
        if match_customer(norm, customers, aliases, master.review_norms).accepted
    ]
    assert accepted == []


def test_workbook_alias_files_under_official_id(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    _invoice_in_unit(
        input_root,
        "01-Sep-26",
        "01_2026",
        "ace.pdf",
        "20262500701",
        "ACE INOTEC MANUFACTURING PVT. LTD",
    )
    results = process(input_root, output_root)
    assert results[0]["status"] == "COPIED"
    assert results[0]["customer_id"] == "C004"
    assert (output_root / "ACE Inotec MFG.Pvt.Ltd" / "2026" / "20262500701.pdf").is_file()
    mapping = (output_root / "customer_alias_mapping.csv").read_text(encoding="utf-8-sig")
    assert "ACE INOTEC MANUFACTURING PVT. LTD" in mapping
    from core.customer_master import alias_sheet_rows

    assert mapping.count("\n") == len(alias_sheet_rows()) + 1
    store = Store(output_root / "invoice_processor.db")
    porite = store.customer_by_name("Porite India Pvt. Ltd.")
    assert porite["customer_id"] == "C071"
    store.close()


def test_review_list_spellings_are_not_filed(tmp_path):
    input_root = tmp_path / "Input"
    output_root = tmp_path / "Output"
    _invoice_in_unit(input_root, "01-Sep-26", "01_2026", "review.pdf", "20262500702", "VARROC ENGINEERING ILTD")
    _invoice_in_unit(input_root, "01-Sep-26", "01_2026", "creative.pdf", "20262500703", "CREATIVE CARVE PVT LTD")
    results = process(input_root, output_root)
    assert {row["status"] for row in results} == {"REVIEW"}
    assert {row["reason_code"] for row in results} == {"CUSTOMER_NOT_MATCHED"}


def test_client_alias_csv_uses_exact_alias_not_fuzzy():
    from core.customer_master import load_customer_master

    master = load_customer_master()
    assert master is not None
    customers = [
        CustomerRef(item.customer_id, item.official_name, normalize_customer(item.official_name))
        for item in master.customers
    ]
    aliases = [
        AliasRef(normalize_customer(item.alias), item.customer_id, item.alias)
        for item in master.aliases
    ]
    approved = match_customer(
        "ADVIK HII-TECH PVT.LTD",
        customers,
        aliases,
        master.review_norms,
    )
    assert approved.accepted
    assert approved.method == "EXACT_ALIAS"
    assert approved.customer_id == "C005"
    unknown = match_customer("TOTALLY UNKNOWN CORP XYZ", customers, aliases, master.review_norms)
    assert not unknown.accepted
    assert unknown.reason_code == "CUSTOMER_NOT_MATCHED"
