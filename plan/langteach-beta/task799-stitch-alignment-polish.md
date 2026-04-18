# Task 799: Edit Student + Log Session Stitch Alignment Polish

## Issue
#799 - Edit Student + Log Session: Stitch alignment polish

## Branch
`worktree-task-t799-stitch-alignment-polish` -> PR to `sprint/ui-redesign-student-polish`

## Context
Vera UX review (feedback3, sections 3D + 3E). Six targeted visual fixes: one medium (skill override pill redesign) and five low (border removals).

## Files Changed
- `frontend/src/pages/StudentForm.tsx`
- `frontend/src/pages/LogSession.tsx`
- `frontend/src/components/dashboard/CefrBadge.tsx` (export `cefrColors`)

## Acceptance Criteria and Implementation Plan

### AC1: Skill Overrides visual upgrade (MEDIUM) - StudentForm.tsx

**Current behavior:** Label above + CefrBadge (click-to-edit) when set, Label above + Select when not set.

**Requested:** Each skill shows a single pill with "skill name + CEFR level" (e.g. "Reading B2"), color-coded by CEFR band. No separate Label element.

**Implementation:**

1. Export `cefrColors` from `CefrBadge.tsx` (currently unexported).

2. In StudentForm.tsx, replace the current 2x2 grid (Label + badge/Select per skill) with 4 pills arranged in a 2x2 grid:
   - Each pill is a `<button>` showing "{skill} {level}" (e.g. "Reading B2") when a level is set, or "{skill} --" when not set.
   - Uses `cefrColors(level)` for set values; `bg-zinc-100 text-zinc-500` for unset.
   - On click: `setEditingCefrField(`skill-${skill}`)` (same as current).
   - The Select (invisible trigger) renders below the pill when `editingCefrField === `skill-${skill}`` to open the dropdown. Use a zero-height wrapper with `<Select open={true}>` to pop the dropdown without rendering a visible trigger.
   - Keep all `data-testid` attributes: pill button gets `data-testid={`skill-override-${skill.toLowerCase()}-badge`}`, Select trigger keeps `data-testid={`skill-override-${skill.toLowerCase()}`}`.

3. Layout: keep the `grid grid-cols-2 gap-3` wrapper, remove the `<Label>` element per skill.

### AC2: Remove section separator borders (LOW) - StudentForm.tsx

Replace `border-t border-zinc-100` with extra vertical padding:
- Line 840: `pt-4 border-t border-zinc-100 space-y-4` -> `pt-6 space-y-4`
- Line 1113: `space-y-3 pt-2 border-t border-zinc-100` -> `space-y-3 pt-4`
- Line 1228: `space-y-3 pt-2 border-t border-zinc-100` -> `space-y-3 pt-4`
- Line 1465: `pt-6 border-t border-zinc-100 space-y-2` -> `pt-8 space-y-2`

### AC3: Scrollspy nav bar border (LOW) - StudentForm.tsx

Line 656: `border-b border-zinc-100` -> `shadow-sm` (drop the border, add subtle shadow).

### AC4: Inactive badge border (LOW) - StudentForm.tsx

Line 646: Remove `border border-zinc-200` from the inactive student badge. Keep `bg-zinc-100 text-zinc-500` for tonal-only styling.

### AC5: Topic tag chip border (LOW) - LogSession.tsx

Line 1050: Remove `border border-indigo-200`, bump bg to `bg-indigo-100` and hover to `hover:bg-indigo-200` for tonal-only:
`bg-indigo-100 text-indigo-700 hover:bg-indigo-200`

### AC6: Discard button border (LOW) - LogSession.tsx

Line 881: Change `variant="outline"` to `variant="ghost"` and update className to `text-red-600 hover:bg-red-50`. This fully removes the border (ghost variant has no border) while keeping tonal red styling.

## E2E Coverage

No new e2e tests needed: all changes are visual-only. Existing e2e tests cover skill override functional behavior and button actions. The `data-testid` attributes are preserved.

## Unit Tests

No new unit tests needed. Logic is unchanged. CefrBadge already has its own test; exporting `cefrColors` does not require a new test.

## Review Routing

- `area:frontend` + `area:design` -> qa-verify, architecture-reviewer, review-ui
- No prompt changes -> no pedagogy/Sophy/prompt-health review
