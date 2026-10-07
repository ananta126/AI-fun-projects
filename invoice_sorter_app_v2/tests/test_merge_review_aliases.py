"""Merge review corrections into alias CSV."""

from __future__ import annotations

import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tools.merge_review_into_alias_master import collect_aliases_from_review  # noqa: E402
from tools.promote_suggested_aliases import merge_alias_candidates, write_alias_rows  # noqa: E402


def test_correct_customer_id_overrides_suggested(tmp_path):
    rows = [
        {
            "Failure Reason": "CUSTOMER_AMBIGUOUS",
            "Raw OCR Customer": "SKF INDIA LIMITED",
            "Suggested Customer ID": "C120",
            "Correct Customer ID": "C088",
        },
    ]
    valid = {"C088", "C120"}
    aliases, report = collect_aliases_from_review(rows, valid, corrections_only=True)
    assert len(aliases) == 1
    assert aliases[0]["Customer ID"] == "C088"
    assert report.with_correct_id == 1


def test_merge_repoints_existing_norm_to_correct_id(tmp_path):
    alias_csv = tmp_path / "aliases.csv"
    write_alias_rows(
        alias_csv,
        [{"Alias": "SKF INDIA LIMITED", "Customer ID": "C120"}],
    )
    stats = merge_alias_candidates(
        alias_csv,
        [{"Alias": "SKF INDIA LTD", "Customer ID": "C088"}],
        repoint=True,
    )
    assert stats["repointed"] == 1
    assert stats["added"] == 0
    rows = alias_csv.read_text(encoding="utf-8-sig")
    assert "C088" in rows
    assert "C120" not in rows
