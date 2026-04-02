#!/usr/bin/env python3
"""
task-build-verify — run all 6 pre-push checks and return a compact report.

Usage: python3 .claude/scripts/task-build-verify.py <worktree-path>
"""

import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED
from pathlib import Path


def run(cmd: str, cwd: str) -> tuple[int, str]:
    result = subprocess.run(
        cmd, shell=True, cwd=cwd,
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    return result.returncode, result.stdout + result.stderr


def classify(name: str, code: int, output: str) -> tuple[str, str]:
    if code != 0:
        for line in output.splitlines():
            s = line.strip()
            if any(kw in s.lower() for kw in ("error", "failed", "cannot", "undefined", "exception")):
                return "FAIL", s[:120]
        lines = [l.strip() for l in output.splitlines() if l.strip()]
        return "FAIL", (lines[-1][:120] if lines else f"exit {code}")
    if name == "dotnet build" and "warning CS" in output:
        return "WARN", ""
    if name == "bicep build" and re.search(r"\bWarning\b", output):
        return "WARN", ""
    return "PASS", ""


def test_summary(name: str, output: str) -> str:
    if name == "dotnet test":
        m = re.search(r"(\d+) passed.*?(\d+) failed", output)
        if m:
            return f"{m.group(1)} passed, {m.group(2)} failed"
        m = re.search(r"(\d+) passed", output)
        return f"{m.group(1)} passed" if m else ""
    if name == "npm test":
        passed = re.search(r"(\d+) passed", output)
        failed = re.search(r"(\d+) failed", output)
        if passed:
            f = failed.group(1) if failed else "0"
            return f"{passed.group(1)} passed | {f} failed"
    return ""


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python3 task-build-verify.py <worktree-path>", file=sys.stderr)
        sys.exit(1)

    worktree = Path(sys.argv[1])
    if not worktree.exists():
        print(f"ERROR: path does not exist: {worktree}", file=sys.stderr)
        sys.exit(1)

    backend = str(worktree / "backend")
    frontend = str(worktree / "frontend")
    bicep_file = str(worktree / "infra" / "main.bicep")

    results: dict[str, tuple[int, str]] = {}

    # Batch A + C in parallel (all except dotnet test)
    batch = {
        "bicep build":  (f"az bicep build --file {bicep_file}", str(worktree)),
        "dotnet build": ("dotnet build", backend),
        "npm lint":     ("npm run lint", frontend),
        "npm build":    ("npm run build", frontend),
        "npm test":     ("npm test -- --run", frontend),
    }

    with ThreadPoolExecutor(max_workers=5) as ex:
        futures = {ex.submit(run, cmd, cwd): key for key, (cmd, cwd) in batch.items()}
        for fut in futures:
            fut.add_done_callback(lambda f: None)  # keep futures alive
        # collect all
        for fut, key in futures.items():
            results[key] = fut.result()

    # Batch B: dotnet test only if build passed
    build_code, _ = results["dotnet build"]
    if build_code == 0:
        results["dotnet test"] = run("dotnet test", backend)
    else:
        results["dotnet test"] = (1, "skipped — dotnet build failed")

    # Report
    order = ["bicep build", "dotnet build", "dotnet test", "npm lint", "npm build", "npm test"]
    verdicts: dict[str, str] = {}
    details: dict[str, str] = {}

    for check in order:
        code, output = results[check]
        verdict, err = classify(check, code, output)
        verdicts[check] = verdict
        summary = test_summary(check, output)
        if summary:
            details[check] = f"  ({summary})"
        elif err:
            details[check] = f"  — {err}"
        else:
            details[check] = ""

    overall = "PASS" if all(v in ("PASS", "WARN") for v in verdicts.values()) else "FAIL"

    print(f"BUILD VERIFY — {worktree.name}")
    print()
    for check in order:
        print(f"  {check:<16} {verdicts[check]}{details[check]}")
    print()
    print(f"VERDICT: {overall}")
    failures = [check for check in order if verdicts[check] == "FAIL"]
    for check in failures:
        print(f"  {check}{details[check]}")

    sys.exit(0 if overall == "PASS" else 1)


if __name__ == "__main__":
    main()
