# Task 484 — Homework Status Badge in Lesson History Cards

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/484

## Summary
Add a colour-coded homework status badge to lesson history cards alongside the "Homework:" note. The badge shows `PreviousHomeworkStatus` from the chronologically next session log after each lesson (where the teacher recorded whether the student did their homework).

## Acceptance Criteria
- [ ] Session timeline card shows a homework status badge when the following session recorded a homework result
- [ ] Badge is colour-coded: Done (green), Partial (amber), Not done (red)
- [ ] No badge shown if there is no following session or status is NotApplicable
- [ ] Unit test covers badge rendering logic

## Data Flow

### Where the data lives
- `SessionLog.PreviousHomeworkStatus` (enum: NotApplicable=0, NotDone=1, Partial=2, Done=3)
- A session log on date D2 records whether the student did the homework from the previous session (date D1 < D2)
- The "following session" for lesson L is the session log with `SessionDate > L.ScheduledAt` (nearest in time, same student/teacher)

### Current state
- `LessonHistoryEntryDto` does NOT include any session log field
- `LessonHistoryCard.tsx` shows `homeworkAssigned` text but no completion status
- `SessionHistoryTab.tsx` already has `HOMEWORK_STATUS_STYLES` and `HOMEWORK_STATUS_LABELS` constants for the same enum

## Plan

### 1. Backend — extend DTO and query

**`backend/LangTeach.Api/DTOs/LessonHistoryEntryDto.cs`**
- Add two new positional parameters at the end:
  - `HomeworkStatus? FollowingSessionHomeworkStatus`
  - `string? FollowingSessionHomeworkStatusName`

**`backend/LangTeach.Api/Services/LessonNoteService.cs` — `GetLessonHistoryAsync`**
- Two-step projection to avoid EF Core SQL translation of `.ToString()`:
  - Step 1 (SQL): In the `.Select()` projection, add a correlated subquery to get the raw `HomeworkStatus?` value:
    - Same teacher, same student, not deleted
    - `SessionDate > (lesson.ScheduledAt ?? lesson.CreatedAt)`
    - `OrderBy(sl => sl.SessionDate).Select(sl => (HomeworkStatus?)sl.PreviousHomeworkStatus).FirstOrDefault()`
    - Project to an anonymous type including `FollowingSessionHomeworkStatus`
  - Step 2 (in-memory, after `ToListAsync`): Map the anonymous type to `LessonHistoryEntryDto`, computing `FollowingSessionHomeworkStatusName` as `homeworkStatus?.ToString()`

**`backend/LangTeach.Api.Tests/Controllers/LessonNotesControllerTests.cs`**
- Add a test: lesson with homework assigned + a following session log with `HomeworkStatus.Done` -> entry has `FollowingSessionHomeworkStatus = Done`
- Add a test: lesson with homework assigned + no following session -> field is null

### 2. Frontend — interface + badge component

**`frontend/src/api/students.ts`**
- Add to `LessonHistoryEntry`:
  - `followingSessionHomeworkStatus: number | null`
  - `followingSessionHomeworkStatusName: string | null`

**`frontend/src/components/student/LessonHistoryCard.tsx`**
- Extract (or inline) `HOMEWORK_STATUS_STYLES` constants matching `SessionHistoryTab.tsx`
- In the `homeworkAssigned` row, add a small `<Badge>` after the text when:
  - `entry.followingSessionHomeworkStatusName` is not null
  - AND value is not `'NotApplicable'`
- Label: "Done" / "Partial" / "Not done"
- Add `data-testid="lesson-history-hw-status-badge"` for testing

**`frontend/src/components/student/LessonHistoryCard.test.tsx`**
- Test: entry with `homeworkAssigned` + `followingSessionHomeworkStatusName: 'Done'` -> badge shown with green style
- Test: entry with `homeworkAssigned` + `followingSessionHomeworkStatusName: 'Partial'` -> amber badge
- Test: entry with `homeworkAssigned` + `followingSessionHomeworkStatusName: 'NotDone'` -> red badge
- Test: entry with `homeworkAssigned` + `followingSessionHomeworkStatusName: 'NotApplicable'` -> no badge
- Test: entry with `homeworkAssigned` + `followingSessionHomeworkStatusName: null` -> no badge
- Test: entry WITHOUT `homeworkAssigned` (null) + status present -> no badge (homework row is hidden anyway)

## No E2E Test Needed
The badge is entirely frontend rendering logic driven by a field already returned by the API. The session log creation (which populates the field) is covered by existing session-log e2e tests. A unit test covering badge rendering is sufficient per the AC.

## Files Changed
- `backend/LangTeach.Api/DTOs/LessonHistoryEntryDto.cs`
- `backend/LangTeach.Api/Services/LessonNoteService.cs`
- `backend/LangTeach.Api.Tests/Controllers/LessonNotesControllerTests.cs`
- `frontend/src/api/students.ts`
- `frontend/src/components/student/LessonHistoryCard.tsx`
- `frontend/src/components/student/LessonHistoryCard.test.tsx`
