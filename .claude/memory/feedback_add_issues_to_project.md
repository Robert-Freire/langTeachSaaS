---
name: Always add new issues to the GitHub project board with status
description: When creating GitHub issues, always add them to the project board AND set their Status field immediately; gh project item-add alone leaves them in "No Status"
type: feedback
---

Every new GitHub issue must be added to the project board AND assigned a board status right after creation. Using `gh project item-add` alone adds the item but does NOT set the Status field, which leaves it in a "No Status" column on the board.

**Always do both steps together:**

```bash
# Step 1: Add to project and capture the item ID
ITEM_ID=$(gh project item-add 2 --owner Robert-Freire --url <issue-url> --format json | python -c "import json,sys; print(json.load(sys.stdin)['id'])")

# Step 2: Set the Status field
gh project item-edit --project-id "PVT_kwHOAF1Pks4BSLsS" --id "$ITEM_ID" --field-id "PVTSSF_lAHOAF1Pks4BSLsSzg_ysiA" --single-select-option-id "<status_option_id>"
```

**Status option IDs:**
- Backlog: `7cba4571`
- Ready: `eec9fa45`
- In Progress: `47fc9ee4`
- Ready to Test: `530fcec2`
- Done: `61f69a4c`

**Which status to set:**
- Issue just created, not yet qa:ready: **Backlog**
- Issue has `qa:ready` label, unassigned: **Ready**
- Issue is assigned and being worked on: **In Progress**

This was discovered on 2026-03-22 when 5 sprint issues appeared in "No Status" on the board and 7 more were missing entirely.
