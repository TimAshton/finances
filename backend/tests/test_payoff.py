import pytest

from app.payoff import SimAccount, calculate_single_account_payoff, simulate_strategy


class TestCalculateSingleAccountPayoff:
    def test_zero_interest_rate(self):
        result = calculate_single_account_payoff(balance=1200, annual_rate=0.0, payment=100)
        assert result.months_to_payoff == pytest.approx(12.0)
        assert result.total_interest == pytest.approx(0.0)
        assert result.payoff_impossible is False

    def test_known_amortization(self):
        # balance=$1000, 12% APR, $100/month — hand-verified via the formula.
        result = calculate_single_account_payoff(balance=1000, annual_rate=0.12, payment=100)
        assert result.months_to_payoff == pytest.approx(10.588644, abs=1e-5)
        assert result.total_interest == pytest.approx(58.864446, abs=1e-5)
        assert result.payoff_impossible is False

    def test_payment_too_low_is_impossible(self):
        # monthly interest = 1000 * (0.24/12) = 20, payment of 15 never reduces principal
        result = calculate_single_account_payoff(balance=1000, annual_rate=0.24, payment=15)
        assert result.payoff_impossible is True
        assert result.months_to_payoff is None
        assert result.total_interest is None

    def test_zero_balance_is_already_paid_off(self):
        result = calculate_single_account_payoff(balance=0, annual_rate=0.2, payment=50)
        assert result.months_to_payoff == 0.0
        assert result.total_interest == 0.0
        assert result.payoff_impossible is False

    def test_zero_or_negative_payment_is_impossible(self):
        result = calculate_single_account_payoff(balance=500, annual_rate=0.1, payment=0)
        assert result.payoff_impossible is True

    def test_higher_extra_payment_reduces_interest_and_time(self):
        low = calculate_single_account_payoff(balance=5000, annual_rate=0.18, payment=150)
        high = calculate_single_account_payoff(balance=5000, annual_rate=0.18, payment=300)
        assert high.months_to_payoff < low.months_to_payoff
        assert high.total_interest < low.total_interest


class TestSimulateStrategy:
    def test_single_account_zero_interest(self):
        accounts = [SimAccount(id="a", name="A", balance=1200, annual_rate=0.0, minimum_payment=100)]
        result = simulate_strategy(accounts, extra_monthly_budget=0, strategy="avalanche")
        assert result.total_months == 12
        assert result.total_interest_paid == pytest.approx(0.0)
        assert result.accounts[0].payoff_month == 12
        assert result.accounts[0].payoff_impossible is False

    def test_avalanche_prioritizes_highest_rate(self):
        accounts = [
            SimAccount(id="a", name="HighRate", balance=1000, annual_rate=0.24, minimum_payment=20),
            SimAccount(id="b", name="LowRate", balance=200, annual_rate=0.05, minimum_payment=20),
        ]
        result = simulate_strategy(accounts, extra_monthly_budget=100, strategy="avalanche")
        by_id = {r.account_id: r for r in result.accounts}
        # High-rate account gets all the extra budget first, despite starting
        # with a larger balance, so it should NOT finish after the low-rate one.
        assert by_id["a"].payoff_month <= by_id["b"].payoff_month

    def test_snowball_prioritizes_smallest_balance(self):
        accounts = [
            SimAccount(id="a", name="HighRate", balance=1000, annual_rate=0.24, minimum_payment=20),
            SimAccount(id="b", name="LowRate", balance=200, annual_rate=0.05, minimum_payment=20),
        ]
        result = simulate_strategy(accounts, extra_monthly_budget=100, strategy="snowball")
        by_id = {r.account_id: r for r in result.accounts}
        # Smallest balance gets the extra budget first under snowball.
        assert by_id["b"].payoff_month < by_id["a"].payoff_month

    def test_strategy_choice_changes_which_account_finishes_first(self):
        accounts = [
            SimAccount(id="a", name="HighRate", balance=1000, annual_rate=0.24, minimum_payment=20),
            SimAccount(id="b", name="LowRate", balance=200, annual_rate=0.05, minimum_payment=20),
        ]
        avalanche = simulate_strategy(accounts, extra_monthly_budget=100, strategy="avalanche")
        snowball = simulate_strategy(accounts, extra_monthly_budget=100, strategy="snowball")
        avalanche_b = next(r for r in avalanche.accounts if r.account_id == "b").payoff_month
        snowball_b = next(r for r in snowball.accounts if r.account_id == "b").payoff_month
        # B (low balance, low rate) gets deprioritized under avalanche relative to snowball.
        assert snowball_b < avalanche_b

    def test_extra_budget_reduces_total_interest(self):
        accounts = [
            SimAccount(id="a", name="A", balance=3000, annual_rate=0.2, minimum_payment=60),
        ]
        baseline = simulate_strategy(accounts, extra_monthly_budget=0, strategy="avalanche")
        with_extra = simulate_strategy(accounts, extra_monthly_budget=200, strategy="avalanche")
        assert with_extra.total_interest_paid < baseline.total_interest_paid
        assert with_extra.total_months < baseline.total_months

    def test_payment_below_interest_is_flagged_impossible(self):
        accounts = [SimAccount(id="a", name="A", balance=1000, annual_rate=0.24, minimum_payment=5)]
        result = simulate_strategy(accounts, extra_monthly_budget=0, strategy="avalanche", max_months=24)
        assert result.accounts[0].payoff_impossible is True

    def test_empty_accounts_list(self):
        result = simulate_strategy([], extra_monthly_budget=100, strategy="avalanche")
        assert result.total_months == 0
        assert result.total_interest_paid == 0.0
        assert result.accounts == []
