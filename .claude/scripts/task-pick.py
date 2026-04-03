#!/usr/bin/env python3
"""
task-pick — find the highest-priority unassigned qa:ready issue in the active sprint.

Usage: python3 .claude/scripts/task-pick.py
       (run from repo root)

Output contract (read by Claude — keep stable):
  PICK: #N — <title> (<prio>)   [labels: a, b, c]
  FRONTEND_BLOCKED: yes|no

  If nothing qualifies:
  NONE: <reason>
"""

import json
import re
import subprocess
import sys
from pathlib import Path

MEMORY_FILE = Path(".claude/memory/project_langteach_task_status.md")
PRIO_ORDER = ["P0", "P1", "P2", "P3"]
DEP_PATTERN = re.compile(
    r"(?:depends on|blocked by|requires|after)\s+#(\d+)", re.IGNORECASE
)


def gh(*args: str) -> str:
    result = subprocess.run(["gh", *args], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERROR: gh {' '.join(args)} failed:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)
    return result.stdout.strip()


def extract_sprint_info() -> tuple[str, str]:
    text = MEMORY_FILE.read_text(encoding="utf-8")
    branch_match = re.search(r"Active sprint branch:\*\*\s*`?(sprint/[\w-]+)`?", text)
    # Support both list format ("- Name: ACTIVE") and table format ("| Name | ACTIVE |")
    milestone_match = re.search(r"^- ([^:]+): ACTIVE", text, re.MULTILINE)
    if not milestone_match:
        milestone_match = re.search(r"^\|\s*([^|]+?)\s*\|\s*ACTIVE\s*\|", text, re.MULTILINE)
    if not branch_match or not milestone_match:
        print("ERROR: Could not extract sprint/milestone from memory file.", file=sys.stderr)
        sys.exit(1)
    return branch_match.group(1), milestone_match.group(1).strip()


def label_names(issue: dict) -> list[str]:
    return [lb["name"] for lb in issue.get("labels", [])]


def is_frontend(labels: list[str]) -> bool:
    return any(n in ("area:frontend", "area:design") for n in labels)


def extract_priority(labels: list[str]) -> str:
    for name in labels:
        if re.match(r"^P[0-3]:", name):
            return name[:2]
    return "P2"


def extract_deps(issue: dict) -> list[str]:
    body = issue.get("body") or ""
    return list(dict.fromkeys(DEP_PATTERN.findall(body)))


def get_inflight_issue_nums() -> set[int]:
    """Return issue numbers that have an open task/* PR (in-flight by any bot)."""
    raw = gh("pr", "list", "--state", "open", "--json", "headRefName", "--limit", "50")
    prs = json.loads(raw)
    found = set()
    for pr in prs:
        m = re.match(r"task/t(\d+)-", pr.get("headRefName", ""))
        if m:
            found.add(int(m.group(1)))
    return found


def get_candidates(milestone: str) -> list[dict]:
    raw = gh(
        "issue", "list",
        "--milestone", milestone,
        "--label", "qa:ready",
        "--state", "open",
        "--json", "number,title,assignees,labels,body",
        "--limit", "50",
    )
    all_issues = json.loads(raw)
    return [i for i in all_issues if not i["assignees"]]


def check_dep_states(dep_numbers: list[str]) -> dict[str, str]:
    states: dict[str, str] = {}
    for dep in dep_numbers:
        try:
            state = gh("issue", "view", dep, "--json", "state", "--jq", ".state")
            states[dep] = state
        except SystemExit:
            states[dep] = "UNKNOWN"
    return states


def get_issue_labels(issue_num: int) -> list[str]:
    raw = gh("issue", "view", str(issue_num), "--json", "labels", "--jq", "[.labels[].name]")
    return json.loads(raw)


def main() -> None:
    sprint_branch, milestone = extract_sprint_info()

    # Detect in-flight tasks via open PRs (works for any number of concurrent bots)
    inflight_nums = get_inflight_issue_nums()

    # Check if any in-flight issue is frontend (one gh call per in-flight issue, usually 0-2)
    frontend_in_flight = False
    for num in inflight_nums:
        if is_frontend(get_issue_labels(num)):
            frontend_in_flight = True
            break

    # Get unassigned qa:ready candidates, excluding already in-flight
    candidates = get_candidates(milestone)
    candidates = [i for i in candidates if i["number"] not in inflight_nums]

    if not candidates:
        print(f"NONE: No unassigned qa:ready issues in sprint '{sprint_branch}'.")
        print(f"FRONTEND_BLOCKED: {'yes' if frontend_in_flight else 'no'}")
        return

    for issue in candidates:
        lbls = label_names(issue)
        issue["_prio"] = extract_priority(lbls)
        issue["_labels"] = lbls
        issue["_deps"] = extract_deps(issue)

    all_deps = list(dict.fromkeys(d for i in candidates for d in i["_deps"]))
    dep_states = check_dep_states(all_deps)

    for issue in candidates:
        open_blockers = [f"#{d}" for d in issue["_deps"] if dep_states.get(d) == "OPEN"]
        issue["_blocked"] = open_blockers

    def sort_key(i: dict) -> tuple:
        prio_idx = PRIO_ORDER.index(i["_prio"]) if i["_prio"] in PRIO_ORDER else 2
        return (prio_idx, len(i["_blocked"]) > 0, i["number"])

    candidates.sort(key=sort_key)

    pick = None
    for issue in candidates:
        if issue["_blocked"]:
            continue
        if frontend_in_flight and is_frontend(issue["_labels"]):
            continue
        pick = issue
        break

    if not pick:
        print(f"NONE: All candidates blocked or excluded by frontend constraint.")
        print(f"FRONTEND_BLOCKED: {'yes' if frontend_in_flight else 'no'}")
        return

    labels_str = ", ".join(pick["_labels"])
    print(f"PICK: #{pick['number']} — {pick['title']} ({pick['_prio']})   [labels: {labels_str}]")
    print(f"FRONTEND_BLOCKED: {'yes' if frontend_in_flight else 'no'}")


if __name__ == "__main__":
    main()
