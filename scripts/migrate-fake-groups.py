#!/usr/bin/env python3
"""
One-time migration: convert fake-student rows (B1.1, A2.1) to real Group rows.

Usage:
  python3 scripts/migrate-fake-groups.py --dry-run
  python3 scripts/migrate-fake-groups.py

  # Local Docker SQL (for integration tests):
  python3 scripts/migrate-fake-groups.py --local --dry-run
  python3 scripts/migrate-fake-groups.py --local

  # Force a mid-transaction failure (rollback test only):
  python3 scripts/migrate-fake-groups.py --local --fail-test

Requires:
  - pyodbc (pip install pyodbc)
  - Azure CLI logged in (az login) with Key Vault read access  [Azure mode]
  - ODBC Driver 18 for SQL Server
"""

import argparse
import json
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

try:
    import pyodbc
except ImportError:
    print("ERROR: pyodbc not installed. Run: pip install pyodbc")
    sys.exit(1)

SCRIPTS_DIR = Path(__file__).resolve().parent
ALLOWLIST_PATH = SCRIPTS_DIR / "fake-groups-allowlist.json"

KEY_VAULT_NAME = "kv-lt-dev-5ba22u"
KEY_VAULT_SECRET = "ConnectionStrings--Default"

LOCAL_SERVER = "tcp:127.0.0.1,1434"
LOCAL_DATABASE = "LangTeach"


# ---------------------------------------------------------------------------
# Connection helpers (copied from copy-azure-teacher.py)
# ---------------------------------------------------------------------------

