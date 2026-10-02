"""CSV is the human correction sheet. SQLite remains the system of record."""

from __future__ import annotations

import csv
from pathlib import Path


REVIEW_CSV_NAME = "invoice_sorter_review.csv"
CUSTOMER_LIST_NAME = "customer_ids.csv"
ALIAS_MAPPING_NAME = "customer_alias_mapping.csv"

REVIEW_COLUMNS = [
    "Document ID",
    "Source Date Folder",
    "Source Invoice Folder",
    "Original File Path",
    "Original File Name",
    "Raw OCR Customer",
    "Normalized Customer",
    "Detected Invoice Number",
    "Derived Year",
    "Failure Reason",
    "Suggested Customer ID",
    "Suggested Customer Name",
    "Confidence",
    "Second Best Customer",
    "Second Best Score",
    "Correct Customer ID",
    "Correct Invoice Number",
    "Correct Year",
]


def _score(value) -> str:
    if value is None or value == "":
        return ""
    try:
        return f"{float(value):.3f}"
    except (TypeError, ValueError):
        return str(value)


def write_review_csv(documents, dest: Path) -> Path:
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=REVIEW_COLUMNS)
        writer.writeheader()
        for row in documents:
            if row["state"] not in {"REVIEW_REQUIRED", "FAILED"}:
                continue
            writer.writerow({
                "Document ID": row["document_id"],
                "Source Date Folder": row["date_folder"],
                "Source Invoice Folder": row["source_invoice_folder"],
                "Original File Path": row["source_path"],
                "Original File Name": row["source_name"],
                "Raw OCR Customer": row["raw_ocr_customer"],
                "Normalized Customer": row["normalized_customer"],
                "Detected Invoice Number": row["invoice_number"],
                "Derived Year": row["derived_year"],
                "Failure Reason": row["reason_code"],
                "Suggested Customer ID": row["customer_id"],
                "Suggested Customer Name": row["official_name"],
                "Confidence": _score(row["match_score"]),
                "Second Best Customer": row["second_name"],
                "Second Best Score": _score(row["second_score"]),
                "Correct Customer ID": "",
                "Correct Invoice Number": "",
                "Correct Year": "",
            })
    return dest


def write_customer_list(customers, dest: Path) -> Path:
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Customer ID", "Official Customer Name"])
        writer.writeheader()
        for row in customers:
            writer.writerow({
                "Customer ID": row["customer_id"],
                "Official Customer Name": row["official_name"],
            })
    return dest


def write_alias_mapping(dest: Path, aliases=None) -> Path:
    """Write the Alias Master sheet the user can open.

    When aliases is omitted, the rows come straight from the mapping workbook
    so every spelling on that sheet is visible, including ones that collapse
    to the same normalized text.
    """
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    columns = ["Customer ID", "Official Customer", "Alias", "Match Score"]
    with dest.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        if aliases is None:
            from core.customer_master import alias_sheet_rows

            aliases = alias_sheet_rows()
        for row in aliases:
            writer.writerow({
                "Customer ID": row["customer_id"],
                "Official Customer": row["official_name"],
                "Alias": row["alias"],
                "Match Score": row.get("match_score", ""),
            })
    return dest


def read_corrections(path: Path) -> list[dict]:
    with Path(path).open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))
