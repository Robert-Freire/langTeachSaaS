---
name: Trust memory selectively, verify volatile state
description: Trust memory for stable facts (architecture, completed work, conventions); always verify volatile state (next task, new sub-tasks) against source files
type: feedback
---

## Trust memory for (skip file reads)
- Architecture, stack details, conventions
- What has been built, how components work
- Key deviations and gotchas from past tasks

These change slowly. If memory describes them, don't re-read source files just to confirm.

## Always verify against source for
- **"What's next"**: check the beta plan's "Next task" line (`plan/langteach-beta/plan.md`), don't rely on the memory pointer alone
- **Task list completeness**: new sub-tasks (e.g., T19.1) get added mid-session and may not be in memory yet
- **Files you're about to modify**: always read before editing, regardless of memory

The distinction: stable knowledge (architecture, completed work) can be trusted from memory. Volatile pointers (current task, what exists in the backlog) should be verified because they change every session and are the most likely to go stale.
