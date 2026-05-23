"""
Integration tests for migrate-fake-groups.py.

Requirements:
  - Local Docker SQL running (docker compose up sqlserver)
  - SA_PASSWORD in .env
  - pyodbc, pytest installed

Run:
  cd <project-root>
  pytest scripts/tests/test_migrate_fake_groups.py -v
"""

import json
import subprocess
import sys
import uuid
from datetime import datetime, timezone, date
from pathlib import Path

import pytest
import pyodbc

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
MIGRATION_SCRIPT = SCRIPTS_DIR / "migrate-fake-groups.py"
ALLOWLIST_PATH = SCRIPTS_DIR / "fake-groups-allowlist.json"


def insert_fake_student(cursor, conn, teacher_id, name, cefr):
    student_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    cursor.execute(
        """
        INSERT INTO Students (Id, TeacherId, Name, LearningLanguage, CefrLevel,
                              Interests, NativeLanguages, LearningGoals, Weaknesses,
                              Difficulties, SkillLevelOverrides, ShortTermObjectives,
                              SpokenLanguages, IsActive, IsCorporate, IsDeleted,
                              CreatedAt, UpdatedAt)
        VALUES (?, ?, ?, 'Spanish', ?,
                '[]', '[]', '[]', '[]',
                '[]', '{}', '[]',
                '[]', 1, 0, 0,
                ?, ?)
        """,
        student_id, teacher_id, name, cefr, now, now
    )
    conn.commit()
    return student_id


def insert_session_log(cursor, conn, teacher_id, student_id, session_date):
    log_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    cursor.execute(
        """
        INSERT INTO SessionLogs (Id, TeacherId, StudentId, GroupId, SessionDate,
                                 IsDeleted, IsCancelled, Status,
                                 TopicTags, MentionedDifficultyPairs, SuggestedDifficulties,
                                 PreviousHomeworkStatus,
                                 CreatedAt, UpdatedAt)
        VALUES (?, ?, ?, NULL, ?,
                0, 0, 1,
                '[]', '[]', '[]',
                0,
                ?, ?)
        """,
        log_id, teacher_id, student_id, session_date, now, now
    )
    conn.commit()
    return log_id


def insert_followup(cursor, conn, teacher_id, student_id):
    followup_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    cursor.execute(
        """
        INSERT INTO TeacherFollowups (Id, TeacherId, StudentId, GroupId, Text,
                                      Status, Kind, CreatedAt)
        VALUES (?, ?, ?, NULL, 'Test followup',
                'Pending', 'operational', ?)
        """,
        followup_id, teacher_id, student_id, now
    )
    conn.commit()
    return followup_id


def insert_student_group(cursor, conn, student_id, group_id):
    now = datetime.now(timezone.utc)
    cursor.execute(
        "INSERT INTO StudentGroups (StudentId, GroupId, CreatedAt) VALUES (?, ?, ?)",
        student_id, group_id, now
    )
    conn.commit()


def cleanup_student(cursor, conn, student_id):
    cursor.execute("DELETE FROM TeacherFollowups WHERE StudentId = ?", student_id)
    cursor.execute("DELETE FROM SessionLogs WHERE StudentId = ?", student_id)
    cursor.execute("DELETE FROM Students WHERE Id = ?", student_id)
    conn.commit()


def cleanup_group_by_teacher(cursor, conn, teacher_id):
    cursor.execute("SELECT Id FROM Groups WHERE TeacherId = ?", teacher_id)
    for row in cursor.fetchall():
        cursor.execute("DELETE FROM TeacherFollowups WHERE GroupId = ?", row.Id)
        cursor.execute("DELETE FROM SessionLogs WHERE GroupId = ?", row.Id)
    cursor.execute("DELETE FROM Groups WHERE TeacherId = ?", teacher_id)
    conn.commit()


def run_migration(extra_args=None):
    cmd = [sys.executable, str(MIGRATION_SCRIPT), "--local"]
    if extra_args:
        cmd.extend(extra_args)
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result


