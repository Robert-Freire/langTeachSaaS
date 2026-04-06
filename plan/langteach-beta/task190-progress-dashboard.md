# Task 190: Progress Dashboard

## Issue
#190 - Progress dashboard: planned vs. actual coverage, student trajectory

## Acceptance Criteria
- [ ] Teacher can view a progress summary for any student with an active course
- [ ] Curriculum coverage is shown as a visual checklist or progress bar
- [ ] Pacing indicator compares actual progress to planned schedule
- [ ] Difficulty trends are visible (improving, stuck, new)
- [ ] Dashboard is accessible from student profile and course view

---

## Data Available

**CurriculumEntry.Status**: `planned` | `created` | `taught`
- `taught` = session done, counts as covered
- `created` = lesson exists but not yet delivered
- `planned` = not started

**Course**: `SessionCount` (planned total), `ExamDate` (optional deadline). Note: `LessonsCreated` does NOT exist on the model; derive `createdCount` from `Entries.Count(e => e.LessonId != null)` if needed.

**SessionLog**: dated records per student; `IsCancelled` flag; non-cancelled = actual session done

**Student.Difficulties**: JSON list of `DifficultyDto` with `Trend` (`improving`/`stable`/`worsening`), `Status` (`Active`/`Covered`), `Competency`, `Subcategory`, `Id`, `Severity`

---

## Backend Plan

### 1. `ProgressDto.cs`

```csharp
// GET /api/students/{studentId}/progress
public record StudentProgressDto(
    string StudentName,
    string? CourseName,
    Guid? CourseId,
    // Coverage
    int TotalEntries,
    int TaughtEntries,
    int CreatedEntries,
    int PlannedEntries,
    // Pacing
    int? PlannedSessionCount,
    int SessionsDone,
    DateOnly? ExamDate,
    string PacingStatus,        // "on-track" | "ahead" | "behind" | "unknown"
    int? DaysUntilExam,
    int? SessionsRemaining,
    // Difficulty trends
    List<DifficultyProgressDto> Difficulties,
    // Timeline
    List<TimelineEntryDto> Timeline
);

public record DifficultyProgressDto(
    string Id,
    string Description,
    string Competency,
    string Subcategory,
    string Severity,
    string Status,      // "Active" | "Covered"
    string Trend        // "improving" | "stable" | "worsening"
);

public record TimelineEntryDto(
    int OrderIndex,
    string Topic,
    string? GrammarFocus,
    string Status,          // "planned" | "created" | "taught"
    DateTime? SessionDate   // from session log if linked lesson has one
);
```

### 2. `IProgressService.cs` + `ProgressService.cs`

`GetAsync(teacherId, studentId, ct)` logic:
1. Load student (verify ownership, get Difficulties JSON)
2. Load most recent non-deleted course for this student (ordered by CreatedAt desc), include Entries
3. If no course: return partial DTO (null course fields, SessionsDone only)
4. Load session logs: non-deleted, non-cancelled, with SessionDate, ordered by date
5. Compute coverage: count entries by Status
6. Compute pacing:
   - `sessionsDone` = session logs count
   - If ExamDate present:
     - `courseStartDate` = `DateOnly.FromDateTime(course.CreatedAt)`
     - `daysTotal` = (ExamDate.Value.DayNumber - courseStartDate.DayNumber), floor to 1
     - `daysElapsed` = (today.DayNumber - courseStartDate.DayNumber), clamped to [0, daysTotal]
     - `expectedByNow` = daysElapsed / daysTotal * SessionCount
     - `ahead` if sessionsDone >= expectedByNow + 1.5, `behind` if sessionsDone <= expectedByNow - 1.5, else `on-track`
   - If no ExamDate and SessionCount > 0:
     - `pace` = sessionsDone / SessionCount
     - Determine expected pace based on weeks since course creation (assume 1 session/week)
     - `weeksElapsed` = (DateTime.UtcNow - course.CreatedAt).TotalDays / 7.0
     - `expectedByNow` = min(weeksElapsed, SessionCount)
     - Same thresholds
   - If SessionCount == 0: "unknown"
7. Compute `DaysUntilExam` and `SessionsRemaining` (SessionCount - sessionsDone, floor 0)
8. Map difficulties from student JSON
9. Build timeline: curriculum entries ordered by OrderIndex, with SessionDate from linked session log (via LessonId -> Lesson -> SessionLog)

For the timeline session date: join Entries -> Lesson -> SessionLogs where LinkedLessonId = lesson.Id, take the first confirmed session date.

### 3. `ProgressController.cs`

```
GET /api/students/{studentId}/progress
```

Route: `api/students/{studentId:guid}/progress`
Auth: `[Authorize]`
Returns 404 if student not found for this teacher.

Note: A separate `ProgressController` is used (not added to `StudentsController`) because the progress query is conceptually a separate concern. It follows the same `UpsertTeacherAsync` auth pattern used by all other student-scoped controllers.

### 4. `ProgressServiceTests.cs`

