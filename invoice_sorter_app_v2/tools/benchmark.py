"""Time first-page identification on a folder of invoice PDFs."""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core.sorter import process  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description="Benchmark invoice sorter on a zip or folder.")
    parser.add_argument("input", type=Path, help="Input zip or nested DD-MMM-YY folder")
    parser.add_argument("output", type=Path, help="Output root (created if missing)")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    started = time.perf_counter()
    results = process(args.input, args.output)
    elapsed = time.perf_counter() - started
    copied = sum(r.get("status") == "COPIED" for r in results)
    review = sum(r.get("status") == "REVIEW" for r in results)
    skipped = sum(r.get("status") == "SKIPPED" for r in results)
    print(f"files={len(results)} copied={copied} review={review} skipped={skipped} seconds={elapsed:.2f}")
    for row in results:
        dest = row.get("destination") or row.get("reason") or ""
        print(f"{row.get('status')}\t{row.get('invoice_number', '')}\t{row.get('year', '')}\t{dest}")


if __name__ == "__main__":
    main()
