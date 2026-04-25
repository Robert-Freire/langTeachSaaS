---
name: Memory hygiene
description: Trust memory for stable facts; verify GitHub for volatile state; preserve task_status format (script-parsed); don't log per-issue snapshots
type: feedback
originSessionId: 16259888-ac9c-4212-80e1-8b4865a397c7
---
## Trust memory for (skip file reads)
- Architecture, stack, conventions
- Sprint branch name, milestone sequence
- Past task gotchas

These change slowly. If memory describes them, don't re-read source files just to confirm.

## Always verify against live sources for
- **Issue/PR state**. NEVER cite an issue as open/closed/in-progress based on memory. Query GitHub. Memory snapshots go stale within a session.
- **Sprint progress**. Query GitHub for open issues in the active milestone.
- **Task list completeness**. New issues get added between sessions, not in memory.
- **Files about to modify**. Always read before editing, regardless of memory.

**Why:** PM startup once said #269 and #379 were "loose ends" when both had been closed days earlier. Stale memory caused investigation of non-issues.

## Don't log per-issue status
After completing a sprint or task, update `project_langteach_task_status.md` with sprint branch name, milestone status changes (ACTIVE/CLOSED), and upcoming milestones. **Not** per-issue entries ("#269 DONE, PR #401"). GitHub is source of truth; per-issue entries duplicate it and rot fast.

## Preserve task_status format (script-parsed)
`project_langteach_task_status.md` is parsed by `.claude/scripts/task-pick.py` (and possibly others) with regex. Two formats must keep working:
- Sprint branch line: `**Active sprint branch:** \`sprint/<slug>\``
- Milestone table row: `| Name | ACTIVE | notes |`

Before changing structure, `grep -r "project_langteach_task_status" .claude/scripts/` and update parsers in the same change.

## Plans get indexed
When a plan is saved, add an entry to `project_langteach_plans.md` immediately so the location is findable next session.
