---
name: Issue creation and management discipline
description: Issues must be fully decided with all labels at creation; batch related findings; close epics on split; verify board placement
type: feedback
originSessionId: 16259888-ac9c-4212-80e1-8b4865a397c7
---
Issues must be fully decided and properly labeled at creation, not retroactively fixed. **Full checklist: `.claude/procedures/issue-management.md`.**

**Why:** Claude has shipped issues with open decisions ("A or B"), missing size labels, missing milestones, and absent from the project board, all caught in batches across multiple sessions.

## At creation
- All four label types: priority, area, size, qa:ready (PM-session) or no qa:ready (run agent later).
- No "or", "consider", "options", "TBD", "alternatively" in the body. Resolve the decision first.
- Milestone + project board are atomic. Setting a milestone without adding to board (PVT_kwHOAF1Pks4BSLsS) = invisible to bots and humans. Do both in one set of tool calls.

## qa:ready label
- **PM session:** the PM conversation IS the QA gate. Add `qa:ready` directly at creation.
- **Outside PM (backlog, triage):** create without `qa:ready`, then run the qa-ready agent. The agent checks more than completeness (acceptance-criteria format, visual coverage, test traceability).

## Granularity
- **Group related fixes** into a single issue (same file, same PR, same skill).
- **Separate issues** only when work is genuinely independent (different area, different priority).
- Rule of thumb: if two fixes would be done in the same PR, they belong in the same issue.

## Epics
- Epics are temporary placeholders, not permanent containers.
- When split: create flat child issues, comment on epic ("Split into #N, #N"), close epic immediately with state_reason: completed.
- Don't keep epics open as parents with sub-issue links. Creates false partial-completion bars (e.g. "4/9 done") that don't reflect reality.

## Verify after creation
Don't trust that `issue_write` or `item-add` worked. Confirm the issue is on the board and in the correct status column.
