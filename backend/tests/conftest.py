import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app


def _make_session_factory():
    """Builds a fresh, isolated test database per call.

    Defaults to an in-memory SQLite DB (fast, zero setup, used by the
    regular `backend-tests` CI job and local dev). If DATABASE_URL is set
    (only true in the `backend-integration-tests` CI job, pointed at a
    throwaway Postgres service container), connects to that instead, so
    the exact same tests also exercise the real pgvector code path that
    SQLite has no way to reach.
    """
    database_url = os.environ.get("DATABASE_URL")

    if database_url:
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        engine = create_engine(database_url)
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
        # Unlike SQLite's fresh-in-memory-DB-per-call isolation, this
        # engine points at one persistent database shared across every
        # test in the run, so each call must reset the schema itself.
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    else:
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=engine)

    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def client():
    """A TestClient backed by a fresh test DB per test.

    StaticPool keeps the same in-memory SQLite DB alive across the
    multiple connections FastAPI opens during a test (in-memory SQLite is
    normally per-connection, so without this each `get_db()` call would
    see an empty, disconnected database). Not used on the Postgres path,
    where a real persistent connection needs no such workaround.
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
    """A raw SQLAlchemy session on a fresh test DB, for tests that
    exercise model/module code directly rather than through the API.
    """
    TestingSessionLocal = _make_session_factory()
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
