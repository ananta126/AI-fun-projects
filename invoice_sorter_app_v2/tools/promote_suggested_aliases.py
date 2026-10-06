"""Add alias rows from review CSV where suggested customer id/name look right.

The matcher often fills Suggested Customer ID on review rows when fuzzy score is
high (e.g. 0.85–0.91) but below auto-file thresholds. Adding Raw OCR Customer as
an approved alias fixes the next sort.

Usage:
  python tools/promote_suggested_aliases.py path/to/invoice_sorter_review.csv
  python tools/promote_suggested_aliases.py review.csv --merge invoice_sorter_app_v2/customer_alias_mapping_updated.csv
  python tools/promote_suggested_aliases.py review.csv --stdout

By default writes promoted_aliases_to_add.csv next to the review file.
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.matching import normalize_customer  # noqa: E402

CUSTOMER_REASONS = frozenset({"CUSTOMER_NOT_MATCHED", "CUSTOMER_AMBIGUOUS"})


def _confidence(row: dict) -> float:
    try:
        return float(row.get("Confidence") or 0)
    except (TypeError, ValueError):
        return 0.0


def promote_rows(
    review_path: Path,
    min_confidence: float = 0.0,
    only_customer_failures: bool = True,
) -> list[dict]:
    with review_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
    out: list[dict] = []
    seen_norm: set[str] = set()
    for row in rows:
        reason = (row.get("Failure Reason") or "").strip()
        if only_customer_failures and reason not in CUSTOMER_REASONS:
            continue
        correct = (row.get("Correct Customer ID") or "").strip()
        customer_id = correct or (row.get("Suggested Customer ID") or "").strip()
        alias = (row.get("Raw OCR Customer") or "").strip()
        if not customer_id or not alias:
            continue
        if min_confidence and _confidence(row) < min_confidence:
            continue
        norm = normalize_customer(alias)
        if not norm or norm in seen_norm:
            continue
        seen_norm.add(norm)
        out.append({"Alias": alias, "Customer ID": customer_id})
    return out


def load_existing_aliases(path: Path) -> set[str]:
    if not path.is_file():
        return set()
    norms: set[str] = set()
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            alias = (row.get("Alias") or "").strip()
            if alias:
                norms.add(normalize_customer(alias))
    return norms


def load_alias_rows(path: Path) -> list[dict[str, str]]:
    if not path.is_file():
        return []
    rows: list[dict[str, str]] = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            alias = (row.get("Alias") or "").strip()
            customer_id = (row.get("Customer ID") or "").strip()
            if alias and customer_id:
                rows.append({"Alias": alias, "Customer ID": customer_id})
    return rows


def write_alias_rows(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["Alias", "Customer ID"]
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def merge_alias_candidates(
    path: Path,
    candidates: list[dict[str, str]],
    *,
    repoint: bool = True,
) -> dict[str, int]:
    """Append new aliases; optionally move existing normalized spellings to a new Customer ID."""
    rows = load_alias_rows(path)
    norm_to_index: dict[str, int] = {}
    for index, row in enumerate(rows):
        norm = normalize_customer(row["Alias"])
        if norm and norm not in norm_to_index:
            norm_to_index[norm] = index

    added = repointed = skipped_same = 0
    for cand in candidates:
        alias = (cand.get("Alias") or "").strip()
        customer_id = (cand.get("Customer ID") or "").strip()
        if not alias or not customer_id:
            continue
        norm = normalize_customer(alias)
        if not norm:
            continue
        if norm in norm_to_index:
            idx = norm_to_index[norm]
            if rows[idx]["Customer ID"] == customer_id:
                skipped_same += 1
            elif repoint:
                rows[idx]["Customer ID"] = customer_id
                if rows[idx]["Alias"] != alias:
                    rows[idx]["Alias"] = alias
                repointed += 1
            else:
                skipped_same += 1
            continue
        rows.append({"Alias": alias, "Customer ID": customer_id})
        norm_to_index[norm] = len(rows) - 1
        added += 1

    write_alias_rows(path, rows)
    return {"added": added, "repointed": repointed, "skipped_same": skipped_same}


def write_aliases(path: Path, rows: list[dict], append: bool) -> int:
    if append and path.is_file():
        stats = merge_alias_candidates(path, rows, repoint=False)
        return stats["added"]
    write_alias_rows(path, rows)
    return len(rows)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("review_csv", type=Path)
    parser.add_argument(
        "--merge",
        type=Path,
        metavar="ALIAS_CSV",
        help="Append new aliases into customer_alias_mapping_updated.csv (skip duplicates)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Write promoted rows only (default: promoted_aliases_to_add.csv beside review)",
    )
    parser.add_argument("--stdout", action="store_true", help="Print Alias,Customer ID to stdout")
    parser.add_argument(
        "--min-confidence",
        type=float,
        default=0.0,
        help="Only promote when Confidence >= this (0 = all with suggestion)",
    )
    parser.add_argument(
        "--include-all-failures",
        action="store_true",
        help="Also consider non-customer failure reasons (usually skip)",
    )
    args = parser.parse_args(argv)
    if not args.review_csv.is_file():
        print(f"Not found: {args.review_csv}", file=sys.stderr)
        return 2

    promoted = promote_rows(
        args.review_csv,
        min_confidence=args.min_confidence,
        only_customer_failures=not args.include_all_failures,
    )
    if args.stdout:
        writer = csv.DictWriter(sys.stdout, fieldnames=["Alias", "Customer ID"])
        writer.writeheader()
        writer.writerows(promoted)
        print(f"# {len(promoted)} alias rows", file=sys.stderr)
        return 0

    if args.merge:
        added = write_aliases(args.merge, promoted, append=True)
        print(f"Merged {added} new aliases into {args.merge} ({len(promoted)} candidates)")
        return 0

    out = args.output or (args.review_csv.parent / "promoted_aliases_to_add.csv")
    write_aliases(out, promoted, append=False)
    print(f"Wrote {len(promoted)} rows to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
