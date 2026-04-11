#!/usr/bin/env python3
"""
Copy a teacher's complete dataset from Azure SQL to local Docker SQL Server.

Usage (PowerShell):
  python scripts/copy-azure-teacher.py --teacher-email "jordi@example.com"
  python scripts/copy-azure-teacher.py --teacher-email "jordi@example.com" --dry-run
  python scripts/copy-azure-teacher.py --teacher-email "jordi@example.com" --clean
  python scripts/copy-azure-teacher.py --teacher-email "jordi@example.com" --target-email "me@example.com" --clean

Requires:
  - pyodbc (pip install pyodbc)
  - Azure CLI logged in (az login) with Key Vault read access
  - ODBC Driver 18 for SQL Server
  - Local Docker SQL running (docker compose up sqlserver)
"""

import argparse
import subprocess
import sys
from pathlib import Path

try:
    import pyodbc
except ImportError:
    print("ERROR: pyodbc not installed. Run: pip install pyodbc")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Azure SQL connection (read-only, credentials from Key Vault via az CLI)
# ---------------------------------------------------------------------------

KEY_VAULT_NAME = "kv-lt-dev-5ba22u"
KEY_VAULT_SECRET = "ConnectionStrings--Default"

# Local Docker SQL connection
LOCAL_SERVER = "tcp:127.0.0.1,1434"
LOCAL_DATABASE = "LangTeach"


