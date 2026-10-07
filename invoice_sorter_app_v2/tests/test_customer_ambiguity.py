"""CUSTOMER_AMBIGUOUS: master pairs and exact-match ties (see internal audit)."""

from __future__ import annotations

import csv
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core.matching import AliasRef, CustomerRef, match_customer, normalize_customer  # noqa: E402


def _master():
    import openpyxl

    wb = openpyxl.load_workbook(ROOT / "customer_master_alias_mapping.xlsx", read_only=True, data_only=True)
    customers = [
        CustomerRef(str(row[0]).strip(), str(row[1]).strip(), normalize_customer(str(row[1])))
        for row in wb["Customer Master"].iter_rows(min_row=2, values_only=True)
        if row and row[0] and row[1]
    ]
    wb.close()
    aliases = []
    with (ROOT / "customer_alias_mapping_updated.csv").open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            alias = row["Alias"].strip()
            aliases.append(AliasRef(normalize_customer(alias), row["Customer ID"].strip(), alias))
    return customers, aliases


@pytest.fixture(name="master")
def master_fixture():
    return _master()


@pytest.mark.parametrize(
    "raw,first_id,second_id,norm",
    [
        ("VENKATESH AUTOMOBILE PVT LTD", "C106", "C130", "VENKATESH AUTOMOBILE"),
        ("PRIME SINTEK PVT LTD", "C073", "C127", "PRIME SINTEK"),
        ("RAPID MACHINING TECHNOLOGIES PVT LTD", "C077", "C128", "RAPID MACHINING TECH"),
    ],
)
def test_dual_official_normalization_stays_ambiguous(raw, first_id, second_id, norm):
    """When two officials share normalized identity and no alias breaks the tie."""
    customers = [
        CustomerRef(first_id, f"Official {first_id}", norm),
        CustomerRef(second_id, f"Official {second_id}", norm),
    ]
    match = match_customer(raw, customers, [], frozenset())
    assert not match.accepted
    assert match.reason_code == "CUSTOMER_AMBIGUOUS"
    assert {match.customer_id, match.second_id} == {first_id, second_id}


def test_divgi_triple_official_collision_ambiguous():
    customers = [
        CustomerRef("C027", "Divgi A", "DIVGI TORQTRANSFER SYSTEMS"),
        CustomerRef("C118", "Divgi B", "DIVGI TORQTRANSFER SYSTEMS"),
        CustomerRef("C124", "Divgi C", "DIVGI TORQTRANSFER SYSTEMS"),
    ]
    match = match_customer("DIVGI TORQTRANSFER SYSTEMS PVT LTD", customers, [], frozenset())
    assert not match.accepted
    assert match.reason_code == "CUSTOMER_AMBIGUOUS"


@pytest.mark.parametrize(
    "raw,winner_id",
    [
        ("SKF INDIA LIMITED", "C088"),
        ("GKN DRIVELINE LTD", "C037"),
        ("VARROC ENGINEERING LTD", "C104"),
        ("GODREJ AND BOYCE MFG CO LTD", "C038"),
        ("SPECIALITY SINTERED PRODUCTS PVT LTD", "C089"),
    ],
)
def test_alias_wins_over_generic_official_at_same_length(master, raw, winner_id):
    customers, aliases = master
    match = match_customer(raw, customers, aliases, frozenset())
    assert match.accepted
    assert match.customer_id == winner_id
    assert match.method in {"EXACT_ALIAS", "EXACT_OFFICIAL"}


def test_gkn_driveline_pune_files_c037(master):
    customers, aliases = master
    match = match_customer("GKN DRIVELINE PUNE", customers, aliases, frozenset())
    assert match.accepted
    assert match.customer_id == "C037"


def test_varroc_pune_files_c104(master):
    customers, aliases = master
    match = match_customer("VARROC ENGINEERING PVT LTD PUNE", customers, aliases, frozenset())
    assert match.accepted
    assert match.customer_id == "C104"
