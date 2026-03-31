#!/usr/bin/env python3
"""
task-merged — close a merged issue and move it to Ready to Test on the project board.

Usage: python3 .claude/scripts/task-merged.py <issue-number>
"""

import json
import subprocess
import sys

OWNER = "Robert-Freire"
REPO = "Robert-Freire/langTeachSaaS"
PROJECT_NUM = "2"
PROJECT_ID = "PVT_kwHOAF1Pks4BSLsS"
FIELD_ID = "PVTSSF_lAHOAF1Pks4BSLsSzg_ysiA"
READY_TO_TEST_OPTION_ID = "530fcec2"


def gh(*args: str) -> str:
    result = subprocess.run(["gh", *args], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERROR: gh {' '.join(args[:4])} ...\n{result.stderr.strip()}", file=sys.stderr)
        sys.exit(1)
    return result.stdout.strip()


def find_item_id(issue_num: int) -> str:
    for limit in ("100", "200"):
        raw = gh("project", "item-list", PROJECT_NUM, "--owner", OWNER,
                 "--format", "json", "--limit", limit)
        for item in json.loads(raw).get("items", []):
            if item.get("content", {}).get("number") == issue_num:
                item_id = item.get("id", "")
                if item_id.startswith("PVTI_"):
                    return item_id
    return ""


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python3 task-merged.py <issue-number>", file=sys.stderr)
        sys.exit(1)

    issue_num = int(sys.argv[1])

    item_id = find_item_id(issue_num)
    if not item_id:
        print(f"ERROR: #{issue_num} not found on project board.", file=sys.stderr)
        sys.exit(1)

    gh("issue", "close", str(issue_num), "--repo", REPO, "--reason", "completed")
    gh("project", "item-edit",
       "--project-id", PROJECT_ID,
       "--id", item_id,
       "--field-id", FIELD_ID,
       "--single-select-option-id", READY_TO_TEST_OPTION_ID)

    print(f'Done. #{issue_num} closed and moved to "Ready to Test".')
    print('Next: call ExitWorktree(action: "remove") to clean up the worktree.')


if __name__ == "__main__":
    main()
