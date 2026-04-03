---
name: Trust memory selectively, verify volatile state
description: Trust memory for stable facts (architecture, conventions); always query GitHub for issue/sprint status. Memory snapshots of issue state are stale by next session.
type: feedback
---

## Trust memory for (skip file reads)
- Architecture, stack details, conventions
- Sprint branch name, milestone sequence
- Key deviations and gotchas from past tasks

These change slowly. If memory describes them, don't re-read source files just to confirm.

## Always verify against live sources for
- **Issue status**: NEVER cite an issue as open/closed/in-progress based on memory. Query GitHub (`gh issue list` or `mcp__github__issue_read`). Memory snapshots of per-issue status are stale by next session.
- **Sprint progress**: query GitHub for open issues in the active milestone, don't summarize from memory.
- **Task list completeness**: new issues get added between sessions and won't be in memory.
- **Files you're about to modify**: always read before editing, regardless of memory.

**Why:** During PM startup on 2026-04-03, memory said #269 and #379 were "loose ends" when both had been closed days earlier. This led to presenting stale information and wasting time investigating non-issues.

**How to apply:** At PM startup, read the task status memory only for sprint branch name and milestone sequence. Then query GitHub for live issue state. Never say "the memory says X is open/closed" without verifying.
