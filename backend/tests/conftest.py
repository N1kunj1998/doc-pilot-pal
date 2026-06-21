import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app


def _make_session_factory():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def client():
    """A TestClient backed by a fresh in-memory SQLite DB per test.

    StaticPool keeps the same in-memory DB alive across the multiple
    connections FastAPI opens during a test (in-memory SQLite is normally
    per-connection, so without this each `get_db()` call would see an
    empty, disconnected database).
    """
    TestingSessionLocal = _make_session_factory()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def db_session():
    """A raw SQLAlchemy session on a fresh in-memory SQLite DB, for tests
    that exercise model/module code directly rather than through the API.
    """
    TestingSessionLocal = _make_session_factory()
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
