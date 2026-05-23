"""
Pytest configuration for scripts/tests.

Requires:
  - Local Docker SQL Server running (docker compose up sqlserver)
  - SA_PASSWORD in .env at project root
  - pyodbc installed
  - ODBC Driver 18 for SQL Server
"""

import sys
import uuid
from datetime import datetime, timezone, date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from db_utils import connect_local


@pytest.fixture(scope="session")
def db_conn():
    conn = connect_local()
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
