# Task 581: Show "Planned for next class" (NextSessionTopics) on Session Detail Card

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/581

## Goal
Make `NextSessionTopics` visually prominent and distinct on the session card so Jordi can quickly see what he planned for next class.

## Current State
- `nextSessionTopics` already exists in the backend and in `SessionLogDto`
- In expanded detail: rendered as "Topics for next session" with the same neutral styling as other fields (no visual distinction)
- In collapsed preview: shows an amber "1 action item" dot+badge but not the actual content
- Editing: done via the "Edit" button which opens `SessionLogDialog` (has a nextSessionTopics textarea)

## What Needs to Change

### 1. Visual distinction in expanded detail (`SessionHistoryTab.tsx` ~line 220)
Wrap the `nextSessionTopics` block in a visually distinct container:
- Background: `bg-amber-50` border `border-amber-200` rounded
- Label: rename from "Topics for next session" to "Planned for next class"
- Label color: `text-amber-700` (vs `text-zinc-500` for other fields)
- Add a small arrow/calendar icon (e.g. `ArrowRight` or `CalendarDays` from lucide-react) next to the label
- `data-testid="next-session-topics-section"`

### 2. Show content preview in collapsed row (`SessionHistoryTab.tsx` ~line 149)
Add a collapsed preview line for `nextSessionTopics` alongside the existing Planned/Done lines:
```tsx
{!expanded && session.nextSessionTopics && (
  <p className="text-xs text-amber-700 line-clamp-1">
    <span className="font-medium">Next:</span>{' '}
    {session.nextSessionTopics}
  </p>
)}
```
Place it after the `actualContent` line (before the homework row).

### 3. No backend changes needed
The field is already editable via the existing "Edit" button / `SessionLogDialog`.

## Files to Change
- `frontend/src/components/session/SessionHistoryTab.tsx` — display changes (visual treatment + collapsed preview)
- `frontend/src/components/session/SessionHistoryTab.test.tsx` — update existing tests for new label/testid, add tests for:
  - nextSessionTopics section is visually distinct (has `data-testid="next-session-topics-section"`)
  - collapsed preview shows "Next: {content}" when nextSessionTopics is set
  - collapsed preview does not show "Next:" when nextSessionTopics is null

## E2E Coverage
Add assertion in `e2e/tests/session-log.spec.ts` that the `next-session-topics-section` is visible when a session has `nextSessionTopics` data (the fixture at line 492 already sets this field).

## Acceptance Criteria Check
- [x] `NextSessionTopics` displayed with clear label "Planned for next class"
- [x] Visually distinct: amber background separates it from the current session's planned/actual sections
- [x] Editable: via existing Edit button -> SessionLogDialog (no change needed)
- [x] No backend changes required
