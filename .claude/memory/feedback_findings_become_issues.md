---
name: Every finding and deferral becomes a GitHub issue
description: Review findings, deferred items, and "we will do this later" intents must be filed as GitHub issues immediately, otherwise they are lost
type: feedback
originSessionId: 16259888-ac9c-4212-80e1-8b4865a397c7
---
Every finding with severity >= minor and every deferred intent must have a GitHub issue. If it's not in GitHub, it's lost. Backlogs and plan files are supplementary, not storage.

**Why:** During Pedagogical Quality sprint close, Isaac detected 4 findings. Only 1 was filed, 3 were written to a markdown report and discovered missing a week later. Same pattern with code-review backlog items and "we can do this later" deferrals.

## Workflow
1. When analysis produces findings or proposed deferrals, name a target milestone.
2. If user accepts, **immediately** create the issue(s). Don't wait, don't batch into "next session."
3. Reference the new issue number when reporting the deferral, so traceability is explicit.
4. Never list deferred items only in plan files, backlogs, or conversation summaries.

## Backlog files are batch points, not permanent storage
`plan/code-review-backlog.md`, `plan/ui-review-backlog.md`, `plan/observed-issues.md`, `plan/ui-review-skipped.md` are collection points to **batch into themed issues** at sprint close. They must be cleared after triage. See sprint-lifecycle.md Stage 1.
