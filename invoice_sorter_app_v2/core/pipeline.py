"""Analyze, then copy only safe matches. OCR stays in core.sorter."""

from __future__ import annotations

import shutil
from pathlib import Path

from core.customer_master import ensure_customer_master_ready, load_customer_master
from core.db import Store
from core.matching import AliasRef, CustomerRef, match_customer
from core.review_csv import (
    ALIAS_MAPPING_NAME,
    CUSTOMER_LIST_NAME,
    REVIEW_CSV_NAME,
    read_corrections,
    write_alias_mapping,
    write_customer_list,
    write_review_csv,
)
from core.sorter import (
    billed_to_region,
    find_date_folders,
    invoice_child,
    load_official_customers,
    ocr_first_page,
    resolve_invoice_number,
    retry_first_page_read,
    safe_name,
    worker_count,
    write_exception_report,
    year_from_invoice_unit,
    EXCEPTION_REPORT_NAME,
)


def _detail_invoice_missing() -> str:
    return "No GST invoice number on page 1 after regex and spatial OCR"


def _detail_customer_missing() -> str:
    return "No billed-to company name on page 1"


def _detail_customer_not_matched(raw: str, match) -> str:
    if match.method and match.method != "NONE":
        score = f"{match.score:.2f}" if match.score is not None else ""
        return f"Billed-to '{raw}' did not match an approved customer (method={match.method}, score={score})"
    return f"Billed-to '{raw}' is not on the customer or alias list"


def _master(store: Store):
    customers = [
        CustomerRef(row["customer_id"], row["official_name"], row["normalized_name"])
        for row in store.customers()
    ]
    aliases = [
        AliasRef(row["alias_norm"], row["customer_id"], row["alias_raw"])
        for row in store.aliases()
    ]
    return customers, aliases


def _pdfs_under(folder: Path) -> list[Path]:
    found = []
    for path in folder.rglob("*"):
        if not path.is_file() or path.suffix.lower() != ".pdf" or path.name.startswith("."):
            continue
        parts = path.relative_to(folder).parts
        if any(part.endswith("_done") or part.lower() == "pis" for part in parts):
            continue
        found.append(path)
    return sorted(found)


def iter_work_units(date_folder: Path):
    """Return work units, or None when the day has no Invoice folder (PIS-only)."""
    invoice_dir = invoice_child(date_folder)
    if invoice_dir is None:
        return None
    units = []
    for child in sorted(invoice_dir.iterdir(), key=lambda path: path.name):
        if not child.is_dir():
            continue
        if child.name.lower() == "pis" or child.name.endswith("_done"):
            continue
        units.append({
            "unit": child,
            "pdfs": _pdfs_under(child),
            "kind": "subfolder",
            "invoice_folder": child.name,
        })
    direct = sorted(
        path for path in invoice_dir.iterdir()
        if path.is_file() and path.suffix.lower() == ".pdf" and not path.name.startswith(".")
    )
    if direct:
        units.append({
            "unit": date_folder,
            "pdfs": direct,
            "kind": "direct",
            "invoice_folder": invoice_dir.name,
        })
    return units


def _derived_year(unit: dict, date_folder: Path) -> int | None:
    """Filing year from the invoice unit folder name only (``NN_YYYY``).

    Scan-date folders and printed dates are never used for output year.
    Direct PDFs under ``Invoice/`` have no unit folder → None.
    """
    if unit["kind"] == "subfolder":
        return year_from_invoice_unit(unit["invoice_folder"])
    return None


