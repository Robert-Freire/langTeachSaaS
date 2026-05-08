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
    """Find the project item ID for an issue via the issue->projectItems edge.

    Previously this paginated through every item on the board to locate the match.
    That approach is O(N) in board size and fatally fragile: a single corrupted
    ProjectV2Item anywhere on the board causes GitHub's GraphQL resolver to reject
    batch fetches that include it, jamming the loop forever (observed 2026-05-08:
    item at position around 228 broke the resolver for any first>=3 query, and
    `gh project item-list` failed identically). The issue->projectItems edge
    resolves the linkage directly without enumerating siblings.
    """
    query = """
    { repository(owner: "%s", name: "langTeachSaaS") {
        issue(number: %d) {
          projectItems(first: 10) { nodes { id project { number } } } } } }
    """ % (OWNER, issue_num)
    raw = gh("api", "graphql", "-f", f"query={query}", token=token)
    data = json.loads(raw)
    issue = data["data"]["repository"].get("issue")
    if not issue:
        return ""
    for node in issue["projectItems"]["nodes"]:
        if node["project"]["number"] == int(PROJECT_NUM):
            return node["id"]
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
