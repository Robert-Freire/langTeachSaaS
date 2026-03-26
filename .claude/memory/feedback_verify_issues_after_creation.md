---
name: Verify issues after creation
description: After creating GitHub issues, always verify correct milestone and board visibility before moving on
type: feedback
---

## The Problem

Issues have been created multiple times with the wrong milestone (e.g., milestone number 5 "Curriculum & Personalization" instead of milestone 10 "Student-Aware Curriculum"), causing them to be invisible in the sprint board view. The `add-to-board.sh` script also silently succeeds even when the item doesn't appear on the board.

## Required Checklist After Creating Any Issue

After creating one or more issues, always perform these two checks before reporting done:

### 1. Verify milestone
```bash
gh issue view <number> --json milestone --jq '.milestone.title'
```
Must match the active sprint name from `.claude/memory/project_langteach_task_status.md`. If wrong, fix immediately:
```
mcp__github__issue_write method=update milestone=<correct_number>
```

### 2. Verify board visibility
Use the MCP tool to confirm the item is on the board:
```
mcp__github__projects_list method=list_project_items owner=Robert-Freire project_number=2 query="is:issue #<number>"
```
If it returns empty, re-run `add-to-board.sh` and check again.

## Never Use Hardcoded Milestone Numbers

Always look up the active milestone number at creation time:
```bash
gh milestone list --state open --json number,title
```
Never guess or reuse a number from a previous sprint. Milestone numbers are not sequential in a predictable way.

## Why This Matters

Bots pick tasks from the board filtered by the current sprint milestone. Issues in the wrong milestone are invisible to them, causing the team to think there's no work available when there is.
