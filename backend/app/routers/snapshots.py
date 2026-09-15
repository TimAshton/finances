from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/api/snapshots", tags=["snapshots"])


@router.get("", response_model=list[schemas.SnapshotOut])
def get_snapshots(db: Session = Depends(get_db)):
    return crud.list_snapshots(db)


@router.post("", response_model=schemas.SnapshotOut, status_code=201)
def create_snapshot(db: Session = Depends(get_db)):
    return crud.create_snapshot(db)
