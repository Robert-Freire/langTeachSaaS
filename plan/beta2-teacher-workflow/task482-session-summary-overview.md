# Task 482: Surface session summary on Overview tab

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/482

## Problem
The Overview tab has no session data. Teachers need at-a-glance: last session, open action items, level reassessment flag.

## Acceptance criteria
- [ ] Overview tab shows last session date and time-distance label ("3 days ago")
- [ ] Overview tab shows total sessions count
- [ ] Open action items from the most recent session are visible
- [ ] Level reassessment badge appears when a reassessment is flagged
- [ ] No data shown (graceful empty state) if student has no sessions yet

## Existing components
- `SessionSummaryHeader` (`frontend/src/components/session/SessionSummaryHeader.tsx`) already implements ALL five ACs:
  - Fetches `GET /api/students/{studentId}/sessions/summary` via `getSessionSummary`
  - Shows total sessions + last session date + relative time
  - Collapsible action items list
  - Collapsible level reassessment badge
  - "No sessions yet" empty state when `totalSessions === 0`
  - Skeleton loading state
  - Returns null on error (graceful)

## Implementation

### 1. `frontend/src/pages/StudentDetail.tsx`
- Import `SessionSummaryHeader` from `@/components/session/SessionSummaryHeader`
- Add `<SessionSummaryHeader studentId={student.id} />` as the first child of the overview `TabsContent`, before `<StudentProfileOverview>`

### 2. `frontend/src/pages/StudentDetail.test.tsx`
- Add mock for `SessionSummaryHeader` (consistent with other mocked child components)
- Add test: "shows session summary header on overview tab"

## No backend changes needed
The `/api/students/{studentId}/sessions/summary` endpoint already exists (added in task 445).

## E2E coverage
The existing `e2e/tests/visual/student-detail.visual.spec.ts` uses a `[visual-seed]` student (Ana Visual/Marco Visual) who has no sessions -- the screenshot will show the "No sessions yet" empty state (covers AC #5).

Add a new `@visual student detail - overview with sessions` test that:
1. Fetches `[scenario-seed]` students, uses Diego Seed (who has 2 session logs)
2. Navigates to their Overview tab
3. Screenshots as `screenshots/student-detail-overview-sessions.png`

To find Diego Seed: fetch all students, filter `notes === '[scenario-seed]'`, then hit `/api/students/{id}/sessions/summary` for each and pick the first with `totalSessions > 0`.

## Review routing
- area:frontend: code review + architecture review + review-ui
