import os
import tempfile

_tmp_dir = tempfile.mkdtemp()
os.environ["DATABASE_PATH"] = os.path.join(_tmp_dir, "test.db")

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
def _clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    return TestClient(app)