def get_azure_connection_string():
    result = subprocess.run(
        ["az", "keyvault", "secret", "show",
         "--vault-name", KEY_VAULT_NAME, "--name", KEY_VAULT_SECRET,
         "--query", "value", "-o", "tsv"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"ERROR: Failed to read Key Vault secret. Run 'az login' first.\n{result.stderr}")
        sys.exit(1)
    return result.stdout.strip()


def parse_sqlserver_conn_string(conn_str):
    parts = {}
    for segment in conn_str.split(";"):
        segment = segment.strip()
        if "=" in segment:
            key, value = segment.split("=", 1)
            parts[key.strip().lower()] = value.strip()
    return parts


def connect_azure():
    raw_conn = get_azure_connection_string()
    parts = parse_sqlserver_conn_string(raw_conn)

    server = parts.get("server", "")
    database = parts.get("initial catalog") or parts.get("database", "")
    user_id = parts.get("user id") or parts.get("uid", "")
    password = parts.get("password", "")

    conn_str = (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={server};"
        f"DATABASE={database};"
        f"UID={user_id};"
        f"PWD={password};"
        f"Encrypt=yes;"
        f"TrustServerCertificate=no;"
        f"Connection Timeout=30;"
    )
    conn = pyodbc.connect(conn_str)
    conn.autocommit = False
    return conn


def connect_local():
    env_path = SCRIPTS_DIR.parent / ".env"
    sa_password = None
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("SA_PASSWORD="):
                sa_password = line.split("=", 1)[1].strip()
                break
    if not sa_password:
        print("ERROR: SA_PASSWORD not found in .env")
        sys.exit(1)

    conn_str = (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={LOCAL_SERVER};"
        f"DATABASE={LOCAL_DATABASE};"
        f"UID=sa;"
        f"PWD={sa_password};"
        f"TrustServerCertificate=yes;"
    )
    conn = pyodbc.connect(conn_str)
    conn.autocommit = False
    return conn


# ---------------------------------------------------------------------------
# Core migration
# ---------------------------------------------------------------------------

def load_allowlist():
    if not ALLOWLIST_PATH.exists():
        print(f"ERROR: Allowlist not found at {ALLOWLIST_PATH}")
        sys.exit(1)
    return json.loads(ALLOWLIST_PATH.read_text())


def fetch_student(cursor, student_id):
    cursor.execute(
        "SELECT Id, TeacherId, Name, CefrLevel, IsDeleted FROM Students WHERE Id = ?",
        student_id
    )
    row = cursor.fetchone()
    return row


def validate_entry(cursor, entry):
    """Validate allowlist entry against live DB. Returns student row or exits."""
    student = fetch_student(cursor, entry["id"])
    if student is None:
        print(f"ERROR: Student {entry['id']} not found in database.")
        sys.exit(1)
    if student.IsDeleted:
        print(f"SKIP: Student {entry['id']} ({student.Name}) is already deleted. Already migrated?")
        return None
    if student.Name != entry["expected_name"]:
        print(
            f"ERROR: Student {entry['id']} has name '{student.Name}' "
            f"but allowlist expects '{entry['expected_name']}'. "
            "Check for stale IDs in fake-groups-allowlist.json."
        )
        sys.exit(1)
    return student


def count_session_logs(cursor, student_id):
    cursor.execute(
        "SELECT COUNT(*), MIN(SessionDate), MAX(SessionDate) "
        "FROM SessionLogs WHERE StudentId = ? AND IsDeleted = 0",
        student_id
    )
    row = cursor.fetchone()
    return row[0], row[1], row[2]


def count_followups(cursor, student_id):
    cursor.execute(
        "SELECT COUNT(*) FROM TeacherFollowups WHERE StudentId = ?",
        student_id
    )
    return cursor.fetchone()[0]


def check_student_groups(cursor, student_id):
    cursor.execute("SELECT COUNT(*) FROM StudentGroups WHERE StudentId = ?", student_id)
    return cursor.fetchone()[0]


def migrate_one(cursor, student, dry_run, fail_test):
    """Migrate one fake student to a Group. cursor must be in a transaction."""
    now = datetime.now(timezone.utc)
    new_group_id = str(uuid.uuid4())

    session_count, min_date, max_date = count_session_logs(cursor, student.Id)
    followup_count = count_followups(cursor, student.Id)
    sg_count = check_student_groups(cursor, student.Id)

    date_range = ""
    if session_count > 0 and min_date and max_date:
        date_range = f" ({min_date.strftime('%Y-%m-%d')} -> {max_date.strftime('%Y-%m-%d')})"

    print(f"{student.Name}  ->  Would create Group \"{student.Name}\" ({student.CefrLevel})")
    print(f"          Would reassign {session_count} SessionLog(s){date_range}")
    if followup_count > 0:
        print(f"          Would reassign {followup_count} TeacherFollowup(s)")
    print(f"          Would rename Student to \"[MIGRATED TO GROUP] {student.Name}\" and soft-delete")

    if sg_count > 0:
        print(
            f"ERROR: Student {student.Id} ({student.Name}) has {sg_count} StudentGroup row(s). "
            "Expected none for a fake-student. Aborting."
        )
        sys.exit(1)

    if dry_run:
        return

    # --- Execute ---
    cursor.execute(
        """
        INSERT INTO Groups (Id, TeacherId, Name, CefrLevel, Description, IsActive, IsDeleted,
                            CreatedAt, UpdatedAt, TeachingNotes)
        VALUES (?, ?, ?, ?, NULL, 1, 0, ?, ?, NULL)
        """,
        new_group_id, str(student.TeacherId), student.Name, student.CefrLevel, now, now
    )

    cursor.execute(
        "UPDATE SessionLogs SET GroupId = ?, StudentId = NULL WHERE StudentId = ? AND IsDeleted = 0",
        new_group_id, str(student.Id)
    )

    cursor.execute(
        "UPDATE TeacherFollowups SET GroupId = ?, StudentId = NULL WHERE StudentId = ?",
        new_group_id, str(student.Id)
    )

    if fail_test:
        # Insert a deliberately broken row to test rollback
        cursor.execute(
            "INSERT INTO Groups (Id, TeacherId, Name, CefrLevel, IsActive, IsDeleted, CreatedAt, UpdatedAt) "
            "VALUES (?, '00000000-0000-0000-0000-000000000000', 'FAIL_TEST', NULL, 1, 0, ?, ?)",
            str(uuid.uuid4()), now, now
        )

    cursor.execute(
        "UPDATE Students SET IsDeleted = 1, Name = ? WHERE Id = ?",
        f"[MIGRATED TO GROUP] {student.Name}", str(student.Id)
    )

    return new_group_id


def verify_migration(cursor, student_id, group_id, student_name):
    """Print post-migration verification results."""
    print(f"\n--- Verification for '{student_name}' ---")

    cursor.execute("SELECT IsDeleted, Name FROM Students WHERE Id = ?", student_id)
    s = cursor.fetchone()
    ok = s.IsDeleted and s.Name.startswith("[MIGRATED TO GROUP]")
    print(f"  Student soft-deleted: {'OK' if ok else 'FAIL'} (IsDeleted={s.IsDeleted}, Name={s.Name})")

    cursor.execute("SELECT Name, CefrLevel, IsDeleted FROM Groups WHERE Id = ?", group_id)
    g = cursor.fetchone()
    ok = g is not None and not g.IsDeleted
    print(f"  Group created: {'OK' if ok else 'FAIL'} (Name={g.Name if g else None}, CefrLevel={g.CefrLevel if g else None})")

    cursor.execute(
        "SELECT COUNT(*) FROM SessionLogs WHERE StudentId = ? AND IsDeleted = 0",
        student_id
    )
    remaining = cursor.fetchone()[0]
    print(f"  SessionLogs remaining on student: {'OK' if remaining == 0 else 'FAIL'} ({remaining})")

    cursor.execute(
        "SELECT COUNT(*) FROM SessionLogs WHERE GroupId = ? AND IsDeleted = 0",
        group_id
    )
    moved = cursor.fetchone()[0]
    print(f"  SessionLogs on new group: {moved}")

    cursor.execute("SELECT COUNT(*) FROM TeacherFollowups WHERE StudentId = ?", student_id)
    tf_remaining = cursor.fetchone()[0]
    print(f"  TeacherFollowups remaining on student: {'OK' if tf_remaining == 0 else 'FAIL'} ({tf_remaining})")


def main():
    parser = argparse.ArgumentParser(description="Migrate fake-student rows to real Groups")
    parser.add_argument("--dry-run", action="store_true", help="Print what would happen; make no changes")
    parser.add_argument("--local", action="store_true", help="Connect to local Docker SQL instead of Azure")
    parser.add_argument("--fail-test", action="store_true", help="Inject a bad FK to test rollback (local only)")
    args = parser.parse_args()

    if args.fail_test and not args.local:
        print("ERROR: --fail-test requires --local")
        sys.exit(1)
    if args.fail_test and args.dry_run:
        print("ERROR: --fail-test and --dry-run are mutually exclusive")
        sys.exit(1)

    allowlist = load_allowlist()

    print("Connecting to", "local Docker SQL" if args.local else "Azure SQL", "...")
    conn = connect_local() if args.local else connect_azure()
    cursor = conn.cursor()

    results = []

    for entry in allowlist:
        student = validate_entry(cursor, entry)
        if student is None:
            continue

        try:
            group_id = migrate_one(cursor, student, dry_run=args.dry_run, fail_test=args.fail_test)
            if not args.dry_run:
                conn.commit()
                results.append((str(student.Id), group_id, student.Name))
                print(f"  -> Committed.")
        except Exception as e:
            conn.rollback()
            print(f"\nERROR during migration of '{student.Name}': {e}")
            print("Transaction rolled back.")
            conn.close()
            sys.exit(1)

    if args.dry_run:
        print("\nDRY RUN. No changes made. Re-run without --dry-run to execute.")
    else:
        print("\n--- Post-migration verification ---")
        for student_id, group_id, name in results:
            verify_migration(cursor, student_id, group_id, name)

    conn.close()


if __name__ == "__main__":
    main()
