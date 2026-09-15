from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.payoff import SimAccount, simulate_strategy

router = APIRouter(prefix="/api/payoff", tags=["payoff"])


@router.post("/plan", response_model=schemas.PayoffPlanResult)
def payoff_plan(data: schemas.PayoffRequest, db: Session = Depends(get_db)):
    accounts = [a for a in crud.list_accounts(db) if a.balance > 0]
    sim_accounts = [
        SimAccount(
            id=a.id,
            name=a.name,
            balance=a.balance,
            annual_rate=a.interest_rate,
            minimum_payment=a.minimum_payment,
        )
        for a in accounts
    ]

    plan = simulate_strategy(sim_accounts, data.extra_monthly_budget, data.strategy)
    baseline = simulate_strategy(sim_accounts, 0.0, data.strategy)

    return schemas.PayoffPlanResult(
        strategy=data.strategy,
        total_months=plan.total_months,
        total_interest_paid=plan.total_interest_paid,
        baseline_total_interest_paid=baseline.total_interest_paid,
        interest_saved=baseline.total_interest_paid - plan.total_interest_paid,
        accounts=[
            schemas.PayoffAccountResult(
                account_id=r.account_id,
                name=r.name,
                payoff_month=r.payoff_month,
                total_interest_paid=r.total_interest_paid,
                payoff_impossible=r.payoff_impossible,
            )
            for r in plan.accounts
        ],
    )
