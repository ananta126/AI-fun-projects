"""Benchmark page-1 OCR throughput at several worker counts.

Uses the same env knobs as production:
INVOICE_SORTER_WORKERS, INVOICE_SORTER_ORT_INTRA_THREADS, INVOICE_SORTER_ORT_INTER_THREADS.
"""

from __future__ import annotations

import argparse
import os
import statistics
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core.sorter import ocr_first_page, worker_count  # noqa: E402


def _collect_pdfs(root: Path) -> list[Path]:
    pdfs = sorted(
        path for path in root.rglob("*.pdf")
        if path.is_file() and not path.name.startswith(".")
    )
    return pdfs


def _run_once(pdfs: list[Path], workers: int) -> dict:
    os.environ["INVOICE_SORTER_WORKERS"] = str(workers)
    from concurrent.futures import ThreadPoolExecutor, as_completed

    started = time.perf_counter()
    retries = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(ocr_first_page, pdf) for pdf in pdfs]
        for future in as_completed(futures):
            _text, _pages, _lines = future.result()
            retries += 0
    elapsed = time.perf_counter() - started
    rate = len(pdfs) / elapsed if elapsed > 0 else 0.0
    return {
        "workers": workers,
        "pdfs": len(pdfs),
        "seconds": elapsed,
        "pdfs_per_min": rate * 60.0,
        "retries": retries,
    }


def main():
    parser = argparse.ArgumentParser(description="Sweep worker counts for first-page OCR.")
    parser.add_argument("input", type=Path, help="Folder tree containing PDFs")
    parser.add_argument(
        "--workers",
        type=int,
        nargs="*",
        default=[1, 2, 4, 6, 8],
        help="Worker counts to try (default: 1 2 4 6 8)",
    )
    args = parser.parse_args()
    pdfs = _collect_pdfs(args.input)
    if not pdfs:
        print("No PDFs found", file=sys.stderr)
        sys.exit(1)
    cpu = os.cpu_count() or 2
    print(f"cpu={cpu} default_worker_count={worker_count()} pdfs={len(pdfs)}")
    rows = []
    for count in args.workers:
        if count < 1:
            continue
        if count > cpu and count > 1:
            print(f"skip workers={count} (> cpu_count {cpu})")
            continue
        row = _run_once(pdfs, count)
        rows.append(row)
        print(
            f"workers={row['workers']} "
            f"pdfs_per_min={row['pdfs_per_min']:.1f} "
            f"seconds={row['seconds']:.2f}"
        )
    if len(rows) >= 2:
        best = max(rows, key=lambda item: item["pdfs_per_min"])
        print(f"best_workers={best['workers']} pdfs_per_min={best['pdfs_per_min']:.1f}")


if __name__ == "__main__":
    main()