def _analyze_pdf(pdf: Path, root: Path, date_folder: Path, unit: dict) -> dict:
    source_path = str(pdf.resolve())
    year = _derived_year(unit, date_folder)
    base = {
        "source_path": source_path,
        "source_rel": str(pdf.relative_to(root)) if root in pdf.parents or pdf.parent == root else pdf.name,
        "source_name": pdf.name,
        "date_folder": date_folder.name,
        "date_folder_path": str(date_folder.resolve()),
        "unit_path": str(unit["unit"].resolve()),
        "unit_kind": unit["kind"],
        "source_invoice_folder": unit["invoice_folder"],
        "page_count": 0,
        "ocr_text": "",
        "raw_ocr_customer": "",
        "normalized_customer": "",
        "invoice_number": "",
        "derived_year": str(year) if year else "",
        "customer_id": "",
        "official_name": "",
        "match_method": "",
        "match_score": None,
        "second_name": "",
        "second_score": None,
        "state": "REVIEW_REQUIRED",
        "reason_code": "",
        "reason_detail": "",
    }
    try:
        relative = pdf.resolve().relative_to(root.resolve())
        base["source_rel"] = str(relative)
    except ValueError:
        base["source_rel"] = pdf.name
    try:
        text, page_count, lines = ocr_first_page(pdf)
        invoice_no = resolve_invoice_number(text, lines, source="page1", pdf_path=pdf)
        raw = billed_to_region(text, lines)
        if not invoice_no or not raw:
            retried, retried_lines = retry_first_page_read(pdf, text)
            if retried != text:
                text = retried
            if retried_lines:
                lines = retried_lines
            if not invoice_no:
                invoice_no = resolve_invoice_number(
                    text,
                    lines,
                    source="retry_first_page",
                    pdf_path=pdf,
                )
            if not raw:
                raw = billed_to_region(text, lines) or raw
    except Exception as exc:  # noqa: BLE001 — one bad PDF must not stop the batch
        base.update({
            "state": "FAILED",
            "reason_code": "PDF_READ_ERROR",
            "reason_detail": str(exc),
        })
        return base

    base["page_count"] = page_count
    base["ocr_text"] = text or ""
    base["raw_ocr_customer"] = raw or ""
    base["invoice_number"] = invoice_no or ""
    return base


def _apply_master(store: Store):
    master = load_customer_master()
    if master is None:
        store.seed(load_official_customers())
        return frozenset()
    store.seed_master(master.customers, master.aliases)
    return master.review_norms


def _classify(base: dict, customers, aliases, blocked=None) -> dict:
    if base["state"] == "FAILED":
        return base
    year = base["derived_year"]
    invoice_no = base["invoice_number"]
    raw = base["raw_ocr_customer"]
    if not year:
        folder = base.get("source_invoice_folder") or ""
        if base.get("unit_kind") == "direct":
            base.update({
                "state": "REVIEW_REQUIRED",
                "reason_code": "INVOICE_YEAR_NOT_DETECTED",
                "reason_detail": (
                    "PDF is directly under Invoice/; expected a sequence_YEAR subfolder (e.g. 01_2022)"
                ),
            })
        else:
            base.update({
                "state": "REVIEW_REQUIRED",
                "reason_code": "INVOICE_YEAR_NOT_DETECTED",
                "reason_detail": (
                    f"Invoice unit folder '{folder}' does not match sequence_YEAR (e.g. 01_2022)"
                ),
            })
        return base
    if not invoice_no:
        base.update({
            "state": "REVIEW_REQUIRED",
            "reason_code": "INVOICE_NUMBER_NOT_DETECTED",
            "reason_detail": _detail_invoice_missing(),
        })
        return base
    if not raw:
        base.update({
            "state": "REVIEW_REQUIRED",
            "reason_code": "CUSTOMER_NOT_DETECTED",
            "reason_detail": _detail_customer_missing(),
        })
        return base
    match = match_customer(raw, customers, aliases, blocked)
    base["normalized_customer"] = match.normalized
    base["match_method"] = match.method
    base["match_score"] = match.score
    base["second_name"] = match.second_name or ""
    base["second_score"] = match.second_score
    if match.accepted:
        base.update({
            "state": "AUTO_MATCHED",
            "customer_id": match.customer_id or "",
            "official_name": match.official_name or "",
            "reason_code": "",
            "reason_detail": "",
        })
        return base
    base.update({
        "state": "REVIEW_REQUIRED",
        "customer_id": match.customer_id or "",
        "official_name": match.official_name or "",
        "reason_code": match.reason_code or "CUSTOMER_NOT_MATCHED",
        "reason_detail": _detail_customer_not_matched(raw, match),
    })
    return base


def _reason_text(row) -> str:
    code = row["reason_code"] or ""
    detail = row["reason_detail"] or ""
    if code and detail:
        return f"{code}: {detail}"
    return code or detail


