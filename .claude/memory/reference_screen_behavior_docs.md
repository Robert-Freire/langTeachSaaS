---
name: Screen behavior documentation (Vera)
description: Folder where Vera stores per-screen behavior references, state logic, and test scenarios. Read before reviewing or seeding any screen.
type: reference
---

Screen behavior docs live at:
`plan/langteach-beta/scenarios-by-screen.vera/`

One file per screen. Each file has three sections:
1. **Quick Reference** -- mental model in under 20 lines, read this first
2. **Full Behavior** -- exact render conditions per component and state
3. **Test Scenarios** -- named seed students and required data fields to exercise every state

## Current files

| File | Screen | Last updated |
|------|--------|-------------|
| `dashboard-behavior.md` | Dashboard (4 zones: NextSessionHero, TodayAgenda, PendingFollowups, StudentRoster) | 2026-04-15 |

## Convention

When Vera reviews a new screen, she creates a new file here named `<screen>-behavior.md`.
When a screen is revisited, update the existing file rather than creating a new one.
