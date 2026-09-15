from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import crud, schemas
from app.config import DATABASE_PATH
from app.database import get_db

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.post("/import-env", response_model=list[schemas.AccountOut])
def import_env(db: Session = Depends(get_db)):
    return crud.import_accounts_from_env(db)


@router.post("/reset", status_code=204)
def reset(db: Session = Depends(get_db)):
    crud.reset_all_data(db)


@router.get("/backup")
def backup():
    return FileResponse(
        path=DATABASE_PATH,
        filename="finance.db",
        media_type="application/octet-stream",
    )
