"""Merge review CSV corrections into customer_alias_mapping_updated.csv.

Uses Raw OCR Customer + Correct Customer ID when filled; otherwise Suggested
Customer ID for CUSTOMER_NOT_MATCHED / CUSTOMER_AMBIGUOUS rows.

Usage:
  python tools/merge_review_into_alias_master.py path/to/invoice_sorter_review.csv
  python tools/merge_review_into_alias_master.py review.csv --report /tmp/merge-report.md
"""

from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.customer_master import load_customer_master  # noqa: E402
from core.matching import normalize_customer  # noqa: E402
from tools.promote_suggested_aliases import merge_alias_candidates  # noqa: E402

CUSTOMER_REASONS = frozenset({"CUSTOMER_NOT_MATCHED", "CUSTOMER_AMBIGUOUS"})
ALIAS_CSV = ROOT / "customer_alias_mapping_updated.csv"

STORE_REVIEW = Path(
    "/cursor/stores/bc-9869dfc6-342b-4bef-8c49-b602ce9fa82a/media/invoice_sorter_review.csv"
)


@dataclass
class MergeReport:
    total_rows: int
    with_correct_id: int
    alias_candidates: int
    added: int
    repointed: int
    skipped_duplicate: int
    skipped_no_ocr: int
    skipped_bad_id: int
    skipped_id_conflict: int
    by_reason: dict[str, int]
    by_customer_id: dict[str, int]


def _valid_ids() -> set[str]:
    master = load_customer_master()
    if master is None:
        return set()
    return {c.customer_id for c in master.customers}


def collect_aliases_from_review(
    rows: list[dict],
    valid_ids: set[str],
    corrections_only: bool,
) -> tuple[list[dict], MergeReport]:
    by_reason = Counter()
    by_cid = Counter()
    out: list[dict] = []
    seen_norm: dict[str, str] = {}
    skipped_duplicate = skipped_no_ocr = skipped_bad_id = skipped_id_conflict = 0
    with_correct = 0

    for row in rows:
        reason = (row.get("Failure Reason") or "").strip()
        by_reason[reason or "(blank)"] += 1
        correct = (row.get("Correct Customer ID") or "").strip()
        suggested = (row.get("Suggested Customer ID") or "").strip()
        if correct:
            with_correct += 1
            customer_id = correct
        elif corrections_only:
            continue
        elif reason in CUSTOMER_REASONS:
            customer_id = suggested
        else:
            continue

        alias = (row.get("Raw OCR Customer") or "").strip()
        if not customer_id:
            continue
        if not alias:
            skipped_no_ocr += 1
            continue
        if customer_id not in valid_ids:
            skipped_bad_id += 1
            continue
        norm = normalize_customer(alias)
        if not norm:
            skipped_no_ocr += 1
            continue
        if norm in seen_norm:
            if seen_norm[norm] != customer_id:
                skipped_id_conflict += 1
            else:
                skipped_duplicate += 1
            continue
        existing_owner = seen_norm.get(norm)
        if existing_owner and existing_owner != customer_id:
            skipped_id_conflict += 1
            continue
        seen_norm[norm] = customer_id
        out.append({"Alias": alias, "Customer ID": customer_id})
        by_cid[customer_id] += 1

    candidates = len(out)
    report = MergeReport(
        total_rows=len(rows),
        with_correct_id=with_correct,
        alias_candidates=candidates,
        added=0,
        repointed=0,
        skipped_duplicate=skipped_duplicate,
        skipped_no_ocr=skipped_no_ocr,
        skipped_bad_id=skipped_bad_id,
        skipped_id_conflict=skipped_id_conflict,
        by_reason=dict(by_reason),
        by_customer_id=dict(by_cid),
    )
    return out, report


def format_report(report: MergeReport, review_path: Path, alias_path: Path) -> str:
    lines = [
        f"# Review → alias merge report",
        f"",
        f"- Review file: `{review_path}`",
        f"- Alias master: `{alias_path}`",
        f"- Total review rows: {report.total_rows}",
        f"- Rows with **Correct Customer ID**: {report.with_correct_id}",
        f"- Alias candidates: {report.alias_candidates}",
        f"- **Added** to master: {report.added}",
        f"- **Repointed** (same OCR norm, new Customer ID): {report.repointed}",
        f"- Skipped (already on that ID): {report.skipped_duplicate}",
        f"- Skipped (no OCR text): {report.skipped_no_ocr}",
        f"- Skipped (unknown Customer ID): {report.skipped_bad_id}",
        f"- Skipped (norm maps to two IDs): {report.skipped_id_conflict}",
        f"",
        f"## Failure reasons in review file",
        f"",
    ]
    for reason, count in sorted(report.by_reason.items(), key=lambda x: -x[1]):
        lines.append(f"- {count}: `{reason}`")
    lines.extend(["", "## New aliases by Customer ID", ""])
    for cid, count in sorted(report.by_customer_id.items()):
        lines.append(f"- {cid}: {count}")
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "review_csv",
        type=Path,
        nargs="?",
        help="invoice_sorter_review.csv (default: Project store media path if present)",
    )
    parser.add_argument(
        "--merge-into",
        type=Path,
        default=ALIAS_CSV,
        help="customer_alias_mapping_updated.csv to append to",
    )
    parser.add_argument("--report", type=Path, help="Write markdown summary here")
    parser.add_argument(
        "--include-suggested",
        action="store_true",
        help="Also promote Suggested Customer ID when Correct Customer ID is blank",
    )
    parser.add_argument(
        "--no-repoint",
        action="store_true",
        help="Do not change Customer ID when the normalized alias already exists",
    )
    args = parser.parse_args(argv)

    review_path = args.review_csv
    if review_path is None:
        if STORE_REVIEW.is_file():
            review_path = STORE_REVIEW
        else:
            print(
                "Provide review_csv path or upload to:\n"
                f"  {STORE_REVIEW}",
                file=sys.stderr,
            )
            return 2
    if not review_path.is_file():
        print(f"Not found: {review_path}", file=sys.stderr)
        return 2

    with review_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    valid_ids = _valid_ids()
    corrections_only = not args.include_suggested
    candidates, report = collect_aliases_from_review(rows, valid_ids, corrections_only)

    stats = merge_alias_candidates(
        args.merge_into,
        candidates,
        repoint=not args.no_repoint,
    )
    report.added = stats["added"]
    report.repointed = stats["repointed"]
    report.skipped_duplicate += stats["skipped_same"]

    text = format_report(report, review_path, args.merge_into)
    print(text)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(text, encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
