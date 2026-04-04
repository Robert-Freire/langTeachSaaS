# Task 462: History tab UX - fix expand duplication, add delete confirmation

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/462

## Problem analysis

### 1. Expand duplication
`SessionHistoryTab.tsx` `SessionEntry` component has two areas showing `plannedContent` and `actualContent`:
- **Collapsed preview** (the button, always visible): shows them with `truncate`, labeled "Planned:" / "Done:"
- **Expanded detail** (below the button, only when expanded): shows them in full with headers "What was planned" / "What was done"

When the user expands an entry, content appears twice. Fix: hide `plannedContent` and `actualContent` in the collapsed preview when `expanded === true`.

### 2. Delete confirmation
An `AlertDialog` with full confirmation flow is already implemented (lines 244-283). The Base UI `render` prop pattern is used correctly. The existing test at line 145 tests for it. This issue is already resolved in code.

## Changes

### `frontend/src/components/session/SessionHistoryTab.tsx`
- Add `{!expanded && session.plannedContent && (...)}` guard around planned content preview row
- Add `{!expanded && session.actualContent && (...)}` guard around actual content preview row

### `frontend/src/components/session/SessionHistoryTab.test.tsx`
- Add test: "hides planned/actual preview when expanded (no duplication)"
- Add test: "does not call deleteSession without confirmation"

### `e2e/tests/session-log.spec.ts`
- Add test: expand/collapse a session entry
- Add test: delete with confirmation dialog

## Acceptance criteria
- [ ] Collapsed: planned and actual content visible with truncation
- [ ] Expanded: planned and actual content visible only in detail section (not duplicated in preview)
- [ ] Delete button opens confirmation dialog, not direct delete
- [ ] Cancel in dialog does not delete
- [ ] Confirm in dialog deletes the session
