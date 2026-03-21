#!/usr/bin/env python3
"""
Validate all curricula JSON files against schema.json.

Usage:
    python validate.py          # validate all files
    python validate.py --file iberia/A1.1.json   # validate single file
"""

import json
import sys
import argparse
from pathlib import Path

try:
    import jsonschema
except ImportError:
    print("ERROR: jsonschema not installed. Run: pip install jsonschema")
    sys.exit(1)


SCRIPT_DIR = Path(__file__).parent
SCHEMA_PATH = SCRIPT_DIR / "schema.json"


def load_schema():
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        return json.load(f)


def validate_file(path: Path, schema: dict) -> list[str]:
    """Return list of validation errors (empty = OK)."""
    errors = []
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        return [f"File not found: {path}"]
    except PermissionError:
        return [f"Permission denied: {path}"]
    except json.JSONDecodeError as e:
        return [f"JSON parse error: {e}"]

    validator = jsonschema.Draft202012Validator(schema)
    for error in validator.iter_errors(data):
        errors.append(f"{' > '.join(str(p) for p in error.absolute_path) or 'root'}: {error.message}")

    return errors


def collect_json_files(root: Path) -> list[Path]:
    files = []
    for path in sorted(root.rglob("*.json")):
        if path.name == "schema.json":
            continue
        # grammar_maps use a different structure (multi-level collection, not single level)
        if "grammar_maps" in path.parts:
            continue
        files.append(path)
    return files


def main():
    parser = argparse.ArgumentParser(description="Validate curricula JSON files")
    parser.add_argument("--file", help="Validate a single file (relative to data/curricula/)")
    args = parser.parse_args()

    schema = load_schema()

    if args.file:
        target = Path(args.file) if Path(args.file).is_absolute() else SCRIPT_DIR / args.file
        try:
            target = target.resolve()
            target.relative_to(SCRIPT_DIR.resolve())
        except ValueError:
            print(f"ERROR: --file path must be inside data/curricula/ ({args.file})")
            sys.exit(1)
        files = [target]
    else:
        files = collect_json_files(SCRIPT_DIR)

    total = len(files)
    failed = 0

    for path in files:
        rel = path.relative_to(SCRIPT_DIR)
        errors = validate_file(path, schema)
        if errors:
            failed += 1
            print(f"FAIL  {rel}")
            for e in errors:
                print(f"      {e}")
        else:
            print(f"OK    {rel}")

    print(f"\n{total - failed}/{total} files valid")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
