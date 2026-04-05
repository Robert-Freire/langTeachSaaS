# Task 485 — UX: Distinguish actionable vs contextual observations in timeline card count

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/485

## Problem
Session timeline cards show a generic "N notes" count combining `nextSessionTopics` (action items) and `generalNotes` (contextual). Actionable items deserve more visual prominence.

## Acceptance Criteria
- [ ] Timeline card shows separate counts for `nextSessionTopics` (action items) and `generalNotes`
- [ ] Action items use a distinct visual treatment from general notes (amber vs grey)
- [ ] No count shown for a type if it is null or empty
- [ ] Unit test covers the count rendering logic

## Scope

**Only `SessionHistoryTab.tsx`** — that is where session timeline cards live.

The `LessonHistoryCard.tsx` is a separate component showing lesson-based notes (not session logs) and is out of scope.

## Changes

### `frontend/src/components/session/SessionHistoryTab.tsx`

1. Remove `notesCount(session)` function (lines 53-58).
2. In `SessionEntry`, compute two separate booleans:
   ```ts
   const hasActionItem = Boolean(session.nextSessionTopics)
   const hasNote = Boolean(session.generalNotes)
   ```
3. Replace the single notes count display (the `{notes > 0 && ...}` block) with:
   - If `hasActionItem`: amber dot + "1 action item" with `data-testid="action-item-count"`
   - If `hasNote`: grey dot + "1 note" with `data-testid="general-note-count"`
   - Render both when both are present (separated by a middot or just side by side)
   - Use `·` separator between them when both are present, or render independently

   Visual treatment:
   - Action item: `inline-flex items-center gap-1 text-xs text-amber-600` with an amber dot (filled circle, `bg-amber-400 rounded-full w-1.5 h-1.5`)
   - General note: `inline-flex items-center gap-1 text-xs text-zinc-400` with grey dot (`bg-zinc-300 rounded-full w-1.5 h-1.5`) or keep `FileText` icon

### `frontend/src/components/session/SessionHistoryTab.test.tsx`

1. Update existing test "shows notes count when generalNotes and nextSessionTopics are set" — it currently asserts `2 notes` (generic), replace with assertions on the two separate elements.
2. Add tests:
   - Only nextSessionTopics set: shows "1 action item", no note count
   - Only generalNotes set: shows "1 note", no action item count
   - Neither set: neither indicator shown

## Data model note
`nextSessionTopics` and `generalNotes` are free-text strings (null or non-empty). Each contributes at most 1 count. No plural logic needed beyond "1 action item" / "1 note" (always singular).

## No backend changes needed
The API already returns both fields on the `SessionLog` DTO.
