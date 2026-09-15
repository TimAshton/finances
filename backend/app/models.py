import uuid
from datetime import UTC, date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    # Identifies which .env block this account was imported from (e.g.
    # "MORTGAGE", "CC1") so re-import can update rather than duplicate.
    # Null for accounts created by hand through the UI.
    source_key: Mapped[str | None] = mapped_column(String, nullable=True, unique=True)
    lender: Mapped[str] = mapped_column(String, default="")
    balance: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    interest_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    credit_limit: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Original purchase price, for property (mortgage-category) accounts.
    purchase_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Current estimated market value (e.g. a Zestimate), for property
    # (mortgage-category) accounts — updated manually/periodically, not on a
    # schedule. balance - market_value gives equity.
    market_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    minimum_payment: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    # How often minimum_payment is actually billed ("monthly", "bimonthly", ...) —
    # see schemas.FREQUENCY_MONTHS for the month-count each value maps to. Needed
    # because bills like water aren't billed every month, so aggregates that treat
    # minimum_payment as a flat monthly figure (Dashboard/Reports totals) must
    # divide by this to get a true monthly-equivalent.
    billing_frequency: Mapped[str] = mapped_column(String, nullable=False, default="monthly")
    due_day: Mapped[int] = mapped_column(Integer, nullable=False)
    # Link to the provider's bill-pay/account page, for quick access from the UI.
    url: Mapped[str] = mapped_column(String, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    payments: Mapped[list["Payment"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    paid_on: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    new_balance: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str] = mapped_column(String, default="")

    account: Mapped["Account"] = relationship(back_populates="payments")


class Snapshot(Base):
    __tablename__ = "snapshots"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    total_debt: Mapped[float] = mapped_column(Float, nullable=False)
    total_monthly_minimums: Mapped[float] = mapped_column(Float, nullable=False)
    net_worth_delta: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
