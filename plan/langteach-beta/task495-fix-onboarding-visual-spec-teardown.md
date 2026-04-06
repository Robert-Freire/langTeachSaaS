# Task 495 — Fix onboarding visual spec teardown: FK constraint when deleting students with session logs

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/495

## Problem analysis

The `onboarding.visual.spec.ts` calls `resetE2ETestTeacher()` in `beforeAll` to reset the e2e teacher to a clean state. The visual seed (`SeedScenarioStudentsAsync`) creates session logs for "Diego Seed" student. The `SessionLogs.StudentId` FK has `OnDelete(DeleteBehavior.NoAction)`, meaning it is not cascade-deleted when the student is deleted.

When `DELETE FROM Teachers WHERE Email = @email` runs, SQL Server cascades to `Students` (via `Students.TeacherId CASCADE`). Before cascading to delete those students, SQL Server checks NoAction FK constraints that reference the Students being deleted. Session logs referencing those students would block the delete.

**Note on SQL Server NoAction semantics:** `NoAction` in SQL Server means the constraint is checked *after* all CASCADE operations in the statement complete, not immediately. This means the fix needs to handle rows that are NOT cleaned up via any cascade chain.

## Fix already applied (commit 8165735)

Commit `8165735` ("fix(e2e): delete session logs before teacher reset in resetE2ETestTeacher") added an explicit session log deletion before the teacher delete:

```typescript
await pool.request()
  .input('email', sql.NVarChar, E2E_TEST_EMAIL)
  .query(`
    DELETE sl FROM SessionLogs sl
    INNER JOIN Students s ON sl.StudentId = s.Id
    INNER JOIN Teachers t ON s.TeacherId = t.Id
    WHERE t.Email = @email
  `)
await pool.request()
  .input('email', sql.NVarChar, E2E_TEST_EMAIL)
  .query('DELETE FROM Teachers WHERE Email = @email')
```

## Cascade analysis - why no other manual deletions are needed

Other tables with NoAction FKs on StudentId:
- `Courses.StudentId` (NoAction) — also has `Courses.TeacherId` CASCADE, so Courses are deleted in the Teacher cascade chain before NoAction check
- `Lessons.StudentId` (NoAction) — also has `Lessons.TeacherId` CASCADE, same reasoning
- `LessonNotes.StudentId` (NoAction) — LessonNotes have `LessonId` CASCADE, so they are deleted when Lessons cascade-delete, before NoAction check

Other potential FK issues introduced in the adaptive-replanning sprint:
- `VoiceNotes.TeacherId` (CASCADE) — no StudentId FK, no issue
- `CourseSuggestions.CourseId` (CASCADE) — no StudentId FK
- `TelegramLinks.TeacherId` (CASCADE) — no StudentId FK
- `LessonContentBlocks.LessonId` (CASCADE) — no StudentId FK

**Conclusion:** The session log explicit delete is the only manual deletion needed. All other NoAction FK columns are satisfied after cascades complete.

## Remaining work

The fix is already in place. This task requires:

1. Verify the onboarding visual spec passes end-to-end by running it against the visual stack
2. Confirm no FK errors in the teardown

## E2e verification plan

Run the onboarding visual spec in isolation:
```bash
cd e2e && npx playwright test tests/visual/onboarding.visual.spec.ts --project=visual
```

Acceptance criteria:
- All tests PASS including `beforeAll` (resetE2ETestTeacher) and `afterAll` (reseedVisualData)
- No FK constraint errors in teardown logs
