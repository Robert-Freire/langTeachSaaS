---
name: Project memory discipline — update stable references, not issue status
description: After sprints/milestones, update milestone sequence and sprint branch. Do NOT log per-issue status (it goes stale).
type: feedback
---

## Rule
After completing a sprint or milestone change, update `project_langteach_task_status.md` with:
- New sprint branch name
- Milestone status change (ACTIVE/CLOSED)
- Any new upcoming milestones

**Do NOT log per-issue status** (e.g., "#269 DONE, PR #401 merged"). This duplicates GitHub and goes stale by next session. GitHub is the source of truth for issue state.

## Why
The old rule was "log every completed task with PR number." This produced a 200-line file of issue snapshots that was wrong by next session. On 2026-04-03, stale per-issue entries caused the PM to present closed issues as open loose ends.

## Also applies to plan creation
When a plan is written and saved, add an entry to `project_langteach_plans.md` immediately so the location is indexed.
