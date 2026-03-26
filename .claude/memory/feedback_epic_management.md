---
name: Epic management policy
description: Epics are temporary placeholders — close them immediately when split, never keep them open as parent containers
type: feedback
---

## The Rule

**An epic is a temporary placeholder, not a permanent container.**

When an epic is split into implementable issues:
1. Create the standalone child issues (no sub-issue links needed)
2. Add a comment to the epic listing what it became: "Split into #N, #N, #N"
3. **Close the epic immediately** with state_reason: completed
4. All sprint work happens through the flat, independent child issues

## What NOT to Do

- Do not keep the epic open as a parent with sub-issue links
- Do not do sprint work through a mix of sub-issues and standalone issues
- Do not retroactively link completed work as sub-issues — it creates false progress bars (e.g., "4/9 done") that don't reflect reality

## Why

Epics often get partially implemented through work that happens across multiple sessions before a formal split. Keeping them open as containers creates:
- Confusing partial completion states on the board
- Ambiguity about what's "inside" vs "outside" the epic
- Bots that can't pick up work because the epic has no qa:ready

## Example

Epic #206 was split into #289, #290, #291, #292. The correct action was:
1. Create #289-292 as standalone issues in the active sprint milestone
2. Comment on #206: "Split into #289, #290, #291, #292"
3. Close #206 immediately

## On Existing Epics

Apply this rule going forward. For any currently open epic that has been split, close it with a comment summarizing the child issues.
