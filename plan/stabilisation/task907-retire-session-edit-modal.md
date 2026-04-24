# Task #907: Retire Legacy Session-Edit Modal

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/907

## Context
The legacy session-edit modal was removed in a prior sprint, but the Sessions page (`/sessions`) row click still navigates to `/students/${studentId}` (student detail) rather than to the LogSession page in edit mode. The `session-log-voice.spec.ts` e2e tests also reference stale testids (`session-log-dialog`, `submit-session-log`, `session-log-success`) that no longer exist in the frontend. These were tracked in `plan/observed-issues.md` (entry 2026-04-22).

## Findings

### `SessionEditDialog` / `session-history-edit-dialog`
Confirmed absent from codebase. AC "legacy modal deleted" is already satisfied.

### `Sessions.tsx` (the main fix)
- Row click: `onClick={() => onSessionClick(s.studentId)}` → navigates to `/students/${sId}`
- Must change to: navigate to `/students/${sId}/sessions/${slId}/edit` (LogSession edit mode)
- `SessionListItem.sessionLogId` is the session ID to pass

### Route
`/students/:id/sessions/:sessionId/edit` already maps to `<LogSession />` in `App.tsx:57`. No backend or route changes needed.

### Unit tests
- `Sessions.test.tsx:122` – `expect(mockNavigate).toHaveBeenCalledWith('/students/student-1')` must be updated

### E2E tests
- `sessions.spec.ts` test "clicking session row navigates to student detail" → update expected URL
- `session-log-voice.spec.ts` tests 1, 3, 6 reference `session-log-dialog` / `submit-session-log` / `session-log-success` / `session-title-display` which don't exist. Rewrite to use page-based flow.

## Implementation Plan

### Step 1: Sessions.tsx
Change the click handler to navigate to LogSession edit mode.

```tsx
// SectionProps: change signature
onSessionClick: (studentId: string, sessionLogId: string) => void

// handleSessionClick
const handleSessionClick = (sId: string, slId: string) =>
  navigate(`/students/${sId}/sessions/${slId}/edit`)

// SessionRow: pass sessionLogId
onClick={() => onSessionClick(session.studentId, session.sessionLogId)
```

### Step 2: Sessions.test.tsx
Update the unit test to expect the new navigation target:
```
expect(mockNavigate).toHaveBeenCalledWith('/students/student-1/sessions/sl-future/edit')
```

### Step 3: e2e/tests/sessions.spec.ts
Update test (rename to "clicking session row navigates to LogSession edit mode"):
```
await expect(page).toHaveURL(/\/students\/.+\/sessions\/.+\/edit/, { timeout: NAV_TIMEOUT })
```

### Step 4: e2e/tests/session-log-voice.spec.ts
Rewrite the 3 broken tests to use the LogSession page flow:

**Test 1** ("voice upload: extracted fields pre-fill form, Confirm saves as Confirmed"):
- Click `log-session-button` → wait for `log-session-page` visible
- Upload audio via `audio-file-input`
- Wait for `extracting-indicator` visible → hidden
- Verify extracted fields (testids already correct: `actual-content`, `homework-assigned`, `next-session-topics`, `session-date`, `session-time`, `topic-tag-remove-0`)
- Click `done-btn` → navigate back to student detail
- Click sessions history tab
- Verify: `session-entry` visible, no `draft-badge` (autosave sends `status: 'Confirmed'`)
- Click `session-entry-toggle` to expand entry
- Verify `session-title-input` value equals `[Extracted] Session title`

**Test 3** ("voice recorder is accessible from the Lesson editor"):
- Click `log-session-btn` → wait for `log-session-page` visible (URL: `/students/.../log-session?lessonId=...`)
- Check `voice-recorder-section` visible

**Test 6** ("second voice note updates draft, does not create a duplicate"):
- Navigate to log session page via `log-session-button`
- Upload audio 1 → wait for extraction
- Upload audio 2 → wait for `extracting-indicator` visible → hidden
- Click `done-btn` → navigate back
- Click history tab
- Check: exactly 1 `session-entry` (not 2)

### Step 5: Visual spec
Create `plan/langteach-beta/scenarios-by-screen.vera/sessions-behavior.md` documenting:
- Row click on `/sessions` navigates to LogSession in edit mode

## Files Changed
- `frontend/src/pages/Sessions.tsx`
- `frontend/src/pages/Sessions.test.tsx`
- `e2e/tests/sessions.spec.ts`
- `e2e/tests/session-log-voice.spec.ts`
- `plan/langteach-beta/scenarios-by-screen.vera/sessions-behavior.md` (new)

## Out of Scope
- Any new capabilities on LogSession page
- Redesign of /sessions list row
- Inline editing on /sessions list
