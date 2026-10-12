from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/api/checklist", tags=["checklist"])

MONTH_PATTERN = r"^\d{4}-(0[1-9]|1[0-2])$"


def _require_account(db: Session, account_id: str) -> None:
    if crud.get_account(db, account_id) is None:
        raise HTTPException(status_code=404, detail="Account not found")


@router.get("/{month}", response_model=list[schemas.ChecklistEntryOut])
def get_checklist(month: str = Path(pattern=MONTH_PATTERN), db: Session = Depends(get_db)):
    return crud.list_checklist_entries(db, month)


@router.put("/{month}/{account_id}", response_model=schemas.ChecklistEntryOut)
def mark_paid(account_id: str, month: str = Path(pattern=MONTH_PATTERN), db: Session = Depends(get_db)):
    _require_account(db, account_id)
    return crud.mark_checklist_paid(db, account_id, month)


@router.delete("/{month}/{account_id}", status_code=204)
def unmark_paid(account_id: str, month: str = Path(pattern=MONTH_PATTERN), db: Session = Depends(get_db)):
    _require_account(db, account_id)
    crud.unmark_checklist_paid(db, account_id, month)