def result_from_row(row) -> dict:
    state = row["state"]
    if state == "COMPLETED":
        status = "COPIED"
    elif state == "FAILED":
        status = "FAILED"
    elif state == "AUTO_MATCHED":
        status = "AUTO_MATCHED"
    else:
        status = "REVIEW"
    pages = row["page_count"] or 0
    return {
        "status": status,
        "state": state,
        "document_id": row["document_id"],
        "source_file": row["source_rel"] or row["source_name"],
        "source_pages": f"1-{pages}" if pages else "",
        "invoice_number": row["invoice_number"] or "",
        "customer": safe_name(row["official_name"]) if row["official_name"] else (row["raw_ocr_customer"] or ""),
        "customer_id": row["customer_id"] or "",
        "date_folder": row["date_folder"] or "",
        "year": row["derived_year"] or "",
        "destination": row["destination"] or "",
        "reason": _reason_text(row),
        "reason_code": row["reason_code"] or "",
        "match_method": row["match_method"] or "",
    }


def _skipped_result(
    root: Path,
    date_folder: Path,
    reason: str,
    pdf: Path | None = None,
) -> dict:
    source_file = ""
    if pdf is not None:
        try:
            source_file = str(pdf.relative_to(root))
        except ValueError:
            source_file = pdf.name
    return {
        "status": "SKIPPED",
        "source_file": source_file,
        "date_folder": date_folder.name,
        "reason": reason,
        "invoice_number": "",
        "customer": "",
        "year": "",
        "source_pages": "",
    }


def _same_file_contents(left: Path, right: Path) -> bool:
    with Path(left).open("rb") as left_file, Path(right).open("rb") as right_file:
        while True:
            left_chunk = left_file.read(1024 * 1024)
            right_chunk = right_file.read(1024 * 1024)
            if left_chunk != right_chunk:
                return False
            if not left_chunk:
                return True


def execute_document(store: Store, row, output_root: Path):
    if row["state"] not in {"AUTO_MATCHED", "CORRECTED"}:
        return row
    source = Path(row["source_path"])
    if not source.is_file():
        return store.update_state(
            row["document_id"], "FAILED", "FILE_MOVE_ERROR", f"Source missing: {source}",
        )
    official = row["official_name"]
    year = row["derived_year"]
    invoice_no = row["invoice_number"]
    if not official or not year or not invoice_no:
        return store.update_state(
            row["document_id"], "REVIEW_REQUIRED", "DESTINATION_ERROR", "Missing customer, year, or invoice number",
        )
    dest_dir = Path(output_root) / safe_name(official) / str(year)
    dest = dest_dir / f"{safe_name(invoice_no)}.pdf"
    try:
        if dest.exists():
            owner = store.completed_at_destination(str(dest))
            same_source = owner and owner["source_path"] == str(source.resolve())
            if same_source:
                return store.update_state(row["document_id"], "COMPLETED", "", "", destination=str(dest))
            if owner is None:
                if dest.stat().st_size == source.stat().st_size and _same_file_contents(dest, source):
                    return store.update_state(row["document_id"], "COMPLETED", "", "", destination=str(dest))
                return store.update_state(
                    row["document_id"],
                    "REVIEW_REQUIRED",
                    "DUPLICATE_DESTINATION",
                    f"Destination already exists: {dest.name}",
                )
            if owner["customer_id"] != row["customer_id"]:
                return store.update_state(
                    row["document_id"],
                    "REVIEW_REQUIRED",
                    "DUPLICATE_DESTINATION",
                    f"Destination already exists for a different customer: {dest.name}",
                )
            duplicate_base = dest.with_name(f"{dest.stem}__DUPLICATE_{row['document_id']}{dest.suffix}")
            duplicate_dest = duplicate_base
            suffix = 2
            while duplicate_dest.exists():
                duplicate_owner = store.completed_at_destination(str(duplicate_dest))
                if duplicate_dest.stat().st_size == source.stat().st_size and _same_file_contents(duplicate_dest, source):
                    if duplicate_owner is None or duplicate_owner["source_path"] == str(source.resolve()):
                        return store.update_state(
                            row["document_id"], "COMPLETED", "", "", destination=str(duplicate_dest),
                        )
                duplicate_dest = duplicate_base.with_name(
                    f"{duplicate_base.stem}_{suffix}{duplicate_base.suffix}",
                )
                suffix += 1
            shutil.copy2(source, duplicate_dest)
            if (
                not duplicate_dest.is_file()
                or duplicate_dest.stat().st_size != source.stat().st_size
                or not _same_file_contents(duplicate_dest, source)
            ):
                return store.update_state(
                    row["document_id"], "FAILED", "DESTINATION_ERROR", "Duplicate copy failed integrity check",
                )
            return store.update_state(
                row["document_id"], "COMPLETED", "", "", destination=str(duplicate_dest),
            )
        dest_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, dest)
        if (
            not dest.is_file()
            or dest.stat().st_size != source.stat().st_size
            or not _same_file_contents(dest, source)
        ):
            return store.update_state(
                row["document_id"], "FAILED", "DESTINATION_ERROR", "Copied file failed integrity check",
            )
        if not source.is_file():
            return store.update_state(
                row["document_id"], "FAILED", "FILE_MOVE_ERROR", "Source missing after copy",
            )
        return store.update_state(row["document_id"], "COMPLETED", "", "", destination=str(dest))
    except OSError as exc:
        return store.update_state(row["document_id"], "FAILED", "FILE_MOVE_ERROR", str(exc))


