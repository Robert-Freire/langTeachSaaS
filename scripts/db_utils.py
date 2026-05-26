"""
Shared SQL Server connection helpers for LangTeach admin scripts.

Requires:
  - pyodbc (pip install pyodbc)
  - Azure CLI logged in (az login) with Key Vault read access  [Azure mode]
  - ODBC Driver 18 for SQL Server
"""

import subprocess
import sys
from pathlib import Path

try:
    import pyodbc
except ImportError:
    print("ERROR: pyodbc not installed. Run: pip install pyodbc")
    sys.exit(1)

KEY_VAULT_NAME = "kv-lt-dev-5ba22u"
KEY_VAULT_SECRET = "ConnectionStrings--Default"

LOCAL_SERVER = "tcp:127.0.0.1,1434"
LOCAL_DATABASE = "LangTeach"

SCRIPTS_DIR = Path(__file__).resolve().parent


def get_azure_connection_string():
    """Fetch the Azure SQL connection string from Key Vault via az CLI."""
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
    """Parse a .NET-style SQL Server connection string into a dict (case-insensitive keys)."""
    parts = {}
    for segment in conn_str.split(";"):
        segment = segment.strip()
        if "=" in segment:
            key, value = segment.split("=", 1)
            parts[key.strip().lower()] = value.strip()
    return parts


def connect_azure():
    """Connect to Azure SQL using credentials from Key Vault. autocommit=False."""
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


def connect_local(env_path=None):
    """Connect to local Docker SQL Server. autocommit=False."""
    if env_path is None:
        env_path = SCRIPTS_DIR.parent / ".env"
    sa_password = None
    if Path(env_path).exists():
        for line in Path(env_path).read_text().splitlines():
            if line.startswith("SA_PASSWORD="):
                sa_password = line.split("=", 1)[1].strip()
                break
    if not sa_password:
        print(f"ERROR: SA_PASSWORD not found in {env_path}")
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
