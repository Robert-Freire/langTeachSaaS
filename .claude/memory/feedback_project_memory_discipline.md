---
name: Project memory discipline — always write status after each task
description: After completing any task, save task status, what was built, and next steps to memory
type: feedback
---

## Rule
At the end of every session where a task is completed (commit, PR opened, or significant progress made), update `project_langteach_task_status.md` with:
- Which task was just completed and what it built (one sentence), marked DONE with PR number
- What the next task is and its scope (update the "Next task" pointer)
- Any new sub-tasks that were added during the task (e.g., T19.1 spawned from T19)
- Any open questions or blockers

**Critical:** The memory task table must stay in sync with the beta plan. If the plan file adds new tasks or changes the "Next task" pointer, the memory must reflect that too. The memory is what future sessions read first, so stale pointers cause wrong task prioritization.

## Why
Without this, the next session opens with no project context and wastes tool calls re-reading requirements, plans, and git history to reconstruct state that should already be in memory.

## Also applies to plan creation
When a plan is written and saved, add an entry to `project_langteach_plans.md` immediately so the location is indexed.
