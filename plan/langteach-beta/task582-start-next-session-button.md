# Task 582 — "Start next session" button on session card

## Issue
#582 feat: "start next session" button on session card, pre-populated from NextSessionTopics

## Summary
Pure frontend change. No backend API changes required — `createSession` already accepts `plannedContent`.

## Changes

### 1. `SessionLogDialog.tsx`
- Add optional prop `initialPlannedContent?: string | null`
- In the create-mode init `useEffect` (which runs when `open && !initialSession`), if `initialPlannedContent` is set, call `setPlannedContent(initialPlannedContent)`
- Adjust `isDirty` baseline for create mode: replace `autoPlannedContent` with `initialPlannedContent ?? autoPlannedContent` so the dialog isn't considered dirty immediately on open

### 2. `SessionHistoryTab.tsx`
- Add state: `startNextSession: SessionLog | null`, `startNextSessionDialogOpen: boolean`
- Add handler: `handleStartNextSession(session: SessionLog)` — sets state and opens dialog
- Pass `onStartNextSession` prop down to `SessionEntry`
- Render a second `SessionLogDialog` instance (create mode, `initialPlannedContent={startNextSession.nextSessionTopics}`)
- In `SessionEntry` expanded section: add "Start next session" button, visible only when `session.nextSessionTopics` is non-empty

### 3. Unit tests
- `SessionHistoryTab.test.tsx`: assert button absent when `nextSessionTopics` is null, present when set; clicking opens dialog with planned-content pre-filled
- `SessionLogDialog.test.tsx`: assert `initialPlannedContent` pre-fills planned-content textarea

### 4. E2E test
- Add to `e2e/tests/session-log.spec.ts`: create session with nextSessionTopics, click "Start next session", verify form opens with planned content pre-filled, save, verify original session unchanged

## Acceptance criteria coverage
- [x] Button visible only when `nextSessionTopics` non-empty
- [x] Opens Log Session form with `plannedContent` pre-filled from `nextSessionTopics`
- [x] Teacher can modify before saving
- [x] Saving creates new `SessionLog` for same student
- [x] Original session's `nextSessionTopics` not modified
