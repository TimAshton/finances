from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import DATABASE_PATH

DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    f"sqlite:///{DATABASE_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def run_migrations() -> None:
    """Additive, idempotent schema patches for columns added after a database
    already exists on disk. Base.metadata.create_all only creates missing
    tables, not missing columns on existing ones — there's no Alembic here
    (single-file local SQLite, no multi-environment deploy to coordinate).
    """
    with engine.connect() as conn:
        cols = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(accounts)")}
        if "billing_frequency" not in cols:
            conn.exec_driver_sql(
                "ALTER TABLE accounts ADD COLUMN billing_frequency VARCHAR NOT NULL DEFAULT 'monthly'"
            )
            conn.commit()
        if "url" not in cols:
            conn.exec_driver_sql("ALTER TABLE accounts ADD COLUMN url VARCHAR NOT NULL DEFAULT ''")
            conn.commit()
        if "purchase_price" not in cols:
            conn.exec_driver_sql("ALTER TABLE accounts ADD COLUMN purchase_price FLOAT")
            conn.commit()
        if "market_value" not in cols:
            conn.exec_driver_sql("ALTER TABLE accounts ADD COLUMN market_value FLOAT")
            conn.commit()


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
