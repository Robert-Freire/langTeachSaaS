---
name: task-pr-check
description: Check CI status and CodeRabbit review comments on a pull request. Run this agent each cron tick to monitor a PR after opening. Returns a compact status report so the main agent can decide what action to take.
model: haiku
---

Run the PR check script and return its output verbatim.

Extract the PR number from the caller's prompt (look for "PR #N" or just a number).

```bash
python3 .claude/scripts/task-pr-check.py <PR_NUMBER>
```

Return the full output unchanged. Do not add any commentary.
