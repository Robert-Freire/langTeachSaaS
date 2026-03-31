#!/usr/bin/env python3
"""
task-pr-check — check CI status and CodeRabbit comments for a PR.

Usage: python3 .claude/scripts/task-pr-check.py <pr-number>
"""

import json
import re
import subprocess
import sys

REPO = "Robert-Freire/langTeachSaaS"


def gh_raw(*args: str) -> tuple[int, str]:
    result = subprocess.run(["gh", *args], capture_output=True, text=True, encoding="utf-8")
    return result.returncode, (result.stdout or "") + (result.stderr or "")


def gh(*args: str) -> str:
    code, out = gh_raw(*args)
    # exit 8 = checks pending/failing; not a real CLI error
    if code not in (0, 8):
        print(f"ERROR: gh {' '.join(args[:4])} ...\n{out.strip()}", file=sys.stderr)
        sys.exit(1)
    return out.strip()


def check_ci(pr_num: int) -> tuple[str, list[str]]:
    output = gh("pr", "checks", str(pr_num), "--repo", REPO)
    lines = [l for l in output.splitlines() if l.strip()]

    pending_kw = ("pending", "in_progress", "queued", "waiting")
    fail_kw = ("fail", "error", "timed_out", "action_required", "cancelled")

    has_pending = any(any(kw in l.lower() for kw in pending_kw) for l in lines)
    failing = [l.split()[0] for l in lines if any(kw in l.lower() for kw in fail_kw) and l.split()]

    if has_pending:
        return "PENDING", []
    if failing:
        return "FAIL", failing
    return "PASS", []


def get_coderabbit_comments(pr_num: int) -> list[dict]:
    comments = []

    # General PR comments
    raw = gh("pr", "view", str(pr_num), "--repo", REPO, "--json", "comments")
    try:
        for c in json.loads(raw).get("comments", []):
            if c.get("author", {}).get("login") == "coderabbitai":
                comments.append({"body": c.get("body", ""), "path": None, "line": None})
    except (json.JSONDecodeError, KeyError):
        pass

    # Inline review comments
    code, raw = gh_raw("api", f"repos/{REPO}/pulls/{pr_num}/comments")
    if code == 0:
        try:
            for c in json.loads(raw):
                if c.get("user", {}).get("login") == "coderabbitai":
                    comments.append({
                        "body": c.get("body", ""),
                        "path": c.get("path"),
                        "line": c.get("line"),
                    })
        except (json.JSONDecodeError, KeyError):
            pass

    return comments


def classify(body: str) -> str:
    stripped = body.strip()
    # Summary: auto-generated overview
    if (stripped.startswith("## Summary")
            or stripped.startswith("<!-- This is an auto-generated")
            or "<!-- walkthrough" in stripped.lower()
            or stripped.startswith("<details>")):
        return "SUMMARY"
    # Nitpick
    if re.match(r"^\*{0,2}[Nn]itpick\b", stripped) or "**Nitpick**" in stripped:
        return "NITPICK"
    return "ACTIONABLE"


def short(body: str, n: int = 160) -> str:
    first = body.strip().split("\n")[0].strip()
    return first[:n] + ("..." if len(first) > n else "")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python3 task-pr-check.py <pr-number>", file=sys.stderr)
        sys.exit(1)

    pr_num = int(sys.argv[1])

    ci_status, failing = check_ci(pr_num)
    all_comments = get_coderabbit_comments(pr_num)

    raw = gh("pr", "view", str(pr_num), "--repo", REPO, "--json", "title")
    try:
        title = json.loads(raw).get("title", "")
    except json.JSONDecodeError:
        title = ""

    actionable, nitpicks = [], []
    for c in all_comments:
        kind = classify(c["body"])
        if kind == "ACTIONABLE":
            loc = f"{c['path']}:{c['line']}" if c.get("path") else "general"
            actionable.append(f"[ACTIONABLE] {loc} — {short(c['body'])}")
        elif kind == "NITPICK":
            nitpicks.append(f"[NITPICK] {short(c['body'])}")

    if ci_status == "PENDING":
        status = "WAITING_CI"
    elif ci_status == "FAIL" or actionable:
        status = "NEEDS_FIXES"
    else:
        status = "READY"

    print(f"PR #{pr_num} — {title}")
    print()
    print(f"CI: {ci_status}")
    for c in failing:
        print(f"  {c}")
    print()

    if not all_comments:
        cr_line = "NOT YET"
    elif not actionable and not nitpicks:
        cr_line = "CLEAR"
    else:
        parts = []
        if actionable:
            parts.append(f"{len(actionable)} actionable")
        if nitpicks:
            parts.append(f"{len(nitpicks)} nitpick")
        cr_line = ", ".join(parts)

    print(f"CodeRabbit: {cr_line}")
    for line in actionable + nitpicks:
        print(f"  {line}")
    print()
    print(f"STATUS: {status}")


if __name__ == "__main__":
    main()
