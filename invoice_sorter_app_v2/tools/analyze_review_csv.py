"""Summarize invoice_sorter_review.csv by failure reason and match hints.

Usage:
  python tools/analyze_review_csv.py path/to/invoice_sorter_review.csv
  python tools/analyze_review_csv.py path/to/output_folder
"""

from __future__ import annotations

import csv
import sys
from collections import Counter
from pathlib import Path

REVIEW_NAME = "invoice_sorter_review.csv"


def _resolve(path: Path) -> Path:
    if path.is_dir():
        candidate = path / REVIEW_NAME
        if not candidate.is_file():
            raise SystemExit(f"No {REVIEW_NAME} under {path}")
        return candidate
    if not path.is_file():
        raise SystemExit(f"Not found: {path}")
    return path


def analyze(path: Path) -> dict:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
    total = len(rows)
    by_reason = Counter((row.get("Failure Reason") or "(blank)").strip() for row in rows)
    has_suggestion = sum(
        1
        for row in rows
        if (row.get("Suggested Customer ID") or "").strip()
        or (row.get("Suggested Customer Name") or "").strip()
    )
    high_conf = sum(
        1
        for row in rows
        if _float(row.get("Confidence")) >= 0.85
    )
    return {
        "path": str(path),
        "total_review_rows": total,
        "by_failure_reason": dict(by_reason.most_common()),
        "rows_with_suggested_customer": has_suggestion,
        "rows_confidence_ge_85": high_conf,
    }


def _float(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    if not argv:
        print(__doc__.strip())
        return 2
    path = _resolve(Path(argv[0]))
    summary = analyze(path)
    print(f"Review CSV: {summary['path']}")
    print(f"Total rows: {summary['total_review_rows']}")
    print(f"Rows with suggested customer id/name: {summary['rows_with_suggested_customer']}")
    print(f"Rows with confidence >= 0.85: {summary['rows_confidence_ge_85']}")
    print("\nBy Failure Reason:")
    for reason, count in summary["by_failure_reason"].items():
        pct = 100 * count / summary["total_review_rows"] if summary["total_review_rows"] else 0
        print(f"  {count:4d} ({pct:5.1f}%)  {reason}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
