"""Customer identity matching.

Filing uses this order:

1. Exact normalized official name (the official token phrase appears contiguously
   in the billed-to text).
2. Exact approved alias, same contiguous-phrase rule.
3. Fuzzy candidate via difflib, auto only when it is unambiguous.

A longer exact phrase wins over a shorter one, so "SKF India Ltd.Pune" beats an
alias that is only "SKF India" when both phrases are present. Two different
customer ids with the same phrase length are ambiguous and are not filed.

Fuzzy auto-file thresholds (deliberately strict):

- Best ratio >= 0.92. That is a near-exact string after case, punctuation, and
  Pvt/Ltd folding, so typos can pass and different companies do not.
- Gap to the second-best customer >= 0.08. A smaller gap means two customers
  are both plausible (Brighttitis Automobiles vs Brighttitis Industries).
- Both the OCR text and the candidate must be at least two tokens, and the OCR
  text must be at most 8 tokens. A one-token name is exact-only. A long address
  block is not fuzzy-matched, so a shared prefix cannot file the invoice.

Fuzzy hits below 0.92 are suggestions on the review CSV only.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from difflib import SequenceMatcher


_DROP = frozenset({"PVT", "LTD", "LIMITED", "PRIVATE", "LLC", "LLP", "CO", "THE", "AND", "BILLED", "TO"})
_FOLD = {
    "TECHNOLOGIES": "TECH",
    "TECHNOLOGY": "TECH",
    "ENGINEERING": "ENGG",
    "ENGINEERS": "ENGG",
    "MANUFACTURING": "MFG",
}

# See module docstring. Do not lower these without a reviewed sample.
FUZZY_AUTO_RATIO = 0.92
FUZZY_AUTO_GAP = 0.08
FUZZY_MAX_TOKENS = 8
# Below this, the nearest official name is not close enough to show as a suggestion.
# Zenith Quartz vs a random list name scores about 0.42 and must stay blank.
SUGGESTION_MIN_RATIO = 0.80


@dataclass
class CustomerRef:
    customer_id: str
    official_name: str
    normalized_name: str


@dataclass
class AliasRef:
    alias_norm: str
    customer_id: str
    alias_raw: str = ""


@dataclass
class MatchResult:
    accepted: bool
    customer_id: str | None
    official_name: str | None
    method: str
    score: float | None
    second_name: str | None
    second_score: float | None
    second_id: str | None
    reason_code: str | None
    normalized: str


def normalize_customer(name: str) -> str:
    """Fold OCR spelling so exact phrases can match the official list."""
    text = (name or "").upper().replace("&", " AND ")
    text = re.sub(r"\([^)]*\)", " ", text)
    words = []
    for word in re.findall(r"[A-Z0-9]+", text):
        word = _FOLD.get(word, word)
        if word in _DROP or word.isdigit():
            continue
        words.append(word)
    return " ".join(words)


def _contiguous(needle: list[str], hay: list[str]) -> bool:
    if not needle or not hay:
        return False
    # One-token names match only the whole text, never a word inside an address.
    if len(needle) == 1:
        return hay == needle
    width = len(needle)
    if len(hay) < width:
        return False
    for index in range(len(hay) - width + 1):
        if hay[index:index + width] == needle:
            return True
    return False


def _official_name(customers: list[CustomerRef], customer_id: str) -> str:
    for customer in customers:
        if customer.customer_id == customer_id:
            return customer.official_name
    return ""


def match_customer(
    raw_text: str,
    customers: list[CustomerRef],
    aliases: list[AliasRef],
    blocked: frozenset[str] | set[str] | None = None,
) -> MatchResult:
    normalized = normalize_customer(raw_text)
    hay = normalized.split()
    empty = MatchResult(
        False, None, None, "NONE", None, None, None, None, "CUSTOMER_NOT_DETECTED", normalized,
    )
    if not hay:
        return empty
    # Review Required spellings stay unfiled. A shorter approved alias or a
    # high fuzzy score must not override that sheet.
    if blocked and normalized in blocked:
        return MatchResult(
            False, None, None, "REVIEW_LIST", None, None, None, None, "CUSTOMER_NOT_MATCHED", normalized,
        )

    exact: list[tuple[int, str, str, str]] = []
    for customer in customers:
        needle = customer.normalized_name.split()
        if _contiguous(needle, hay):
            exact.append((len(needle), customer.customer_id, customer.official_name, "EXACT_OFFICIAL"))
    by_id = {customer.customer_id: customer for customer in customers}
    for alias in aliases:
        needle = alias.alias_norm.split()
        owner = by_id.get(alias.customer_id)
        if owner is None:
            continue
        if _contiguous(needle, hay):
            exact.append((len(needle), owner.customer_id, owner.official_name, "EXACT_ALIAS"))

    if exact:
        exact.sort(key=lambda item: item[0], reverse=True)
        best_len = exact[0][0]
        top = [item for item in exact if item[0] == best_len]
        ids = {item[1] for item in top}
        if len(ids) > 1:
            # Approved alias beats generic official on another ID at the same phrase length.
            alias_hits = [item for item in top if item[3] == "EXACT_ALIAS"]
            alias_ids = {item[1] for item in alias_hits}
            if len(alias_ids) == 1:
                _length, customer_id, official_name, method = alias_hits[0]
                return MatchResult(
                    True,
                    customer_id,
                    official_name,
                    method,
                    1.0,
                    None,
                    None,
                    None,
                    None,
                    normalized,
                )
            first, second = top[0], top[1]
            return MatchResult(
                False,
                first[1],
                first[2],
                "AMBIGUOUS",
                1.0,
                second[2],
                1.0,
                second[1],
                "CUSTOMER_AMBIGUOUS",
                normalized,
            )
        _length, customer_id, official_name, method = top[0]
        return MatchResult(
            True, customer_id, official_name, method, 1.0, None, None, None, None, normalized,
        )

    # Fuzzy suggestions. Auto only for a short, unambiguous, near-exact candidate.
    if len(hay) > FUZZY_MAX_TOKENS:
        return MatchResult(
            False, None, None, "NONE", None, None, None, None, "CUSTOMER_NOT_MATCHED", normalized,
        )

    scored: dict[str, float] = {}
    for customer in customers:
        if len(customer.normalized_name.split()) < 2:
            continue
        ratio = SequenceMatcher(None, normalized, customer.normalized_name).ratio()
        scored[customer.customer_id] = max(scored.get(customer.customer_id, 0.0), ratio)
    for alias in aliases:
        if len(alias.alias_norm.split()) < 2 or alias.customer_id not in by_id:
            continue
        ratio = SequenceMatcher(None, normalized, alias.alias_norm).ratio()
        scored[alias.customer_id] = max(scored.get(alias.customer_id, 0.0), ratio)

    ranking = sorted(scored.items(), key=lambda item: item[1], reverse=True)
    if not ranking:
        return MatchResult(
            False, None, None, "NONE", None, None, None, None, "CUSTOMER_NOT_MATCHED", normalized,
        )
    best_id, best_score = ranking[0]
    second_id = ranking[1][0] if len(ranking) > 1 else None
    second_score = ranking[1][1] if len(ranking) > 1 else None
    best_name = _official_name(customers, best_id)
    second_name = _official_name(customers, second_id) if second_id else None
    gap = (best_score - second_score) if second_score is not None else 1.0
    accepted = best_score >= FUZZY_AUTO_RATIO and gap >= FUZZY_AUTO_GAP
    if accepted:
        return MatchResult(
            True, best_id, best_name, "FUZZY", best_score, second_name, second_score, second_id, None, normalized,
        )
    reason = "CUSTOMER_AMBIGUOUS" if best_score >= FUZZY_AUTO_RATIO else "CUSTOMER_NOT_MATCHED"
    if best_score < SUGGESTION_MIN_RATIO:
        return MatchResult(
            False, None, None, "NONE", None, None, None, None, "CUSTOMER_NOT_MATCHED", normalized,
        )
    return MatchResult(
        False,
        best_id,
        best_name,
        "AMBIGUOUS" if reason == "CUSTOMER_AMBIGUOUS" else "NONE",
        best_score,
        second_name,
        second_score,
        second_id,
        reason,
        normalized,
    )