def get_azure_connection_string():
    """Fetch the Azure SQL connection string from Key Vault via az CLI."""
    # On Windows, az is a .cmd script; invoke via cmd /c so it resolves via PATH
    result = subprocess.run(
        ["cmd", "/c", "az", "keyvault", "secret", "show",
         "--vault-name", KEY_VAULT_NAME, "--name", KEY_VAULT_SECRET,
         "--query", "value", "-o", "tsv"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"ERROR: Failed to read Key Vault secret. Run 'az login' first.\n{result.stderr}")
        sys.exit(1)
    return result.stdout.strip()


def parse_sqlserver_conn_string(conn_str):
    """Parse a .NET-style SQL Server connection string into a dict (case-insensitive keys)."""
    parts = {}
    for segment in conn_str.split(";"):
        segment = segment.strip()
        if "=" in segment:
            key, value = segment.split("=", 1)
            parts[key.strip().lower()] = value.strip()
    return parts


def connect_azure():
    """Connect to Azure SQL using credentials from Key Vault."""
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
    return conn


def connect_local():
    """Connect to local Docker SQL Server."""
    # Read SA_PASSWORD from .env
    env_path = Path(__file__).resolve().parent.parent / ".env"
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
    return conn


# ---------------------------------------------------------------------------
# Table definitions in FK-safe insertion order
# ---------------------------------------------------------------------------

# Each entry: (table_name, columns, fk_filter_description)
# Columns are fetched dynamically; these are used for SELECT/INSERT.

# Tables linked to the teacher, in insertion order:
TABLES_CONFIG = [
    {
        "table": "Teachers",
        "query": "SELECT * FROM Teachers WHERE Id = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE FROM Teachers WHERE Id = ?",
        "delete_params": lambda tid: [tid],
    },
    {
        "table": "TeacherSettings",
        "query": "SELECT * FROM TeacherSettings WHERE TeacherId = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE FROM TeacherSettings WHERE TeacherId = ?",
        "delete_params": lambda tid: [tid],
    },
    {
        "table": "Students",
        "query": "SELECT * FROM Students WHERE TeacherId = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE FROM Students WHERE TeacherId = ?",
        "delete_params": lambda tid: [tid],
    },
    {
        "table": "Lessons",
        "query": "SELECT * FROM Lessons WHERE TeacherId = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE FROM Lessons WHERE TeacherId = ?",
        "delete_params": lambda tid: [tid],
    },
    {
        "table": "LessonSections",
        "query": "SELECT ls.* FROM LessonSections ls INNER JOIN Lessons l ON ls.LessonId = l.Id WHERE l.TeacherId = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE ls FROM LessonSections ls INNER JOIN Lessons l ON ls.LessonId = l.Id WHERE l.TeacherId = ?",
        "delete_params": lambda tid: [tid],
    },
    {
        "table": "LessonContentBlocks",
        "query": "SELECT lcb.* FROM LessonContentBlocks lcb INNER JOIN Lessons l ON lcb.LessonId = l.Id WHERE l.TeacherId = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE lcb FROM LessonContentBlocks lcb INNER JOIN Lessons l ON lcb.LessonId = l.Id WHERE l.TeacherId = ?",
        "delete_params": lambda tid: [tid],
    },
    {
        "table": "LessonNotes",
        "query": "SELECT * FROM LessonNotes WHERE TeacherId = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE FROM LessonNotes WHERE TeacherId = ?",
        "delete_params": lambda tid: [tid],
    },
    {
        "table": "Materials",
        "query": "SELECT m.* FROM Materials m INNER JOIN LessonSections ls ON m.LessonSectionId = ls.Id INNER JOIN Lessons l ON ls.LessonId = l.Id WHERE l.TeacherId = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE m FROM Materials m INNER JOIN LessonSections ls ON m.LessonSectionId = ls.Id INNER JOIN Lessons l ON ls.LessonId = l.Id WHERE l.TeacherId = ?",
        "delete_params": lambda tid: [tid],
    },
    {
        "table": "Courses",
        "query": "SELECT * FROM Courses WHERE TeacherId = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE FROM Courses WHERE TeacherId = ?",
        "delete_params": lambda tid: [tid],
    },
    {
        "table": "CurriculumEntries",
        "query": "SELECT ce.* FROM CurriculumEntries ce INNER JOIN Courses c ON ce.CourseId = c.Id WHERE c.TeacherId = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE ce FROM CurriculumEntries ce INNER JOIN Courses c ON ce.CourseId = c.Id WHERE c.TeacherId = ?",
        "delete_params": lambda tid: [tid],
    },
    {
        "table": "CourseSuggestions",
        "query": "SELECT cs.* FROM CourseSuggestions cs INNER JOIN Courses c ON cs.CourseId = c.Id WHERE c.TeacherId = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE cs FROM CourseSuggestions cs INNER JOIN Courses c ON cs.CourseId = c.Id WHERE c.TeacherId = ?",
        "delete_params": lambda tid: [tid],
    },
    {
        "table": "SessionLogs",
        "query": "SELECT * FROM SessionLogs WHERE TeacherId = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE FROM SessionLogs WHERE TeacherId = ?",
        "delete_params": lambda tid: [tid],
    },
    {
        "table": "VoiceNotes",
        "query": "SELECT * FROM VoiceNotes WHERE TeacherId = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE FROM VoiceNotes WHERE TeacherId = ?",
        "delete_params": lambda tid: [tid],
    },
    {
        "table": "VoiceNoteApplications",
        "query": "SELECT vna.* FROM VoiceNoteApplications vna INNER JOIN SessionLogs sl ON vna.SessionLogId = sl.Id WHERE sl.TeacherId = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE vna FROM VoiceNoteApplications vna INNER JOIN SessionLogs sl ON vna.SessionLogId = sl.Id WHERE sl.TeacherId = ?",
        "delete_params": lambda tid: [tid],
    },
    {
        "table": "GenerationUsages",
        "query": "SELECT * FROM GenerationUsages WHERE TeacherId = ?",
        "params": lambda tid: [tid],
        "delete": "DELETE FROM GenerationUsages WHERE TeacherId = ?",
        "delete_params": lambda tid: [tid],
    },
]


def fetch_rows(conn, query, params):
    """Execute a SELECT and return (column_names, rows). Returns None if table doesn't exist."""
    cursor = conn.cursor()
    try:
        cursor.execute(query, params)
    except pyodbc.ProgrammingError as e:
        if "Invalid object name" in str(e):
            return None, []
        raise
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()
    return columns, rows


def print_summary(table_data):
    """Print a summary table of row counts."""
    print("\n{:<25} {:>8}".format("Table", "Rows"))
    print("-" * 35)
    total = 0
    for table_name, columns, rows in table_data:
        if columns is None:
            print(f"{table_name:<25} {'(table not found)':>8}")
            continue
        count = len(rows)
        total += count
        print(f"{table_name:<25} {count:>8}")
    print("-" * 35)
    print(f"{'TOTAL':<25} {total:>8}")
    print()


def delete_teacher_data(local_conn, teacher_id, skip_tables=None):
    """Delete existing data for the teacher in reverse FK order."""
    skip_tables = skip_tables or set()
    cursor = local_conn.cursor()
    # Delete in reverse order to respect FK constraints
    for config in reversed(TABLES_CONFIG):
        if config["table"] in skip_tables:
            continue
        params = config["delete_params"](teacher_id)
        try:
            cursor.execute(config["delete"], params)
            deleted = cursor.rowcount
            if deleted > 0:
                print(f"  Deleted {deleted} rows from {config['table']}")
        except pyodbc.Error as e:
            if "Invalid object name" in str(e):
                continue
            local_conn.rollback()
            raise RuntimeError(f"Failed deleting from {config['table']}") from e
    local_conn.commit()


def get_target_columns(local_conn, table_name):
    """Get column names for a table in the local database."""
    cursor = local_conn.cursor()
    try:
        cursor.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
            [table_name]
        )
        return {row[0] for row in cursor.fetchall()}
    except pyodbc.Error:
        return set()


