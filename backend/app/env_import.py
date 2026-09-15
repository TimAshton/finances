"""Parses the fixed-format .env block structure described in SPEC.md into
account dicts keyed by a stable source_key, so Settings -> "Re-import from
.env" can upsert rather than create duplicates on every run.
"""

import os
import re
from dataclasses import dataclass

CC_KEY_RE = re.compile(r"^CC(\d+)_NAME$")
CONSOLIDATION_KEY_RE = re.compile(r"^CONSOLIDATION(\d+)_NAME$")
RENTAL_KEY_RE = re.compile(r"^RENTAL(\d+)_NAME$")


def _float_or_none(raw: str | None) -> float | None:
    if raw is None or raw.strip() == "":
        return None
    # Tolerate values copied from a bank statement/UI, e.g. "$9,503.70".
    return float(raw.strip().replace(",", "").replace("$", ""))


def _int_or_none(raw: str | None) -> int | None:
    if raw is None or raw.strip() == "":
        return None
    return int(raw)


@dataclass
class ParsedAccount:
    source_key: str
    name: str
    category: str
    lender: str
    balance: float
    interest_rate: float
    credit_limit: float | None
    minimum_payment: float
    billing_frequency: str
    due_day: int
    url: str
    purchase_price: float | None = None
    market_value: float | None = None


def _parse_loan_block(prefix: str, source_key: str, category: str, default_name: str) -> ParsedAccount | None:
    balance = _float_or_none(os.getenv(f"{prefix}_BALANCE"))
    due_day = _int_or_none(os.getenv(f"{prefix}_DUE_DAY"))
    if balance is None or due_day is None:
        return None
    return ParsedAccount(
        source_key=source_key,
        name=os.getenv(f"{prefix}_NAME") or os.getenv(f"{prefix}_LENDER") or default_name,
        category=category,
        lender=os.getenv(f"{prefix}_LENDER") or "",
        balance=balance,
        interest_rate=_float_or_none(os.getenv(f"{prefix}_RATE")) or 0.0,
        credit_limit=None,
        minimum_payment=_float_or_none(os.getenv(f"{prefix}_MINIMUM")) or 0.0,
        billing_frequency="monthly",
        due_day=due_day,
        url=os.getenv(f"{prefix}_URL") or "",
        purchase_price=_float_or_none(os.getenv(f"{prefix}_PURCHASE_PRICE")),
        market_value=_float_or_none(os.getenv(f"{prefix}_MARKET_VALUE")),
    )


def _parse_credit_card(index: int) -> ParsedAccount | None:
    prefix = f"CC{index}"
    balance = _float_or_none(os.getenv(f"{prefix}_BALANCE"))
    due_day = _int_or_none(os.getenv(f"{prefix}_DUE_DAY"))
    if balance is None or due_day is None:
        return None
    return ParsedAccount(
        source_key=prefix,
        name=os.getenv(f"{prefix}_NAME") or f"Credit Card {index}",
        category="credit_card",
        lender=os.getenv(f"{prefix}_NAME") or "",
        balance=balance,
        interest_rate=_float_or_none(os.getenv(f"{prefix}_RATE")) or 0.0,
        credit_limit=_float_or_none(os.getenv(f"{prefix}_LIMIT")),
        minimum_payment=_float_or_none(os.getenv(f"{prefix}_MINIMUM")) or 0.0,
        billing_frequency="monthly",
        due_day=due_day,
        url=os.getenv(f"{prefix}_URL") or "",
    )


def _parse_consolidation_loan(index: int) -> ParsedAccount | None:
    prefix = f"CONSOLIDATION{index}"
    balance = _float_or_none(os.getenv(f"{prefix}_BALANCE"))
    due_day = _int_or_none(os.getenv(f"{prefix}_DUE_DAY"))
    if balance is None or due_day is None:
        return None
    return ParsedAccount(
        source_key=prefix,
        name=os.getenv(f"{prefix}_NAME") or f"Consolidation Loan {index}",
        category="consolidation_loan",
        lender=os.getenv(f"{prefix}_NAME") or "",
        balance=balance,
        interest_rate=_float_or_none(os.getenv(f"{prefix}_RATE")) or 0.0,
        credit_limit=None,
        minimum_payment=_float_or_none(os.getenv(f"{prefix}_MINIMUM")) or 0.0,
        billing_frequency="monthly",
        due_day=due_day,
        url=os.getenv(f"{prefix}_URL") or "",
    )