def _unit_complete(store: Store, pdfs: list[Path]) -> bool:
    if not pdfs:
        return False
    for pdf in pdfs:
        row = store.get_by_source(str(pdf.resolve()))
        if row is None or row["state"] != "COMPLETED":
            return False
    return True


def _rename_done(path: Path) -> Path:
    if path.name.endswith("_done"):
        return path
    target = path.with_name(path.name + "_done")
    if target.exists():
        return target
    path.rename(target)
    return target


def finalize_date_folder(store: Store, date_folder: Path):
    """Rename source units to _done only when every PDF in them is COMPLETED."""
    if not date_folder.exists() or date_folder.name.endswith("_done"):
        return
    invoice_dir = invoice_child(date_folder)
    if invoice_dir is None or not invoice_dir.exists():
        return
    units = iter_work_units(date_folder)
    if not units:
        return
    for unit in units:
        if unit["kind"] != "subfolder":
            continue
        if _unit_complete(store, unit["pdfs"]):
            try:
                _rename_done(unit["unit"])
            except OSError:
                continue
    if not date_folder.exists():
        return
    invoice_dir = invoice_child(date_folder)
    if invoice_dir is None:
        return
    for child in invoice_dir.iterdir():
        if child.is_dir() and child.name.lower() != "pis" and not child.name.endswith("_done"):
            return
    direct = [
        path for path in invoice_dir.iterdir()
        if path.is_file() and path.suffix.lower() == ".pdf" and not path.name.startswith(".")
    ]
    if direct and not _unit_complete(store, direct):
        return
    if not direct and not any(
        child.is_dir() and child.name.endswith("_done") for child in invoice_dir.iterdir()
    ):
        return
    try:
        _rename_done(date_folder)
    except OSError:
        return


def _write_reports(store: Store, output_root: Path, extra_results: list[dict]):
    results = [result_from_row(row) for row in store.all_documents()]
    results.extend(extra_results)
    output_root.mkdir(parents=True, exist_ok=True)
    write_exception_report(results, output_root / EXCEPTION_REPORT_NAME)
    write_review_csv(store.review_documents(), output_root / REVIEW_CSV_NAME)
    write_customer_list(store.customers(), output_root / CUSTOMER_LIST_NAME)
    write_alias_mapping(output_root / ALIAS_MAPPING_NAME)
    return results


def _persist_payload(store: Store, payload: dict, batch_id: int, output_root: Path, execute: bool) -> dict:
    payload["batch_id"] = batch_id
    row = store.upsert_analysis(payload)
    if execute and row["state"] in {"AUTO_MATCHED", "CORRECTED"}:
        row = execute_document(store, row, output_root)
    return result_from_row(row)


