#!/usr/bin/env python3
"""
task-merged — close a merged issue and move it to Ready to Test on the project board.

Usage: python3 .claude/scripts/task-merged.py <issue-number> [--account <gh-username>]

--account defaults to robertfreirebot-stack, which holds the 'project' scope needed
for projectV2 GraphQL queries. The active gh account is never consulted.
"""

import json
import os
import subprocess
import sys

OWNER = "Robert-Freire"
REPO = "Robert-Freire/langTeachSaaS"
PROJECT_NUM = "2"
PROJECT_ID = "PVT_kwHOAF1Pks4BSLsS"
FIELD_ID = "PVTSSF_lAHOAF1Pks4BSLsSzg_ysiA"
READY_TO_TEST_OPTION_ID = "530fcec2"
DEFAULT_ACCOUNT = "robertfreirebot-stack"


def get_token(account: str) -> str:
    result = subprocess.run(
        ["gh", "auth", "token", "--user", account],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"ERROR: could not get token for account '{account}'.\n{result.stderr.strip()}", file=sys.stderr)
        sys.exit(1)
    return result.stdout.strip()


def gh(*args: str, token: str) -> str:
    env = {**os.environ, "GH_TOKEN": token}
    result = subprocess.run(["gh", *args], capture_output=True, text=True, env=env)
    if result.returncode != 0:
        print(f"ERROR: gh {' '.join(args[:4])} ...\n{result.stderr.strip()}", file=sys.stderr)
        sys.exit(1)
    return result.stdout.strip()


def find_item_id(issue_num: int, token: str) -> str:
    """Find project item ID via GraphQL (reliable regardless of board size)."""
    query = """
    { user(login: "%s") { projectV2(number: %s) {
        items(first: 100) { nodes { id content { ... on Issue { number } } }
          pageInfo { hasNextPage endCursor } } } } }
    """ % (OWNER, PROJECT_NUM)

    cursor = None
    while True:
        if cursor:
            q = query.replace("items(first: 100)",
                              'items(first: 100, after: "%s")' % cursor)
        else:
            q = query
        raw = gh("api", "graphql", "-f", f"query={q}", token=token)
        data = json.loads(raw)
        items_data = data["data"]["user"]["projectV2"]["items"]
        for node in items_data["nodes"]:
            content = node.get("content") or {}
            if content.get("number") == issue_num:
                return node["id"]
        if not items_data["pageInfo"]["hasNextPage"]:
            break
        cursor = items_data["pageInfo"]["endCursor"]
    return ""


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print("Usage: python3 task-merged.py <issue-number> [--account <gh-username>]", file=sys.stderr)
        sys.exit(1)

    issue_num = int(args[0])
    account = DEFAULT_ACCOUNT
    if "--account" in args:
        idx = args.index("--account")
        if idx + 1 >= len(args):
            print("ERROR: --account requires a value.", file=sys.stderr)
            sys.exit(1)
        account = args[idx + 1]

    token = get_token(account)

    item_id = find_item_id(issue_num, token)
    if not item_id:
        print(f"ERROR: #{issue_num} not found on project board.", file=sys.stderr)
        sys.exit(1)

    gh("issue", "close", str(issue_num), "--repo", REPO, "--reason", "completed", token=token)
    gh("project", "item-edit",
       "--project-id", PROJECT_ID,
       "--id", item_id,
       "--field-id", FIELD_ID,
       "--single-select-option-id", READY_TO_TEST_OPTION_ID,
       token=token)

    print(f'Done. #{issue_num} closed and moved to "Ready to Test".')
    print('Next: call ExitWorktree(action: "remove") to clean up the worktree.')
    print('Do NOT update task status memory with per-issue state. GitHub is the source of truth.')


if __name__ == "__main__":
    main()
