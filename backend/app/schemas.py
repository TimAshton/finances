from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class Category(str, Enum):
    credit_card = "credit_card"
    mortgage = "mortgage"
    rental_property = "rental_property"
    auto = "auto"
    student_loan = "student_loan"
    consolidation_loan = "consolidation_loan"
    insurance = "insurance"
    utility = "utility"
    subscription = "subscription"
    other = "other"


class BillingFrequency(str, Enum):
    monthly = "monthly"
    bimonthly = "bimonthly"


# Number of calendar months each billing_frequency covers. Used to convert a
# per-bill minimum_payment into a monthly-equivalent figure for aggregates
# (Dashboard/Reports totals) that assume "monthly" — e.g. a $90 bimonthly
# water bill contributes $45/month, not $90/month.
FREQUENCY_MONTHS: dict[str, int] = {
    BillingFrequency.monthly: 1,
    BillingFrequency.bimonthly: 2,
}


class AccountBase(BaseModel):
    name: str
    category: Category
    lender: str = ""
    balance: float = 0.0
    interest_rate: float = 0.0
    credit_limit: float | None = None
    purchase_price: float | None = None
    market_value: float | None = None
    minimum_payment: float = 0.0
    billing_frequency: BillingFrequency = BillingFrequency.monthly
    due_day: int = Field(ge=1, le=31)
    url: str = ""
    notes: str = ""


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: str | None = None
    category: Category | None = None
    lender: str | None = None
    balance: float | None = None
    interest_rate: float | None = None
    credit_limit: float | None = None
    purchase_price: float | None = None
    market_value: float | None = None
    minimum_payment: float | None = None
    billing_frequency: BillingFrequency | None = None
    due_day: int | None = Field(default=None, ge=1, le=31)
    url: str | None = None
    is_active: bool | None = None
    notes: str | None = None


class AccountOut(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PaymentCreate(BaseModel):
    amount: float
    paid_on: date = Field(default_factory=date.today)
    notes: str = ""


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    account_id: str
    amount: float
    paid_on: date
    new_balance: float
    notes: str


class SnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    snapshot_date: date
    total_debt: float
    total_monthly_minimums: float
    net_worth_delta: float


class PayoffScenario(BaseModel):
    payment: float
    months_to_payoff: float | None
    total_interest: float | None
    payoff_impossible: bool = False


class PayoffRequest(BaseModel):
    extra_monthly_budget: float = 0.0
    strategy: str = Field(pattern="^(avalanche|snowball)$", default="avalanche")


class PayoffAccountResult(BaseModel):
    account_id: str
    name: str
    payoff_month: int | None
    total_interest_paid: float
    payoff_impossible: bool = False


class PayoffPlanResult(BaseModel):
    strategy: str
    total_months: int
    total_interest_paid: float
    baseline_total_interest_paid: float
    interest_saved: float
    accounts: list[PayoffAccountResult]
