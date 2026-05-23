"""
Pytest configuration for scripts/tests.

Requires:
  - Local Docker SQL Server running (docker compose up sqlserver)
  - SA_PASSWORD in .env at project root
  - pyodbc installed
  - ODBC Driver 18 for SQL Server
"""

import uuid
from datetime import datetime, timezone, date
from pathlib import Path

import pytest
import pyodbc

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SCRIPTS_DIR.parent
ENV_PATH = PROJECT_ROOT / ".env"
LOCAL_SERVER = "tcp:127.0.0.1,1434"
LOCAL_DATABASE = "LangTeach"


def get_sa_password():
    if not ENV_PATH.exists():
        raise RuntimeError(f".env not found at {ENV_PATH}")
    for line in ENV_PATH.read_text().splitlines():
        if line.startswith("SA_PASSWORD="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("SA_PASSWORD not found in .env")


def make_connection():
    pw = get_sa_password()
    conn_str = (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={LOCAL_SERVER};"
        f"DATABASE={LOCAL_DATABASE};"
        f"UID=sa;"
        f"PWD={pw};"
        f"TrustServerCertificate=yes;"
    )
    conn = pyodbc.connect(conn_str)
    conn.autocommit = False
    return conn


@pytest.fixture(scope="session")
def db_conn():
    conn = make_connection()
    yield conn
    conn.close()


@pytest.fixture
def test_teacher_id(db_conn):
    """Insert a temporary teacher row; delete after test."""
    teacher_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    cur = db_conn.cursor()
    cur.execute(
        """
        INSERT INTO Teachers (Id, Email, DisplayName, Auth0UserId, CreatedAt, UpdatedAt,
                              HasCompletedOnboarding, IsApproved, SubscriptionTier)
        VALUES (?, ?, ?, ?, ?, ?, 0, 1, 0)
        """,
        teacher_id,
        f"test-{teacher_id[:8]}@test.local",
        "Test Teacher",
        f"auth0|{teacher_id[:8]}",
        now,
        now,
    )
    db_conn.commit()
    yield teacher_id
    # Delete in FK-safe order: dependents first, then teacher
    cur.execute("DELETE FROM TeacherFollowups WHERE TeacherId = ?", teacher_id)
    cur.execute("DELETE FROM SessionLogs WHERE TeacherId = ?", teacher_id)
    cur.execute("DELETE FROM StudentGroups WHERE GroupId IN (SELECT Id FROM Groups WHERE TeacherId = ?)", teacher_id)
    cur.execute("DELETE FROM Groups WHERE TeacherId = ?", teacher_id)
    cur.execute("DELETE FROM Students WHERE TeacherId = ?", teacher_id)
    cur.execute("DELETE FROM Teachers WHERE Id = ?", teacher_id)
    db_conn.commit()
