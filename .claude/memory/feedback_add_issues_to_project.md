---
name: Always add new issues to the GitHub project board with status
description: When creating GitHub issues, always add them to the project board AND set their Status field immediately; gh project item-add alone leaves them in "No Status"
type: feedback
---

Every new GitHub issue must be added to the project board AND assigned a board status. Using `gh project item-add` alone leaves the item in "No Status" on the board.

**Use the helper script (one command, no excuses):**

```bash
./scripts/add-to-board.sh <issue-url> [status]
```

**Status values:** `backlog` (default), `ready`, `in-progress`, `ready-to-test`, `done`

**Which status to set:**
- Issue just created, not yet qa:ready: `backlog`
- Issue has `qa:ready` label, unassigned: `ready`
- Issue is assigned and being worked on: `in-progress`

**NEVER use `gh project item-add` directly.** Always use the script. It handles both steps atomically.

This was discovered on 2026-03-22 when issues kept appearing in "No Status" because agents used `gh project item-add` without setting the status field.
