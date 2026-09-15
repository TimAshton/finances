from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.env_import import parse_env_accounts


def list_accounts(db: Session, include_inactive: bool = False) -> list[models.Account]:
    stmt = select(models.Account)
    if not include_inactive:
        stmt = stmt.where(models.Account.is_active.is_(True))
    return list(db.scalars(stmt))


def get_account(db: Session, account_id: str) -> models.Account | None:
    return db.get(models.Account, account_id)


def create_account(db: Session, data: schemas.AccountCreate) -> models.Account:
    account = models.Account(**data.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update_account(
    db: Session, account: models.Account, data: schemas.AccountUpdate
) -> models.Account:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return account


def deactivate_account(db: Session, account: models.Account) -> models.Account:
    account.is_active = False
    db.commit()
    db.refresh(account)
    return account


def list_payments(db: Session, account_id: str) -> list[models.Payment]:
    stmt = (
        select(models.Payment)
        .where(models.Payment.account_id == account_id)
        .order_by(models.Payment.paid_on.desc())
    )
    return list(db.scalars(stmt))


def create_payment(
    db: Session, account: models.Account, data: schemas.PaymentCreate
) -> models.Payment:
    new_balance = max(0.0, account.balance - data.amount)
    payment = models.Payment(
        account_id=account.id,
        amount=data.amount,
        paid_on=data.paid_on,
        new_balance=new_balance,
        notes=data.notes,
    )
    account.balance = new_balance
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def list_snapshots(db: Session) -> list[models.Snapshot]:
    stmt = select(models.Snapshot).order_by(models.Snapshot.snapshot_date)
    return list(db.scalars(stmt))


def create_snapshot(db: Session) -> models.Snapshot:
    accounts = list_accounts(db)
    total_debt = sum(a.balance for a in accounts)
    total_minimums = sum(
        a.minimum_payment / schemas.FREQUENCY_MONTHS.get(a.billing_frequency, 1) for a in accounts
    )

    previous = list_snapshots(db)
    delta = 0.0
    if previous:
        delta = previous[-1].total_debt - total_debt

    snapshot = models.Snapshot(
        snapshot_date=date.today(),
        total_debt=total_debt,
        total_monthly_minimums=total_minimums,
        net_worth_delta=delta,
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def import_accounts_from_env(db: Session) -> list[models.Account]:
    parsed = parse_env_accounts()
    result = []
    for entry in parsed:
        existing = db.scalar(
            select(models.Account).where(models.Account.source_key == entry.source_key)
        )
        if existing:
            existing.name = entry.name
            existing.category = entry.category
            existing.lender = entry.lender
            existing.balance = entry.balance
            existing.interest_rate = entry.interest_rate
            existing.credit_limit = entry.credit_limit
            existing.purchase_price = entry.purchase_price
            existing.market_value = entry.market_value
            existing.minimum_payment = entry.minimum_payment
            existing.billing_frequency = entry.billing_frequency
            existing.due_day = entry.due_day
            existing.url = entry.url
            existing.is_active = True
            result.append(existing)
        else:
            account = models.Account(
                source_key=entry.source_key,
                name=entry.name,
                category=entry.category,
                lender=entry.lender,
                balance=entry.balance,
                interest_rate=entry.interest_rate,
                credit_limit=entry.credit_limit,
                purchase_price=entry.purchase_price,
                market_value=entry.market_value,
                minimum_payment=entry.minimum_payment,
                billing_frequency=entry.billing_frequency,
                due_day=entry.due_day,
                url=entry.url,
            )
            db.add(account)
            result.append(account)

    db.commit()
    for account in result:
        db.refresh(account)
    return result


def reset_all_data(db: Session) -> None:
    db.query(models.Payment).delete()
    db.query(models.Snapshot).delete()
    db.query(models.Account).delete()
    db.commit()
