"""Local SQLite state for incremental invoice processing.

The database file is invoice_processor.db inside the output folder so the next
day's batch reuses the same customer ids when the same output folder is chosen.
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from core.matching import normalize_customer


SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    official_name TEXT NOT NULL UNIQUE,
    normalized_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_aliases (
    alias_norm TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    alias_raw TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS processing_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_root TEXT NOT NULL,
    created_at TEXT NOT NULL,
    total_count INTEGER NOT NULL DEFAULT 0,
    auto_count INTEGER NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL UNIQUE,
    batch_id INTEGER,
    source_path TEXT NOT NULL UNIQUE,
    source_rel TEXT NOT NULL DEFAULT '',
    source_name TEXT NOT NULL DEFAULT '',
    date_folder TEXT NOT NULL DEFAULT '',
    date_folder_path TEXT NOT NULL DEFAULT '',
    unit_path TEXT NOT NULL DEFAULT '',
    unit_kind TEXT NOT NULL DEFAULT '',
    source_invoice_folder TEXT NOT NULL DEFAULT '',
    raw_ocr_customer TEXT NOT NULL DEFAULT '',
    normalized_customer TEXT NOT NULL DEFAULT '',
    invoice_number TEXT NOT NULL DEFAULT '',
    derived_year TEXT NOT NULL DEFAULT '',
    customer_id TEXT NOT NULL DEFAULT '',
    official_name TEXT NOT NULL DEFAULT '',
    match_method TEXT NOT NULL DEFAULT '',
    match_score REAL,
    second_name TEXT NOT NULL DEFAULT '',
    second_score REAL,
    state TEXT NOT NULL,
    reason_code TEXT NOT NULL DEFAULT '',
    reason_detail TEXT NOT NULL DEFAULT '',
    destination TEXT NOT NULL DEFAULT '',
    page_count INTEGER NOT NULL DEFAULT 0,
    ocr_text TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS processing_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL,
    reason_code TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL,
    event TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


class Store:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)

    def close(self):
        self.conn.close()

    def seed(self, official_names: list[str]):
        for name in official_names:
            self.add_customer(name)
        self.conn.commit()

    def add_customer(self, official_name: str) -> sqlite3.Row:
        official_name = " ".join((official_name or "").split())
        existing = self.conn.execute(
            "SELECT * FROM customers WHERE official_name = ?",
            (official_name,),
        ).fetchone()
        if existing:
            return existing
        row = self.conn.execute(
            "SELECT customer_id FROM customers ORDER BY customer_id DESC LIMIT 1",
        ).fetchone()
        if row is None:
            customer_id = "C001"
        else:
            customer_id = f"C{int(row['customer_id'][1:]) + 1:03d}"
        self.conn.execute(
            "INSERT INTO customers (customer_id, official_name, normalized_name) VALUES (?, ?, ?)",
            (customer_id, official_name, normalize_customer(official_name)),
        )
        self.conn.commit()
        return self.customer_by_id(customer_id)

    def customer_by_id(self, customer_id: str):
        return self.conn.execute(
            "SELECT * FROM customers WHERE customer_id = ?",
            (customer_id,),
        ).fetchone()

    def customer_by_name(self, official_name: str):
        return self.conn.execute(
            "SELECT * FROM customers WHERE official_name = ?",
            (official_name,),
        ).fetchone()

    def customers(self) -> list[sqlite3.Row]:
        return list(self.conn.execute(
            "SELECT * FROM customers ORDER BY customer_id",
        ))

    def aliases(self) -> list[sqlite3.Row]:
        return list(self.conn.execute("SELECT * FROM customer_aliases"))

    def set_alias(self, alias_raw: str, customer_id: str):
        alias_norm = normalize_customer(alias_raw)
        if not alias_norm:
            return
        if self.customer_by_id(customer_id) is None:
            raise ValueError(f"Unknown customer id {customer_id}")
        self.conn.execute(
            """
            INSERT INTO customer_aliases (alias_norm, customer_id, alias_raw)
            VALUES (?, ?, ?)
            ON CONFLICT(alias_norm) DO UPDATE SET
                customer_id = excluded.customer_id,
                alias_raw = excluded.alias_raw
            """,
            (alias_norm, customer_id, alias_raw.strip()),
        )
        self.conn.commit()

    def start_batch(self, source_root: str) -> int:
        cur = self.conn.execute(
            "INSERT INTO processing_batches (source_root, created_at) VALUES (?, ?)",
            (source_root, _now()),
        )
        self.conn.commit()
        return int(cur.lastrowid)

    def finish_batch(self, batch_id: int, total: int, auto_count: int, review_count: int, failed_count: int):
        self.conn.execute(
            """
            UPDATE processing_batches
            SET total_count = ?, auto_count = ?, review_count = ?, failed_count = ?
            WHERE id = ?
            """,
            (total, auto_count, review_count, failed_count, batch_id),
        )
        self.conn.commit()

    def get_by_source(self, source_path: str):
        return self.conn.execute(
            "SELECT * FROM documents WHERE source_path = ?",
            (source_path,),
        ).fetchone()

    def get_by_document_id(self, document_id: str):
        return self.conn.execute(
            "SELECT * FROM documents WHERE document_id = ?",
            (document_id,),
        ).fetchone()

    def completed_at_destination(self, destination: str):
        return self.conn.execute(
            "SELECT * FROM documents WHERE destination = ? AND state = 'COMPLETED' LIMIT 1",
            (destination,),
        ).fetchone()

    def _next_document_id(self) -> str:
        row = self.conn.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM documents").fetchone()
        return f"DOC-{int(row['next_id']):06d}"

    def upsert_analysis(self, fields: dict) -> sqlite3.Row:
        existing = self.get_by_source(fields["source_path"])
        if existing and existing["state"] == "COMPLETED":
            return existing
        now = _now()
        if existing:
            document_id = existing["document_id"]
            self.conn.execute(
                """
                UPDATE documents SET
                    batch_id = ?, source_rel = ?, source_name = ?, date_folder = ?,
                    date_folder_path = ?, unit_path = ?, unit_kind = ?,
                    source_invoice_folder = ?, raw_ocr_customer = ?, normalized_customer = ?,
                    invoice_number = ?, derived_year = ?, customer_id = ?, official_name = ?,
                    match_method = ?, match_score = ?, second_name = ?, second_score = ?,
                    state = ?, reason_code = ?, reason_detail = ?, destination = '',
                    page_count = ?, ocr_text = ?, updated_at = ?
                WHERE document_id = ?
                """,
                (
                    fields.get("batch_id"),
                    fields.get("source_rel", ""),
                    fields.get("source_name", ""),
                    fields.get("date_folder", ""),
                    fields.get("date_folder_path", ""),
                    fields.get("unit_path", ""),
                    fields.get("unit_kind", ""),
                    fields.get("source_invoice_folder", ""),
                    fields.get("raw_ocr_customer", ""),
                    fields.get("normalized_customer", ""),
                    fields.get("invoice_number", ""),
                    fields.get("derived_year", ""),
                    fields.get("customer_id", ""),
                    fields.get("official_name", ""),
                    fields.get("match_method", ""),
                    fields.get("match_score"),
                    fields.get("second_name", ""),
                    fields.get("second_score"),
                    fields["state"],
                    fields.get("reason_code", ""),
                    fields.get("reason_detail", ""),
                    fields.get("page_count", 0),
                    fields.get("ocr_text", ""),
                    now,
                    document_id,
                ),
            )
        else:
            document_id = self._next_document_id()
            self.conn.execute(
                """
                INSERT INTO documents (
                    document_id, batch_id, source_path, source_rel, source_name,
                    date_folder, date_folder_path, unit_path, unit_kind, source_invoice_folder,
                    raw_ocr_customer, normalized_customer, invoice_number, derived_year,
                    customer_id, official_name, match_method, match_score, second_name,
                    second_score, state, reason_code, reason_detail, destination,
                    page_count, ocr_text, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, '',
                    ?, ?, ?
                )
                """,
                (
                    document_id,
                    fields.get("batch_id"),
                    fields["source_path"],
                    fields.get("source_rel", ""),
                    fields.get("source_name", ""),
                    fields.get("date_folder", ""),
                    fields.get("date_folder_path", ""),
                    fields.get("unit_path", ""),
                    fields.get("unit_kind", ""),
                    fields.get("source_invoice_folder", ""),
                    fields.get("raw_ocr_customer", ""),
                    fields.get("normalized_customer", ""),
                    fields.get("invoice_number", ""),
                    fields.get("derived_year", ""),
                    fields.get("customer_id", ""),
                    fields.get("official_name", ""),
                    fields.get("match_method", ""),
                    fields.get("match_score"),
                    fields.get("second_name", ""),
                    fields.get("second_score"),
                    fields["state"],
                    fields.get("reason_code", ""),
                    fields.get("reason_detail", ""),
                    fields.get("page_count", 0),
                    fields.get("ocr_text", ""),
                    now,
                ),
            )
        self._audit(document_id, fields["state"], fields.get("reason_code", ""))
        if fields.get("reason_code"):
            self._error(document_id, fields["reason_code"], fields.get("reason_detail", ""))
        self.conn.commit()
        return self.get_by_document_id(document_id)

    def update_state(self, document_id: str, state: str, reason_code: str = "", reason_detail: str = "", **extra) -> sqlite3.Row:
        assignments = ["state = ?", "reason_code = ?", "reason_detail = ?", "updated_at = ?"]
        values: list = [state, reason_code, reason_detail, _now()]
        for key, value in extra.items():
            assignments.append(f"{key} = ?")
            values.append(value)
        values.append(document_id)
        self.conn.execute(
            f"UPDATE documents SET {', '.join(assignments)} WHERE document_id = ?",
            values,
        )
        self._audit(document_id, state, reason_code or reason_detail)
        if reason_code:
            self._error(document_id, reason_code, reason_detail)
        self.conn.commit()
        return self.get_by_document_id(document_id)

    def _audit(self, document_id: str, event: str, detail: str):
        self.conn.execute(
            "INSERT INTO audit_events (document_id, event, detail, created_at) VALUES (?, ?, ?, ?)",
            (document_id, event, detail or "", _now()),
        )

    def _error(self, document_id: str, reason_code: str, detail: str):
        self.conn.execute(
            "INSERT INTO processing_errors (document_id, reason_code, detail, created_at) VALUES (?, ?, ?, ?)",
            (document_id, reason_code, detail or "", _now()),
        )

    def review_documents(self) -> list[sqlite3.Row]:
        return list(self.conn.execute(
            """
            SELECT * FROM documents
            WHERE state IN ('REVIEW_REQUIRED', 'FAILED', 'CORRECTED')
            ORDER BY document_id
            """
        ))

    def all_documents(self) -> list[sqlite3.Row]:
        return list(self.conn.execute("SELECT * FROM documents ORDER BY document_id"))
