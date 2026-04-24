# Task 901: Session Inline Edit — Expanded Row with Editable Fields

## Issue
[#901](https://github.com/Robert-Freire/langTeachSaaS/issues/901)

## Problem
The expanded session row in SessionHistoryTab shows read-only fields only. The design system §8.3 requires Pattern A editable fields (title, narrative, duration, next-class plan) with inline autosave.

## Files to Change

- `frontend/src/components/session/SessionHistoryTab.tsx` — add editable inputs + autosave in `SessionEntry`
- `frontend/src/components/session/SessionHistoryTab.test.tsx` — update broken tests + add new unit tests
- `e2e/tests/student-detail.spec.ts` — add happy-path e2e for expand → edit → autosave → reload

## Approach

### SessionEntry component changes

Add four pieces of local state initialized from the session prop:
- `title: string` (from `session.title ?? ''`)
- `actualContent: string` (from `session.actualContent ?? ''`)
- `duration: string` (from `session.duration?.toString() ?? ''`) — string for input value
- `nextSessionTopics: string` (from `session.nextSessionTopics ?? ''`)

Wire `useSessionAutosave(studentId, getFormDataRef, session.id)` in edit mode. The `getFormData` ref builds a `CreateSessionLogRequest` from the session prop + current local state (preserving all other fields unchanged).

On each field's `onBlur`, call `saveNow()`. Show a shared `<SavedIndicator visible={status === 'saved'} />` in the expanded header area.

DS §8.3 says "Collapsing the row triggers save." Add a `handleCollapse` function that calls `saveNow()` then sets `expanded = false`. The collapse toggle button will call `handleCollapse` instead of directly toggling.

Replace read-only displays in the expanded section with editable inputs:
- `session-title-input`: `<Input>` for title
- `session-narrative-input`: `<Textarea>` for actualContent (narrative)
- `session-duration-input`: `<Input type="number">` for duration
- `session-next-plan-input`: `<Textarea>` for nextSessionTopics

Keep read-only displays for fields not in scope (homeworkAssigned, generalNotes, topicTags, etc.).

The autosave hook's `onSuccess` already updates `['sessions', studentId]` RQ cache, so the new value persists in-memory and survives collapse/reopen without a reload.

### getFormData ref shape

```ts
getFormDataRef.current = () => ({
  sessionDate: session.sessionDate,
  plannedContent: session.plannedContent,
  actualContent: localActualContent,
  homeworkAssigned: session.homeworkAssigned,
  previousHomeworkStatus: session.previousHomeworkStatusName || 'NotApplicable',
  nextSessionTopics: localNextSessionTopics || null,
  generalNotes: session.generalNotes,
  levelReassessmentSkill: session.levelReassessmentSkill,
  levelReassessmentLevel: session.levelReassessmentLevel,
  linkedLessonId: session.linkedLessonId,
  topicTags: session.topicTags,
  isCancelled: session.isCancelled,
  status: session.statusName,
  duration: localDuration ? parseInt(localDuration, 10) : null,
  title: localTitle || null,
  mentionedDifficultyPairs: JSON.parse(session.mentionedDifficultyPairs || '[]') as { Competency: string; Subcategory: string }[],
  suggestedDifficulties: JSON.parse(session.suggestedDifficulties || '[]') as SuggestedDifficulty[],
})
```

Note: `patchSessionField` already handles this full-payload pattern. We will NOT use `patchSessionField` directly (it creates its own mutation). Instead we use `useSessionAutosave` as required by the issue.

### Test changes

Tests expecting `session-title-display` to exist and `session-title-input` to NOT exist need updating:
- Line 235-244: update to expect `session-title-input` when expanded (and NOT `session-title-display`)
- Line 246-255: update to expect `session-narrative-input` when expanded
- Line 371-381: update to expect `session-next-plan-input` when expanded

New unit tests to add:
1. Expanding a row renders `session-title-input`, `session-narrative-input`, `session-duration-input`, `session-next-plan-input`
2. Editing title field and blurring fires `updateSession` with new title
3. After successful autosave, RQ cache update causes re-render with saved value when reopened
4. Collapsing fires save (calls updateSession)
5. SavedIndicator appears after successful save

### E2E test

File: `e2e/tests/student-detail.spec.ts` (add to existing).

Happy path:
1. Navigate to Diego Seed's student detail
2. Click Sessions tab
3. Expand first session entry
4. Edit title input
5. Blur / Tab away
6. Wait for `data-testid="saved-indicator"` to appear
7. Reload page
8. Expand same session, verify new title persists

## Acceptance Criteria Coverage

- [x] Editable inputs for title, duration, narrative, next-class plan
- [x] Autosave pattern with SavedIndicator per §8.2
- [x] `session-title-input` exists and is editable
- [x] Visual spec `@visual ... expanded row with editable fields` passes (expects `session-title-input`)
- [x] Collapsing fires pending autosave
- [x] Unit test covering expand → edit → autosave → collapse → reopen → value persists
- [x] E2E spec under `e2e/tests/student-detail/` covers happy path

## Out of scope
- Collapsed row layout changes
- Legacy session edit modal at `/sessions` list
- Fields beyond title, narrative, duration, next-class plan