def _parse_rental_property(index: int) -> ParsedAccount | None:
    prefix = f"RENTAL{index}"
    balance = _float_or_none(os.getenv(f"{prefix}_BALANCE"))
    due_day = _int_or_none(os.getenv(f"{prefix}_DUE_DAY"))
    if balance is None or due_day is None:
        return None
    return ParsedAccount(
        source_key=prefix,
        name=os.getenv(f"{prefix}_NAME") or f"Rental Property {index}",
        category="mortgage",
        lender=os.getenv(f"{prefix}_NAME") or "",
        balance=balance,
        interest_rate=_float_or_none(os.getenv(f"{prefix}_RATE")) or 0.0,
        credit_limit=None,
        minimum_payment=_float_or_none(os.getenv(f"{prefix}_MINIMUM")) or 0.0,
        billing_frequency="monthly",
        due_day=due_day,
        url=os.getenv(f"{prefix}_URL") or "",
        purchase_price=_float_or_none(os.getenv(f"{prefix}_PURCHASE_PRICE")),
        market_value=_float_or_none(os.getenv(f"{prefix}_MARKET_VALUE")),
    )


def _parse_recurring_bill(prefix: str, source_key: str, category: str, default_name: str) -> ParsedAccount | None:
    amount = _float_or_none(os.getenv(f"{prefix}_AMOUNT"))
    due_day = _int_or_none(os.getenv(f"{prefix}_DUE_DAY"))
    if amount is None or due_day is None:
        return None
    provider = os.getenv(f"{prefix}_PROVIDER") or ""
    # Optional — most recurring bills are monthly; a bill like water that's
    # billed every other month (and varies in amount) sets e.g. WATER_FREQUENCY=
    # bimonthly. AMOUNT is then treated as a per-bill estimate for planning
    # (Dashboard/Reports divide it down to a monthly-equivalent); log the
    # actual billed amount as a Payment each cycle to capture the real variance.
    frequency = os.getenv(f"{prefix}_FREQUENCY") or "monthly"
    return ParsedAccount(
        source_key=source_key,
        name=provider or default_name,
        category=category,
        lender=provider,
        balance=0.0,
        interest_rate=0.0,
        credit_limit=None,
        minimum_payment=amount,
        billing_frequency=frequency,
        due_day=due_day,
        url=os.getenv(f"{prefix}_URL") or "",
    )


def parse_env_accounts() -> list[ParsedAccount]:
    accounts: list[ParsedAccount] = []

    mortgage = _parse_loan_block("MORTGAGE", "MORTGAGE", "mortgage", "Mortgage")
    if mortgage:
        accounts.append(mortgage)

    rental_indices = sorted(int(m.group(1)) for key in os.environ if (m := RENTAL_KEY_RE.match(key)))
    for index in rental_indices:
        rental = _parse_rental_property(index)
        if rental:
            accounts.append(rental)

    auto = _parse_loan_block("AUTO", "AUTO", "auto", "Auto Loan")
    if auto:
        accounts.append(auto)

    student = _parse_loan_block("STUDENT", "STUDENT", "student_loan", "Student Loan")
    if student:
        accounts.append(student)

    cc_indices = sorted(int(m.group(1)) for key in os.environ if (m := CC_KEY_RE.match(key)))
    for index in cc_indices:
        cc = _parse_credit_card(index)
        if cc:
            accounts.append(cc)

    consolidation_indices = sorted(
        int(m.group(1)) for key in os.environ if (m := CONSOLIDATION_KEY_RE.match(key))
    )
    for index in consolidation_indices:
        consolidation = _parse_consolidation_loan(index)
        if consolidation:
            accounts.append(consolidation)

    electric = _parse_recurring_bill("ELECTRIC", "ELECTRIC", "utility", "Electric")
    if electric:
        accounts.append(electric)

    gas = _parse_recurring_bill("GAS", "GAS", "utility", "Natural Gas")
    if gas:
        accounts.append(gas)

    water = _parse_recurring_bill("WATER", "WATER", "utility", "Water")
    if water:
        accounts.append(water)

    internet = _parse_recurring_bill("INTERNET", "INTERNET", "subscription", "Internet")
    if internet:
        accounts.append(internet)

    insurance = _parse_recurring_bill("INSURANCE", "INSURANCE", "insurance", "Car Insurance")
    if insurance:
        accounts.append(insurance)

    return accounts