def remap_teacher_id(table_name, columns, rows, source_teacher_id, target_teacher_id):
    """Replace source TeacherId with target TeacherId in all rows."""
    if "TeacherId" not in columns:
        return rows
    tid_index = columns.index("TeacherId")
    remapped = []
    for row in rows:
        values = list(row)
        if values[tid_index] == source_teacher_id:
            values[tid_index] = target_teacher_id
        remapped.append(values)
    return remapped


# Tables to skip when remapping to an existing local teacher
SKIP_ON_REMAP = {"Teachers", "TeacherSettings"}


def insert_rows(local_conn, table_name, source_columns, rows):
    """Insert rows into a local table, handling schema drift by using only common columns."""
    if not rows:
        return 0

    target_cols = get_target_columns(local_conn, table_name)
    if not target_cols:
        print(f"  Warning: {table_name} not found in local DB, skipping")
        return 0

    # Find common columns and their indices in the source data
    common_cols = []
    common_indices = []
    skipped_cols = []
    for i, col in enumerate(source_columns):
        if col in target_cols:
            common_cols.append(col)
            common_indices.append(i)
        else:
            skipped_cols.append(col)

    if skipped_cols:
        print(f"  Note: skipping source columns not in local schema: {', '.join(skipped_cols)}")

    cursor = local_conn.cursor()
    placeholders = ", ".join(["?" for _ in common_cols])
    col_list = ", ".join([f"[{c}]" for c in common_cols])
    sql = f"INSERT INTO [{table_name}] ({col_list}) VALUES ({placeholders})"

    inserted = 0
    skipped = 0
    for row in rows:
        filtered_values = [row[i] for i in common_indices]
        try:
            cursor.execute(sql, filtered_values)
            inserted += 1
        except pyodbc.IntegrityError as e:
            if "duplicate" in str(e).lower() or "violation of primary key" in str(e).lower():
                skipped += 1
            else:
                raise
        except pyodbc.Error:
            raise

    if skipped:
        print(f"  Note: {skipped} duplicate rows skipped in {table_name}")

    return inserted


