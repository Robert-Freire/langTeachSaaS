# Task 580: Session log form loses unsaved data when clicking outside

## Problem
The `SessionLogDialog` passes `onOpenChange` directly to the Radix `Dialog`. Clicking outside or pressing Escape triggers `onOpenChange(false)` immediately, discarding all unsaved form data.

## Fix

### `isDirty` detection
- **Create mode**: any field non-empty beyond auto-populated planned content (from lesson props)
- **Edit mode**: snapshot initial values into a ref when `open && initialSession` useEffect runs; compare current state to snapshot

### Guard logic
Add `handleOpenChange(open: boolean)`:
- If `open === true`: pass through
- If `open === false` and `isDirty` and `!success`: show `showDiscardConfirm` dialog
- Otherwise: call `onOpenChange(false)` directly

The success auto-close timer calls `onOpenChange(false)` directly (bypasses guard naturally).

### Confirmation dialog
Use the existing `AlertDialog` component.
- Title: "You have unsaved changes"
- Description: "Discard them?"
- Actions: "Keep editing" (cancel) + "Discard" (close)

## Files changed
- `frontend/src/components/session/SessionLogDialog.tsx`
- `frontend/src/components/session/SessionLogDialog.test.tsx`

## Acceptance criteria
- [x] Clicking outside with unsaved changes shows confirmation
- [x] "Discard" closes without saving
- [x] "Keep editing" returns focus to form
- [x] Escape with data shows same guard
- [x] Empty/unchanged form closes without confirmation

## E2E
Add test to `e2e/tests/session-log.spec.ts`: fill a field, click outside, confirm dialog appears, click Discard, dialog closes.
