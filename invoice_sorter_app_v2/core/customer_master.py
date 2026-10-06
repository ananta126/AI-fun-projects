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


def _csv_is_final_alias_schema(fieldnames: list[str] | None) -> bool:
    if not fieldnames:
        return False
    cols = {c.strip() for c in fieldnames if c}
    return "Alias" in cols and "Customer ID" in cols and "Official Customer" not in cols


def _official_name_for_alias_row(
    customer_id: str,
    official_from_row: str,
    official_by_id: dict[str, str],
    final_schema: bool,
) -> str:
    if final_schema:
        if not customer_id or customer_id not in official_by_id:
            return ""
        return official_by_id[customer_id]
    if official_from_row:
        return official_from_row
    if customer_id and customer_id in official_by_id:
        return official_by_id[customer_id]
    return ""


def _aliases_from_csv(
    path: Path,
    official_by_id: dict[str, str] | None = None,
) -> tuple[MasterAlias, ...]:
    import csv

    official_by_id = official_by_id or {}
    aliases: list[MasterAlias] = []
    seen_alias: set[str] = set()
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        final_schema = _csv_is_final_alias_schema(reader.fieldnames)
        for row in reader:
            alias = _clean(row.get("Alias"))
            customer_id = _clean(row.get("Customer ID"))
            official_name = _official_name_for_alias_row(
                customer_id,
                _clean(row.get("Official Customer")),
                official_by_id,
                final_schema,
            )
            norm = normalize_customer(alias)
            if not norm or not customer_id or not official_name or norm in seen_alias:
                continue
            seen_alias.add(norm)
            aliases.append(MasterAlias(customer_id, official_name, alias))
    return tuple(aliases)


def _alias_rows_from_csv(
    path: Path,
    official_by_id: dict[str, str] | None = None,
) -> list[dict]:
    import csv

    official_by_id = official_by_id or {}
    rows = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        final_schema = _csv_is_final_alias_schema(reader.fieldnames)
        for row in reader:
            alias = _clean(row.get("Alias"))
            if not alias:
                continue
            customer_id = _clean(row.get("Customer ID"))
            official_name = _official_name_for_alias_row(
                customer_id,
                _clean(row.get("Official Customer")),
                official_by_id,
                final_schema,
            )
            if not customer_id or not official_name:
                continue
            rows.append({
                "customer_id": customer_id,
                "official_name": official_name,
                "alias": alias,
                "match_score": row.get("Match Score", "") if not final_schema else "",
            })
    return rows


def _xlsx_alias_sheet_is_final(workbook) -> bool:
    if "Alias Master" not in workbook.sheetnames:
        return False
    header = next(
        workbook["Alias Master"].iter_rows(min_row=1, max_row=1, values_only=True),
        None,
    )
    if not header:
        return False
    cols = {_clean(c) for c in header if c is not None and str(c).strip()}
    return "Alias" in cols and "Customer ID" in cols and "Official Customer" not in cols


def _master_alias_from_xlsx_row(
    row: tuple,
    official_by_id: dict[str, str],
    final_schema: bool,
) -> MasterAlias | None:
    if not row:
        return None
    if final_schema:
        if len(row) < 2:
            return None
        alias = _clean(row[0])
        customer_id = _clean(row[1])
        official_name = _official_name_for_alias_row(customer_id, "", official_by_id, True)
    else:
        if len(row) < 3 or not row[2]:
            return None
        customer_id = _clean(row[0])
        official_name = _clean(row[1])
        alias = _clean(row[2])
        if not official_name:
            official_name = _official_name_for_alias_row(customer_id, "", official_by_id, False)
    norm = normalize_customer(alias)
    if not norm or not customer_id or not official_name:
        return None
    return MasterAlias(customer_id, official_name, alias)


def _alias_dict_from_xlsx_row(
    row: tuple,
    official_by_id: dict[str, str],
    final_schema: bool,
) -> dict | None:
    item = _master_alias_from_xlsx_row(row, official_by_id, final_schema)
    if item is None:
        return None
    score = ""
    if not final_schema and len(row) > 3 and row[3] is not None:
        score = row[3]
    return {
        "customer_id": item.customer_id,
        "official_name": item.official_name,
        "alias": item.alias,
        "match_score": score,
    }


def _aliases_from_xlsx_sheet(workbook, official_by_id: dict[str, str]) -> list[MasterAlias]:
    if "Alias Master" not in workbook.sheetnames:
        return []
    final_schema = _xlsx_alias_sheet_is_final(workbook)
    aliases: list[MasterAlias] = []
    seen_alias: set[str] = set()
    for row in workbook["Alias Master"].iter_rows(min_row=2, values_only=True):
        item = _master_alias_from_xlsx_row(row, official_by_id, final_schema)
        if item is None:
            continue
        norm = normalize_customer(item.alias)
        if norm in seen_alias:
            continue
        seen_alias.add(norm)
        aliases.append(item)
    return aliases


def alias_sheet_rows(path: Path | None = None, official_by_id: dict[str, str] | None = None) -> list[dict]:
    """Every approved alias row, in file order, including repeated spellings."""
    csv_path = alias_master_csv_path()
    if csv_path.is_file():
        if official_by_id is None:
            master = load_customer_master(path)
            if master is not None:
                official_by_id = {c.customer_id: c.official_name for c in master.customers}
        return _alias_rows_from_csv(csv_path, official_by_id)
    path = Path(path) if path else master_path()
    if not path.is_file():
        return []
    import openpyxl

    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        final_schema = _xlsx_alias_sheet_is_final(workbook)
        official_by_id = official_by_id or {}
        if not official_by_id:
            for row in workbook["Customer Master"].iter_rows(min_row=2, values_only=True):
                if not row or len(row) < 2 or not row[0] or not row[1]:
                    continue
                official_by_id[_clean(row[0])] = _clean(row[1])
        rows = []
        for row in workbook["Alias Master"].iter_rows(min_row=2, values_only=True):
            parsed = _alias_dict_from_xlsx_row(row, official_by_id, final_schema)
            if parsed:
                rows.append(parsed)
        return rows
    finally:
        workbook.close()


def master_files_status() -> dict[str, bool]:
    """Which customer-master files are present beside the app (for diagnostics)."""
    root = app_root()
    return {
        "app_root": str(root),
        "xlsx": master_path().is_file(),
        "alias_csv_updated": alias_master_csv_path().is_file(),
        "alias_csv_legacy": (root / "customer_alias_mapping.csv").is_file(),
    }


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
            if not row or len(row) < 2 or not row[0] or not row[1]:
                continue
            name = _clean(row[1])
            customer_id = _clean(row[0])
            if not name or not customer_id or name in seen_names:
                continue
            seen_names.add(name)
            customers.append(MasterCustomer(customer_id, name))

        official_by_id = {c.customer_id: c.official_name for c in customers}
        csv_path = alias_master_csv_path()
        if csv_path.is_file():
            aliases = list(_aliases_from_csv(csv_path, official_by_id))
        else:
            aliases = _aliases_from_xlsx_sheet(workbook, official_by_id)

        blocked = set()
        if "Review Required" in workbook.sheetnames:
            for row in workbook["Review Required"].iter_rows(min_row=2, values_only=True):
                if not row or len(row) < 2 or not row[1]:
                    continue
                norm = normalize_customer(_clean(row[1]))
                if norm:
                    blocked.add(norm)
        return CustomerMaster(tuple(customers), tuple(aliases), frozenset(blocked))
    finally:
        workbook.close()
