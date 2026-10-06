"""Simulate promoting review CSV aliases and report fix vs still-ambiguous."""

from __future__ import annotations

import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.matching import AliasRef, CustomerRef, match_customer, normalize_customer  # noqa: E402
from tools.promote_suggested_aliases import promote_rows  # noqa: E402


def load_master():
    import openpyxl

    wb = openpyxl.load_workbook(ROOT / "customer_master_alias_mapping.xlsx", read_only=True, data_only=True)
    customers = [
        CustomerRef(str(row[0]).strip(), str(row[1]).strip(), normalize_customer(str(row[1])))
        for row in wb["Customer Master"].iter_rows(min_row=2, values_only=True)
        if row and row[0] and row[1]
    ]
    wb.close()
    aliases = []
    with (ROOT / "customer_alias_mapping_updated.csv").open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            alias = row["Alias"].strip()
            aliases.append(AliasRef(normalize_customer(alias), row["Customer ID"].strip(), alias))
    return customers, aliases


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    if not argv:
        print("Usage: python tools/simulate_review_promotion.py path/to/invoice_sorter_review.csv")
        return 2
    review_path = Path(argv[0])
    if not review_path.is_file():
        print(f"Not found: {review_path}")
        return 2

    customers, aliases = load_master()
    promoted = promote_rows(review_path, min_confidence=0.0, only_customer_failures=True)
    extra = [
        AliasRef(normalize_customer(row["Alias"]), row["Customer ID"], row["Alias"])
        for row in promoted
    ]
    combined = aliases + extra

    fixed = still_amb = other = 0
    with review_path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if (row.get("Failure Reason") or "").strip() != "CUSTOMER_AMBIGUOUS":
                continue
            raw = (row.get("Raw OCR Customer") or "").strip()
            if not raw:
                continue
            before = match_customer(raw, customers, aliases, frozenset())
            after = match_customer(raw, customers, combined, frozenset())
            if after.accepted and not before.accepted:
                fixed += 1
            elif not after.accepted and after.reason_code == "CUSTOMER_AMBIGUOUS":
                still_amb += 1
            else:
                other += 1

    print(f"Promoted alias candidates: {len(promoted)}")
    print(f"CUSTOMER_AMBIGUOUS rows — fixed after promotion: {fixed}")
    print(f"Still CUSTOMER_AMBIGUOUS: {still_amb}")
    print(f"Other outcomes: {other}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