def main():
    parser = argparse.ArgumentParser(
        description="Copy a teacher's data from Azure SQL to local Docker SQL Server.",
        epilog="Requires: pyodbc, az login (Key Vault access), ODBC Driver 18, Docker SQL running."
    )
    parser.add_argument("--teacher-email", required=True, help="Teacher's email address in Azure SQL")
    parser.add_argument("--target-email", help="Local teacher email to assign imported data to (remaps TeacherId)")
    parser.add_argument("--dry-run", action="store_true", help="Show row counts without writing to local DB")
    parser.add_argument("--clean", action="store_true", help="Delete existing local data for this teacher before import")
    args = parser.parse_args()

    # Step 1: Connect to Azure SQL
    print("Connecting to Azure SQL (credentials from Key Vault)...")
    azure_conn = connect_azure()
    local_conn = None
    try:
        print("  Connected.")

        # Step 2: Find the teacher
        cursor = azure_conn.cursor()
        cursor.execute("SELECT Id FROM Teachers WHERE Email = ?", [args.teacher_email])
        row = cursor.fetchone()
        if not row:
            print(f"ERROR: No teacher found with email '{args.teacher_email}'")
            sys.exit(1)

        teacher_id = row[0]
        print(f"  Found teacher: {teacher_id}")

        # Step 3: Fetch all data from Azure
        print("\nFetching data from Azure SQL (read-only)...")
        table_data = []
        for config in TABLES_CONFIG:
            params = config["params"](teacher_id)
            columns, rows = fetch_rows(azure_conn, config["query"], params)
            table_data.append((config["table"], columns, rows))

        # Step 4: Print summary
        print_summary(table_data)

        if args.dry_run:
            print("DRY RUN: No data written to local DB.")
            return

        # Step 5: Connect to local SQL
        print(f"Connecting to local SQL ({LOCAL_SERVER}/{LOCAL_DATABASE})...")
        local_conn = connect_local()
        print("  Connected.")

        # Step 6: Resolve target teacher for remapping
        target_teacher_id = None
        if args.target_email:
            local_cursor = local_conn.cursor()
            local_cursor.execute("SELECT Id FROM Teachers WHERE Email = ?", [args.target_email])
            target_row = local_cursor.fetchone()
            if not target_row:
                print(f"ERROR: No local teacher found with email '{args.target_email}'")
                sys.exit(1)
            target_teacher_id = target_row[0]
            print(f"  Remapping TeacherId: {teacher_id} -> {target_teacher_id} ({args.target_email})")

        # Step 7: Optionally clean existing data
        if args.clean:
            print("\nCleaning existing local data...")
            if target_teacher_id:
                # When remapping: clean child data for both source and target,
                # but never delete either teacher/settings row
                delete_teacher_data(local_conn, teacher_id, skip_tables=SKIP_ON_REMAP)
                delete_teacher_data(local_conn, target_teacher_id, skip_tables=SKIP_ON_REMAP)
            else:
                delete_teacher_data(local_conn, teacher_id)

        # Step 8: Insert data in FK order (commit after each table for FK integrity)
        print("\nImporting data to local SQL...")
        for table_name, columns, rows in table_data:
            if not rows or columns is None:
                continue
            # Skip Teachers/TeacherSettings when remapping to an existing local teacher
            if target_teacher_id and table_name in SKIP_ON_REMAP:
                print(f"  {table_name}: skipped (using local teacher)")
                continue
            # Remap TeacherId if needed
            if target_teacher_id and columns:
                rows = remap_teacher_id(table_name, columns, rows, teacher_id, target_teacher_id)
            inserted = insert_rows(local_conn, table_name, columns, rows)
            local_conn.commit()
            print(f"  {table_name}: {inserted}/{len(rows)} rows inserted")
        print("\nDone! Teacher data copied successfully.")
    finally:
        azure_conn.close()
        if local_conn:
            local_conn.close()


if __name__ == "__main__":
    main()
