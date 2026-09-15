from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.payoff import calculate_single_account_payoff

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


def _get_account_or_404(db: Session, account_id: str):
    account = crud.get_account(db, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.get("", response_model=list[schemas.AccountOut])
def get_accounts(include_inactive: bool = False, db: Session = Depends(get_db)):
    return crud.list_accounts(db, include_inactive=include_inactive)


@router.post("", response_model=schemas.AccountOut, status_code=201)
def create_account(data: schemas.AccountCreate, db: Session = Depends(get_db)):
    return crud.create_account(db, data)


@router.get("/{account_id}", response_model=schemas.AccountOut)
def get_account(account_id: str, db: Session = Depends(get_db)):
    return _get_account_or_404(db, account_id)


@router.patch("/{account_id}", response_model=schemas.AccountOut)
def update_account(account_id: str, data: schemas.AccountUpdate, db: Session = Depends(get_db)):
    account = _get_account_or_404(db, account_id)
    return crud.update_account(db, account, data)


@router.delete("/{account_id}", status_code=204)
def deactivate_account(account_id: str, db: Session = Depends(get_db)):
    account = _get_account_or_404(db, account_id)
    crud.deactivate_account(db, account)


@router.get("/{account_id}/payments", response_model=list[schemas.PaymentOut])
def get_payments(account_id: str, db: Session = Depends(get_db)):
    _get_account_or_404(db, account_id)
    return crud.list_payments(db, account_id)


@router.post("/{account_id}/payments", response_model=schemas.PaymentOut, status_code=201)
def create_payment(account_id: str, data: schemas.PaymentCreate, db: Session = Depends(get_db)):
    account = _get_account_or_404(db, account_id)
    return crud.create_payment(db, account, data)


@router.get("/{account_id}/payoff-calculator", response_model=schemas.PayoffScenario)
def payoff_calculator(
    account_id: str,
    payment: float = Query(..., gt=0),
    db: Session = Depends(get_db),
):
    account = _get_account_or_404(db, account_id)
    result = calculate_single_account_payoff(account.balance, account.interest_rate, payment)
    return schemas.PayoffScenario(
        payment=payment,
        months_to_payoff=result.months_to_payoff,
        total_interest=result.total_interest,
        payoff_impossible=result.payoff_impossible,
    )
