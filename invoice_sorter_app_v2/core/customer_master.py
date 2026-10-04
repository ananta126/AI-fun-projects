"""Official customers and approved OCR aliases from the mapping workbook.

Customer Master supplies the customer id and the folder spelling.
Alias Master supplies OCR spellings that may be filed automatically.
Review Required lists OCR spellings that must stay in review even when a
shorter approved alias or a fuzzy score would otherwise accept them.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from core.matching import normalize_customer
from core.sorter import app_root


MASTER_FILENAME = "customer_master_alias_mapping.xlsx"
ALIAS_MASTER_CSV_FILENAME = "customer_alias_mapping_updated.csv"


@dataclass(frozen=True)
class MasterCustomer:
    customer_id: str
    official_name: str


@dataclass(frozen=True)
class MasterAlias:
    customer_id: str
    official_name: str
    alias: str


@dataclass(frozen=True)
class CustomerMaster:
    customers: tuple[MasterCustomer, ...]
    aliases: tuple[MasterAlias, ...]
    review_norms: frozenset[str]


def master_path() -> Path:
    return app_root() / MASTER_FILENAME


def alias_master_csv_path() -> Path:
    return app_root() / ALIAS_MASTER_CSV_FILENAME


def _clean(value) -> str:
    return " ".join(str(value or "").replace("\xa0", " ").split()).strip()


def _aliases_from_csv(path: Path) -> tuple[MasterAlias, ...]:
    import csv

    aliases: list[MasterAlias] = []
    seen_alias: set[str] = set()
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            alias = _clean(row.get("Alias"))
            customer_id = _clean(row.get("Customer ID"))
            official_name = _clean(row.get("Official Customer"))
            norm = normalize_customer(alias)
            if not norm or not customer_id or norm in seen_alias:
                continue
            seen_alias.add(norm)
            aliases.append(MasterAlias(customer_id, official_name, alias))
    return tuple(aliases)


def _alias_rows_from_csv(path: Path) -> list[dict]:
    import csv

    rows = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            alias = _clean(row.get("Alias"))
            if not alias:
                continue
            rows.append({
                "customer_id": _clean(row.get("Customer ID")),
                "official_name": _clean(row.get("Official Customer")),
                "alias": alias,
                "match_score": row.get("Match Score", ""),
            })
    return rows


def alias_sheet_rows(path: Path | None = None) -> list[dict]:
    """Every approved alias row, in file order, including repeated spellings."""
    csv_path = alias_master_csv_path()
    if csv_path.is_file():
        return _alias_rows_from_csv(csv_path)
    path = Path(path) if path else master_path()
    if not path.is_file():
        return []
    import openpyxl

    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        rows = []
        for row in workbook["Alias Master"].iter_rows(min_row=2, values_only=True):
            if not row or not row[2]:
                continue
            score = row[3] if len(row) > 3 and row[3] is not None else ""
            rows.append({
                "customer_id": _clean(row[0]),
                "official_name": _clean(row[1]),
                "alias": _clean(row[2]),
                "match_score": score,
            })
        return rows
    finally:
        workbook.close()


def load_customer_master(path: Path | None = None) -> CustomerMaster | None:
    """Return the workbook, or None when it is not next to the app."""
    path = Path(path) if path else master_path()
    if not path.is_file():
        return None
    import openpyxl

    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        customers = []
        seen_names = set()
        for row in workbook["Customer Master"].iter_rows(min_row=2, values_only=True):
            if not row or not row[0] or not row[1]:
                continue
            name = _clean(row[1])
            customer_id = _clean(row[0])
            if not name or not customer_id or name in seen_names:
                continue
            seen_names.add(name)
            customers.append(MasterCustomer(customer_id, name))

        csv_path = alias_master_csv_path()
        if csv_path.is_file():
            aliases = list(_aliases_from_csv(csv_path))
        else:
            aliases = []
            seen_alias = set()
            for row in workbook["Alias Master"].iter_rows(min_row=2, values_only=True):
                if not row or not row[2]:
                    continue
                alias = _clean(row[2])
                norm = normalize_customer(alias)
                customer_id = _clean(row[0])
                official_name = _clean(row[1])
                if not norm or not customer_id or norm in seen_alias:
                    continue
                seen_alias.add(norm)
                aliases.append(MasterAlias(customer_id, official_name, alias))

        blocked = set()
        if "Review Required" in workbook.sheetnames:
            for row in workbook["Review Required"].iter_rows(min_row=2, values_only=True):
                if not row or not row[1]:
                    continue
                norm = normalize_customer(_clean(row[1]))
                if norm:
                    blocked.add(norm)
        return CustomerMaster(tuple(customers), tuple(aliases), frozenset(blocked))
    finally:
        workbook.close()