class TestMigrateFakeGroups:

    def test_dry_run_prints_plan(self, db_conn, test_teacher_id):
        """Dry run must print a migration plan and make no changes."""
        cur = db_conn.cursor()
        original = json.loads(ALLOWLIST_PATH.read_text())

        student_id = insert_fake_student(cur, db_conn, test_teacher_id, "B1.1-TEST", "B1")

        # Patch allowlist to use our test student
        test_allowlist = [{"id": student_id, "expected_name": "B1.1-TEST", "expected_cefr": "B1"}]
        ALLOWLIST_PATH.write_text(json.dumps(test_allowlist))

        try:
            result = run_migration(["--dry-run"])
            assert result.returncode == 0, result.stderr
            assert "Would create Group" in result.stdout
            assert "DRY RUN" in result.stdout

            # Nothing changed
            cur.execute("SELECT IsDeleted FROM Students WHERE Id = ?", student_id)
            row = cur.fetchone()
            assert row.IsDeleted == 0, "Dry run must not modify Students"

            cur.execute("SELECT COUNT(*) FROM Groups WHERE TeacherId = ?", test_teacher_id)
            assert cur.fetchone()[0] == 0, "Dry run must not create Groups"
        finally:
            ALLOWLIST_PATH.write_text(json.dumps(original))
            cleanup_student(cur, db_conn, student_id)

    def test_migration_success(self, db_conn, test_teacher_id):
        """Full migration: group created, sessions/followups reassigned, student soft-deleted."""
        cur = db_conn.cursor()
        original = json.loads(ALLOWLIST_PATH.read_text())

        student_id = insert_fake_student(cur, db_conn, test_teacher_id, "B1.1-TEST", "B1")
        log1 = insert_session_log(cur, db_conn, test_teacher_id, student_id, date(2026, 3, 1))
        log2 = insert_session_log(cur, db_conn, test_teacher_id, student_id, date(2026, 4, 1))
        log3 = insert_session_log(cur, db_conn, test_teacher_id, student_id, date(2026, 5, 1))
        followup_id = insert_followup(cur, db_conn, test_teacher_id, student_id)

        test_allowlist = [{"id": student_id, "expected_name": "B1.1-TEST", "expected_cefr": "B1"}]
        ALLOWLIST_PATH.write_text(json.dumps(test_allowlist))

        try:
            result = run_migration()
            assert result.returncode == 0, f"Migration failed:\n{result.stdout}\n{result.stderr}"

            # Student soft-deleted with renamed name
            cur.execute("SELECT IsDeleted, Name FROM Students WHERE Id = ?", student_id)
            s = cur.fetchone()
            assert s.IsDeleted == 1
            assert s.Name.startswith("[MIGRATED TO GROUP]")

            # Group created with correct fields
            cur.execute("SELECT Id, Name, CefrLevel, IsDeleted FROM Groups WHERE TeacherId = ?", test_teacher_id)
            groups = cur.fetchall()
            assert len(groups) == 1
            g = groups[0]
            assert g.Name == "B1.1-TEST"
            assert g.CefrLevel == "B1"
            assert g.IsDeleted == 0

            group_id = g.Id

            # All session logs reassigned to group
            for log_id in [log1, log2, log3]:
                cur.execute("SELECT StudentId, GroupId FROM SessionLogs WHERE Id = ?", log_id)
                sl = cur.fetchone()
                assert sl.StudentId is None
                assert str(sl.GroupId).upper() == str(group_id).upper()

            # Followup reassigned
            cur.execute("SELECT StudentId, GroupId FROM TeacherFollowups WHERE Id = ?", followup_id)
            tf = cur.fetchone()
            assert tf.StudentId is None
            assert str(tf.GroupId).upper() == str(group_id).upper()

        finally:
            ALLOWLIST_PATH.write_text(json.dumps(original))
            cleanup_group_by_teacher(cur, db_conn, test_teacher_id)
            cleanup_student(cur, db_conn, student_id)

    def test_rollback_on_failure(self, db_conn, test_teacher_id):
        """--fail-test mode must rollback: no group, no reassigned sessions, student unchanged."""
        cur = db_conn.cursor()
        original = json.loads(ALLOWLIST_PATH.read_text())

        student_id = insert_fake_student(cur, db_conn, test_teacher_id, "B1.1-TEST", "B1")
        log_id = insert_session_log(cur, db_conn, test_teacher_id, student_id, date(2026, 5, 1))

        test_allowlist = [{"id": student_id, "expected_name": "B1.1-TEST", "expected_cefr": "B1"}]
        ALLOWLIST_PATH.write_text(json.dumps(test_allowlist))

        try:
            result = run_migration(["--fail-test"])
            # Script should exit with error
            assert result.returncode != 0, "Expected failure with --fail-test"

            # Student unchanged
            cur.execute("SELECT IsDeleted FROM Students WHERE Id = ?", student_id)
            s = cur.fetchone()
            assert s.IsDeleted == 0, "Rollback: student must not be soft-deleted"

            # No group created
            cur.execute("SELECT COUNT(*) FROM Groups WHERE TeacherId = ?", test_teacher_id)
            assert cur.fetchone()[0] == 0, "Rollback: no group should exist"

            # Session log still on student
            cur.execute("SELECT StudentId, GroupId FROM SessionLogs WHERE Id = ?", log_id)
            sl = cur.fetchone()
            assert sl.StudentId is not None
            assert sl.GroupId is None

        finally:
            ALLOWLIST_PATH.write_text(json.dumps(original))
            cleanup_student(cur, db_conn, student_id)

    def test_skips_already_deleted_student(self, db_conn, test_teacher_id):
        """If a student is already IsDeleted=true, script skips it without error."""
        cur = db_conn.cursor()
        original = json.loads(ALLOWLIST_PATH.read_text())

        student_id = insert_fake_student(cur, db_conn, test_teacher_id, "B1.1-TEST", "B1")
        # Pre-delete the student
        cur.execute("UPDATE Students SET IsDeleted = 1 WHERE Id = ?", student_id)
        db_conn.commit()

        test_allowlist = [{"id": student_id, "expected_name": "B1.1-TEST", "expected_cefr": "B1"}]
        ALLOWLIST_PATH.write_text(json.dumps(test_allowlist))

        try:
            result = run_migration()
            assert result.returncode == 0, result.stderr
            assert "SKIP" in result.stdout

            # No group created
            cur.execute("SELECT COUNT(*) FROM Groups WHERE TeacherId = ?", test_teacher_id)
            assert cur.fetchone()[0] == 0
        finally:
            ALLOWLIST_PATH.write_text(json.dumps(original))
            cur.execute("DELETE FROM Students WHERE Id = ?", student_id)
            db_conn.commit()

    def test_preflight_student_group_aborts(self, db_conn, test_teacher_id):
        """If a fake student already has StudentGroup rows, script must abort before any changes."""
        cur = db_conn.cursor()
        original = json.loads(ALLOWLIST_PATH.read_text())

        student_id = insert_fake_student(cur, db_conn, test_teacher_id, "B1.1-TEST", "B1")
        # Create a real group to use as the join target
        group_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        cur.execute(
            """
            INSERT INTO Groups (Id, TeacherId, Name, CefrLevel, IsActive, IsDeleted, CreatedAt, UpdatedAt)
            VALUES (?, ?, 'Existing Group', 'B1', 1, 0, ?, ?)
            """,
            group_id, test_teacher_id, now, now
        )
        db_conn.commit()
        insert_student_group(cur, db_conn, student_id, group_id)

        test_allowlist = [{"id": student_id, "expected_name": "B1.1-TEST", "expected_cefr": "B1"}]
        ALLOWLIST_PATH.write_text(json.dumps(test_allowlist))

        try:
            result = run_migration()
            assert result.returncode != 0
            assert "ERROR" in result.stdout

            # Student unchanged
            cur.execute("SELECT IsDeleted FROM Students WHERE Id = ?", student_id)
            assert cur.fetchone().IsDeleted == 0
        finally:
            ALLOWLIST_PATH.write_text(json.dumps(original))
            cur.execute("DELETE FROM StudentGroups WHERE StudentId = ?", student_id)
            cur.execute("DELETE FROM Groups WHERE Id = ?", group_id)
            db_conn.commit()
            cleanup_student(cur, db_conn, student_id)

    def test_name_mismatch_aborts(self, db_conn, test_teacher_id):
        """If student name doesn't match allowlist, script must exit non-zero."""
        cur = db_conn.cursor()
        original = json.loads(ALLOWLIST_PATH.read_text())

        student_id = insert_fake_student(cur, db_conn, test_teacher_id, "REAL-STUDENT", "B1")

        test_allowlist = [{"id": student_id, "expected_name": "B1.1-TEST", "expected_cefr": "B1"}]
        ALLOWLIST_PATH.write_text(json.dumps(test_allowlist))

        try:
            result = run_migration()
            assert result.returncode != 0
            assert "ERROR" in result.stdout
        finally:
            ALLOWLIST_PATH.write_text(json.dumps(original))
            cleanup_student(cur, db_conn, student_id)