def _run_jobs(jobs, store: Store, customers, aliases, batch_id: int, output_root: Path, progress, execute: bool, blocked=None):
    from concurrent.futures import ThreadPoolExecutor, as_completed

    total = len(jobs)

    def _payload(job):
        date_folder, unit, pdf, root = job
        analyzed = _analyze_pdf(pdf, root, date_folder, unit)
        return _classify(analyzed, customers, aliases, blocked)

    produced = []
    workers = 1 if total <= 1 else min(worker_count(), total)
    if workers == 1:
        for index, job in enumerate(jobs, start=1):
            if progress:
                progress(index - 1, total, job[2].name)
            produced.append(_persist_payload(store, _payload(job), batch_id, output_root, execute))
            if progress:
                progress(index, total, job[2].name)
    else:
        if progress:
            progress(0, total, jobs[0][2].name)
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(_payload, job): job for job in jobs}
            completed = 0
            for future in as_completed(futures):
                job = futures[future]
                produced.append(_persist_payload(store, future.result(), batch_id, output_root, execute))
                completed += 1
                if progress:
                    progress(completed, total, job[2].name)
    return produced


def run_batch(root: Path, output_root: Path, progress=None, execute: bool = True):
    from core.sorter import resolve_input

    root = resolve_input(Path(root))
    output_root = Path(output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    ensure_customer_master_ready()
    store = Store(output_root / "invoice_processor.db")
    try:
        blocked = _apply_master(store)
        customers, aliases = _master(store)
        batch_id = store.start_batch(str(root))
        skipped = []
        jobs = []
        date_folders = find_date_folders(root)
        for date_folder in date_folders:
            units = iter_work_units(date_folder)
            if units is None:
                skipped.append(_skipped_result(
                    root,
                    date_folder,
                    "Invoice folder not found (expected lowercase invoice/ under the scan-date folder)",
                ))
                continue
            if not units:
                skipped.append(_skipped_result(
                    root,
                    date_folder,
                    "No invoice units under invoice/ (folders ending in _done are skipped; rename 01_2022_done back to 01_2022 to re-run)",
                ))
                continue
            for unit in units:
                for pdf in unit["pdfs"]:
                    existing = store.get_by_source(str(pdf.resolve()))
                    if existing and existing["state"] == "COMPLETED":
                        skipped.append(_skipped_result(
                            root,
                            date_folder,
                            "Already processed in this output folder (delete invoice_processor.db or use a new output folder to re-read)",
                            pdf=pdf,
                        ))
                        continue
                    jobs.append((date_folder, unit, pdf, root))
        if not jobs and date_folders and not skipped:
            skipped.append(_skipped_result(
                root,
                date_folders[0],
                "No PDFs queued: invoice subfolders may be renamed with _done, or only PIS folders remain",
            ))
        produced = []
        if jobs:
            produced = _run_jobs(jobs, store, customers, aliases, batch_id, output_root, progress, execute, blocked)
        for date_folder in date_folders:
            finalize_date_folder(store, date_folder)
        _write_reports(store, output_root, skipped)
        results = produced + skipped
        states = [row["state"] for row in store.all_documents()]
        store.finish_batch(
            batch_id,
            len(jobs),
            sum(state == "COMPLETED" for state in states),
            sum(state == "REVIEW_REQUIRED" for state in states),
            sum(state == "FAILED" for state in states),
        )
        return results
    finally:
        store.close()


def run_one(source_pdf: Path, root: Path, output_root: Path):
    """One PDF, used by tests and by the single-file entry point."""
    output_root = Path(output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    root = Path(root)
    source_pdf = Path(source_pdf)
    store = Store(output_root / "invoice_processor.db")
    try:
        blocked = _apply_master(store)
        existing = store.get_by_source(str(source_pdf.resolve()))
        if existing and existing["state"] == "COMPLETED":
            return [result_from_row(existing)]
        date_folder = _date_folder_for_pdf(source_pdf, root)
        unit = _unit_for_pdf(source_pdf, date_folder)
        customers, aliases = _master(store)
        batch_id = store.start_batch(str(root))
        analyzed = _classify(_analyze_pdf(source_pdf, root, date_folder, unit), customers, aliases, blocked)
        analyzed["batch_id"] = batch_id
        row = store.upsert_analysis(analyzed)
        if row["state"] in {"AUTO_MATCHED", "CORRECTED"}:
            row = execute_document(store, row, output_root)
        finalize_date_folder(store, date_folder)
        _write_reports(store, output_root, [])
        return [result_from_row(row)]
    finally:
        store.close()


def _date_folder_for_pdf(pdf: Path, root: Path) -> Path:
    for parent in [pdf, *pdf.parents]:
        if parent == root:
            break
        from core.sorter import is_scan_date_folder
        if is_scan_date_folder(parent):
            return parent
    return pdf.parent.parent if pdf.parent.name.lower() == "invoice" else pdf.parent


def _unit_for_pdf(pdf: Path, date_folder: Path) -> dict:
    invoice_dir = invoice_child(date_folder)
    if invoice_dir is None:
        return {
            "unit": date_folder,
            "pdfs": [pdf],
            "kind": "direct",
            "invoice_folder": "",
        }
    if pdf.parent == invoice_dir:
        return {
            "unit": date_folder,
            "pdfs": [pdf],
            "kind": "direct",
            "invoice_folder": invoice_dir.name,
        }
    unit = pdf.parent
    for parent in pdf.parents:
        if parent.parent == invoice_dir:
            unit = parent
            break
    return {
        "unit": unit,
        "pdfs": [pdf],
        "kind": "subfolder",
        "invoice_folder": unit.name,
    }


def import_corrections(csv_path: Path, output_root: Path):
    """Apply a filled review CSV. Does not OCR the PDFs again."""
    output_root = Path(output_root)
    store = Store(output_root / "invoice_processor.db")
    results = []
    try:
        _apply_master(store)
        touched = []
        for incoming in read_corrections(csv_path):
            document_id = (incoming.get("Document ID") or "").strip()
            if not document_id:
                continue
            correct_id = (incoming.get("Correct Customer ID") or "").strip()
            correct_invoice = (incoming.get("Correct Invoice Number") or "").strip()
            correct_year = (incoming.get("Correct Year") or "").strip()
            if not correct_id and not correct_invoice and not correct_year:
                continue
            row = store.get_by_document_id(document_id)
            if row is None or row["state"] == "COMPLETED":
                continue
            if not correct_id:
                store.update_state(
                    document_id, "REVIEW_REQUIRED", "CUSTOMER_NOT_MATCHED", "Correction is missing Correct Customer ID",
                )
                continue
            customer = store.customer_by_id(correct_id)
            if customer is None:
                store.update_state(
                    document_id, "REVIEW_REQUIRED", "CUSTOMER_NOT_MATCHED", f"Unknown customer id {correct_id}",
                )
                continue
            invoice_no = correct_invoice or row["invoice_number"]
            # Correct Year in the review CSV overrides derived_year from the invoice unit folder.
            year = correct_year or row["derived_year"]
            if not invoice_no:
                store.update_state(
                    document_id, "REVIEW_REQUIRED", "INVOICE_NUMBER_NOT_DETECTED", "Correction has no invoice number",
                )
                continue
            if not (len(year) == 4 and year.isdigit()):
                store.update_state(
                    document_id, "REVIEW_REQUIRED", "SOURCE_YEAR_NOT_DETECTED", "Correction has no valid year",
                )
                continue
            if row["normalized_customer"]:
                store.set_alias(row["raw_ocr_customer"] or row["normalized_customer"], correct_id)
            row = store.update_state(
                document_id,
                "CORRECTED",
                "",
                "",
                customer_id=correct_id,
                official_name=customer["official_name"],
                invoice_number=invoice_no,
                derived_year=year,
                match_method="CORRECTION",
            )
            row = execute_document(store, row, output_root)
            results.append(result_from_row(row))
            if row["date_folder_path"]:
                touched.append(Path(row["date_folder_path"]))
        seen = set()
        for date_folder in touched:
            key = str(date_folder)
            if key in seen:
                continue
            seen.add(key)
            if date_folder.exists():
                finalize_date_folder(store, date_folder)
        write_review_csv(store.review_documents(), output_root / REVIEW_CSV_NAME)
        return results
    finally:
        store.close()
