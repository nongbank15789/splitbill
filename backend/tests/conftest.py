from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.config import settings

BACKEND_DIR = Path(__file__).resolve().parent.parent

if not settings.test_database_url:
    raise RuntimeError("Set TEST_DATABASE_URL in backend/.env")
if not settings.test_database_url.rsplit("/", 1)[-1].endswith("_test"):
    raise RuntimeError("TEST_DATABASE_URL must point to a database ending in _test")

# Point the whole app at the test database BEFORE app.database creates its engine.
settings.database_url = settings.test_database_url

from app.database import engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def migrated_db():
    """Rebuild the test database from the real Alembic migrations."""
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    command.upgrade(cfg, "head")


@pytest.fixture
def client(migrated_db):
    """A test client with an empty expense table (users and groups stay seeded)."""
    with engine.begin() as conn:
        conn.execute(
            text("TRUNCATE expense_shares, expenses RESTART IDENTITY CASCADE")
        )
    return TestClient(app)