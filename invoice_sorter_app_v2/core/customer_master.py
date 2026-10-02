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


def _clean(value) -> str:
    return " ".join(str(value or "").replace("\xa0", " ").split()).strip()


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