Test scenarios:
- No course: returns empty curriculum, sessions done count, "unknown" pacing
- Course with all taught entries: 100% coverage, pacing computed
- Ahead pacing (many sessions done early)
- Behind pacing (few sessions done, exam approaching)
- Difficulties: mixed trend values pass through correctly
- Timeline ordered by OrderIndex

---

## Frontend Plan

### Route
Add "Progress" tab to `StudentDetail.tsx` alongside Overview and History.

### `src/api/progress.ts`

```ts
GET /api/students/{studentId}/progress
-> StudentProgress type
```

### `src/components/student/ProgressDashboard.tsx`

Sections:
1. **Coverage** - progress bar (taught/total) + checklist of curriculum entries grouped by status
2. **Pacing** - icon + label ("On track", "Ahead", "Behind", "No data"), sessions done/planned, days until exam
3. **Difficulty Trends** - filter by trend; show improving (green), worsening (red), stable (gray); Covered items shown dimmed
4. **Timeline** - ordered list of curriculum entries with date if taught, showing planned vs actual

### `src/components/student/ProgressDashboard.test.tsx`

Tests:
- Renders coverage bar with correct percentage
- Shows "No active course" empty state
- Pacing chip renders correct label for each status
- Difficulty trends filter works
- Timeline entries ordered correctly

### `StudentDetail.tsx` changes

Add `<TabsTrigger value="progress">Progress</TabsTrigger>` and `<TabsContent value="progress"><ProgressDashboard studentId={student.id} /></TabsContent>`.

Add `useSearchParams` to read the `tab` query param and pass it as `defaultValue` to `<Tabs>`:
```tsx
const [searchParams] = useSearchParams()
const defaultTab = searchParams.get('tab') ?? 'overview'
// ...
<Tabs defaultValue={defaultTab}>
```
This makes the "View progress" link from CourseDetail work correctly via `/students/{id}?tab=progress`.

### `CourseDetail.tsx` changes

When course has a `studentId`, add a "View progress" link button next to or below the progress bar area, linking to `/students/{studentId}?tab=progress`.

---

## E2E Plan

### `e2e/tests/progress-dashboard.spec.ts`

Uses DemoSeeder student with a course. Steps:
1. Navigate to student detail
2. Click "Progress" tab
3. Assert coverage bar visible (data-testid="coverage-bar")
4. Assert pacing chip visible (data-testid="pacing-status")
5. Assert difficulty trends section visible
6. Assert timeline section visible
7. Navigate to course detail, assert "View progress" link present, click it, verify lands on progress tab

### `e2e/tests/visual/progress-dashboard.visual.spec.ts`

`@visual` test capturing the Progress tab screenshot for the demo student.

---

## File List

**Backend (new):**
- `backend/LangTeach.Api/DTOs/ProgressDtos.cs`
- `backend/LangTeach.Api/Services/IProgressService.cs`
- `backend/LangTeach.Api/Services/ProgressService.cs`
- `backend/LangTeach.Api/Controllers/ProgressController.cs`
- `backend/LangTeach.Api.Tests/Services/ProgressServiceTests.cs`

**Frontend (new):**
- `frontend/src/api/progress.ts`
- `frontend/src/components/student/ProgressDashboard.tsx`
- `frontend/src/components/student/ProgressDashboard.test.tsx`

**Frontend (modified):**
- `frontend/src/pages/StudentDetail.tsx` - add Progress tab
- `frontend/src/pages/CourseDetail.tsx` - add "View progress" link

**E2E (new):**
- `e2e/tests/progress-dashboard.spec.ts`
- `e2e/tests/visual/progress-dashboard.visual.spec.ts`

**No DB migration needed** (reads existing data only).

---

## DemoSeeder Note

The progress dashboard needs a student with:
- An active course with curriculum entries (including at least one "taught" entry)
- At least one session log with `LinkedLessonId` pointing to the taught lesson

DemoSeeder currently seeds Diego Seed with 2 session logs but no `LinkedLessonId` and no `taught` entries. The DemoSeeder must be extended inside the **same `if (!logsExist)` guard block** that creates Diego's session logs. Within that block:
1. Set the first curriculum entry's `Status = "taught"` and `LessonId = firstLesson.Id` (using the first lesson linked to Diego's course)
2. Set `LinkedLessonId = firstLesson.Id` on the first session log

Both changes go inside the same idempotency guard so re-runs produce consistent state.

Additionally, the timeline join in `ProgressService` must eagerly load session logs via a separate query (not a navigation property), because EF Core will not auto-load nested collections without `.Include()`. Load all `SessionLogs` for the student in one query (already done in step 4 of the service plan), then build a lookup `Dictionary<Guid, DateTime?>` from `LinkedLessonId -> SessionDate` to decorate timeline entries.

`IsCancelled` defaults to `false` in the model, so seeded logs are counted correctly without any change.

File to modify: find the DemoSeeder class (likely `backend/LangTeach.Api/` or a seed folder) and locate the `if (!logsExist)` guard for Diego Seed.
