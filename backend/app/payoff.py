"""Debt payoff math: single-account amortization and multi-account
avalanche/snowball simulation. Pure functions — no DB or FastAPI imports —
so they can be unit tested in isolation and reused by both the per-account
payoff calculator and the cross-account payoff planner.
"""

import math
from dataclasses import dataclass, field

MAX_SIMULATION_MONTHS = 600


@dataclass
class SingleAccountPayoff:
    months_to_payoff: float | None
    total_interest: float | None
    payoff_impossible: bool


def calculate_single_account_payoff(
    balance: float, annual_rate: float, payment: float
) -> SingleAccountPayoff:
    """Closed-form months-to-payoff and total interest for a fixed payment.

    months_to_payoff = -log(1 - (rate/12 * balance) / payment) / log(1 + rate/12)
    total_interest = (payment * months_to_payoff) - balance
    """
    if balance <= 0:
        return SingleAccountPayoff(0.0, 0.0, False)
    if payment <= 0:
        return SingleAccountPayoff(None, None, True)

    monthly_rate = annual_rate / 12
    if monthly_rate == 0:
        months = balance / payment
        return SingleAccountPayoff(months, 0.0, False)

    monthly_interest = balance * monthly_rate
    if payment <= monthly_interest:
        # Payment doesn't even cover accruing interest — balance never shrinks.
        return SingleAccountPayoff(None, None, True)

    months = -math.log(1 - monthly_interest / payment) / math.log(1 + monthly_rate)
    total_interest = payment * months - balance
    return SingleAccountPayoff(months, total_interest, False)


@dataclass
class SimAccount:
    id: str
    name: str
    balance: float
    annual_rate: float
    minimum_payment: float


@dataclass
class AccountSimResult:
    account_id: str
    name: str
    payoff_month: int | None
    total_interest_paid: float
    payoff_impossible: bool = False


@dataclass
class PlanSimResult:
    total_months: int
    total_interest_paid: float
    accounts: list[AccountSimResult] = field(default_factory=list)


def _order_for_strategy(accounts: list[SimAccount], strategy: str) -> list[SimAccount]:
    if strategy == "avalanche":
        return sorted(accounts, key=lambda a: (-a.annual_rate, a.id))
    if strategy == "snowball":
        return sorted(accounts, key=lambda a: (a.balance, a.id))
    raise ValueError(f"Unknown strategy: {strategy}")


def simulate_strategy(
    accounts: list[SimAccount],
    extra_monthly_budget: float,
    strategy: str,
    max_months: int = MAX_SIMULATION_MONTHS,
) -> PlanSimResult:
    """Month-by-month simulation of paying down all accounts.

    Every month: minimums are paid on all still-open accounts, then any
    leftover budget (the extra budget plus the minimums freed up by
    already-paid-off accounts) is funneled to the highest-priority open
    account for the chosen strategy, cascading to the next once it hits zero.
    """
    if not accounts:
        return PlanSimResult(total_months=0, total_interest_paid=0.0, accounts=[])

    order = _order_for_strategy(accounts, strategy)
    minimums = {a.id: a.minimum_payment for a in accounts}
    rates = {a.id: a.annual_rate for a in accounts}
    balances = {a.id: a.balance for a in accounts}
    interest_paid = {a.id: 0.0 for a in accounts}
    payoff_month: dict[str, int | None] = {a.id: None for a in accounts}

    for a in accounts:
        if a.balance <= 0:
            payoff_month[a.id] = 0

    month = 0
    active_ids = [a.id for a in accounts if balances[a.id] > 0]
    while active_ids and month < max_months:
        month += 1

        for aid in active_ids:
            interest = balances[aid] * (rates[aid] / 12)
            balances[aid] += interest
            interest_paid[aid] += interest

        budget_pool = extra_monthly_budget
        for a in accounts:
            if a.id not in active_ids:
                budget_pool += minimums[a.id]

        for aid in active_ids:
            pay = min(minimums[aid], balances[aid])
            balances[aid] -= pay
            if balances[aid] <= 1e-9:
                balances[aid] = 0.0

        for a in order:
            if budget_pool <= 0:
                break
            if balances[a.id] <= 0:
                continue
            pay = min(budget_pool, balances[a.id])
            balances[a.id] -= pay
            budget_pool -= pay
            if balances[a.id] <= 1e-9:
                balances[a.id] = 0.0

        for aid in active_ids:
            if balances[aid] <= 0 and payoff_month[aid] is None:
                payoff_month[aid] = month

        active_ids = [aid for aid in balances if balances[aid] > 0]

    results = []
    any_impossible = False
    for a in accounts:
        impossible = balances[a.id] > 0
        any_impossible = any_impossible or impossible
        results.append(
            AccountSimResult(
                account_id=a.id,
                name=a.name,
                payoff_month=payoff_month[a.id],
                total_interest_paid=interest_paid[a.id],
                payoff_impossible=impossible,
            )
        )

    total_months = max((m for m in payoff_month.values() if m is not None), default=0)
    if any_impossible:
        total_months = max_months

    return PlanSimResult(
        total_months=total_months,
        total_interest_paid=sum(interest_paid.values()),
        accounts=results,
    )
