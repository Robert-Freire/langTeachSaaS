# Task 98 — Course/Curriculum Planner

## Summary
Add a Course entity that lets teachers generate an AI-planned multi-session curriculum, view/edit/reorder it, and generate individual lessons from each entry. Courses appear on the dashboard with a progress indicator.

---

## Backend

### 1. New models (`Data/Models/`)

**Course.cs**
```
Id, TeacherId, StudentId?, Name, Description?,
Mode (string: "general" | "exam-prep"),
TargetCefrLevel?, TargetExam?, ExamDate?,
SessionCount, Language,
IsDeleted, CreatedAt, UpdatedAt
```

**CurriculumEntry.cs**
```
Id, CourseId, OrderIndex,
Topic, GrammarFocus?,
Competencies (string — comma-separated: reading/writing/listening/speaking),
LessonType?,
LessonId? (FK to Lesson, set null on delete),
Status (string: "planned" | "created" | "taught")
```

### 2. AppDbContext changes
- `DbSet<Course>` and `DbSet<CurriculumEntry>`
- Course: cascade from Teacher, set null from Student, index on `(TeacherId, IsDeleted)`
- CurriculumEntry: cascade from Course, index on CourseId; LessonId → NoAction

### 3. Migration
`dotnet ef migrations add AddCourseAndCurriculumEntry`

### 4. DTOs (`DTOs/`)
- `CreateCourseRequest` — name, description, mode, studentId, language, targetCefrLevel, targetExam, examDate, sessionCount
- `UpdateCourseRequest` — same fields (all optional)
- `UpdateCurriculumEntryRequest` — topic, grammarFocus, competencies, lessonType
- `ReorderCurriculumRequest` — `List<Guid> orderedEntryIds`
- `CourseDto` — full course + entries list
- `CourseSummaryDto` — for list/dashboard: id, name, mode, sessionCount, lessonsCreated, createdAt

### 5. AI curriculum generation (`AI/`)

**CurriculumContext.cs** (new record)
```csharp
record CurriculumContext(
    string Language, string? CefrLevel, string Mode,
    int SessionCount, string? TargetExam, DateOnly? ExamDate,
    string? StudentName, string? StudentNativeLanguage,
    string[]? StudentInterests, string[]? StudentGoals);
```

**IPromptService / PromptService** — add `BuildCurriculumPrompt(CurriculumContext ctx)` that:
- Uses Sonnet, MaxTokens 8192
- System prompt instructs AI to return ONLY a JSON array (no markdown, no prose)
- User prompt: generate N sessions for [language] [mode/level/exam], distributing competencies
- Each entry: `{orderIndex, topic, grammarFocus, competencies, lessonType}`

**CurriculumGenerationService** (new class in `Services/`)
- Calls `IClaudeClient` directly (non-streaming, awaits full response)
- Parses JSON array → list of `CurriculumEntry` with NewIds
- Returns `List<CurriculumEntry>` or throws `CurriculumGenerationException`

### 6. CoursesController (`Controllers/CoursesController.cs`)
All routes require auth (same `[Authorize]` + teacher-id pattern as LessonsController).

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/courses | List with summary + progress |
| POST | /api/courses | Create + generate curriculum (synchronous) |
| GET | /api/courses/{id} | Full course with entries |
| PUT | /api/courses/{id} | Update course metadata |
| DELETE | /api/courses/{id} | Soft delete |
| PUT | /api/courses/{id}/curriculum/reorder | Reorder entries |
| PUT | /api/courses/{id}/curriculum/{entryId} | Edit single entry |
| POST | /api/courses/{id}/curriculum/{entryId}/lesson | Create lesson from entry (returns new LessonDto) |

The `POST /api/courses` endpoint:
1. Creates the Course record
2. Calls `CurriculumGenerationService` to generate entries
3. Saves all entries
4. Returns full `CourseDto`

`POST /curriculum/{entryId}/lesson`:
1. Pre-fills lesson from entry (topic, grammarFocus, cefrLevel, language, studentId)
2. Creates lesson via existing lesson creation logic
3. Sets `entry.LessonId` and `entry.Status = "created"`
4. Returns lesson id so frontend can navigate to editor

---

## Frontend

### New API client (`api/courses.ts`)
- `getCourses()`, `getCourse(id)`, `createCourse(req)`, `updateCourse(id, req)`, `deleteCourse(id)`
- `reorderCurriculum(courseId, orderedIds)`, `updateCurriculumEntry(courseId, entryId, req)`
- `generateLessonFromEntry(courseId, entryId)` → returns `{ lessonId: string }`

### New pages

**`pages/CourseNew.tsx`** — 2-step wizard
- Step 1: Mode selector (General Learning / Exam Prep) + language + student + parameters
  - General: target CEFR level + session count
  - Exam Prep: exam selector (DELE, DALF, Cambridge, TOEFL) + exam date + session count
- Step 2: loading state ("Generating your curriculum...") → then shows generated curriculum as preview list
  - Each entry shows: order, topic, grammar focus, competencies chips, lesson type
  - "Looks good" button saves and navigates to `/courses/:id`

**`pages/CourseDetail.tsx`**
- Header: course name, mode badge, progress (X of Y lessons created), student name
- Curriculum list (ordered): each entry card shows:
  - Sequence number, topic, grammar focus, competency badges, lesson type
  - Status chip (Planned / Created / Taught)
  - Up/Down reorder buttons (disabled at boundaries)
  - Edit button (inline form or popover)
  - "Generate Lesson" button → calls generateLessonFromEntry → navigates to `/lessons/:id`
- Back to courses link

**`pages/Courses.tsx`** — list page (same pattern as Lessons.tsx)
- Cards showing: name, mode badge, language, CEFR/exam, progress bar (X/Y sessions), created date
- "New course" button, delete with confirmation
- No filters needed for MVP (small number of courses)

### Dashboard integration (`components/dashboard/`)
- New `CoursesOverview.tsx` component:
  - Shows up to 3 active courses with name + progress bar (X of Y)
  - "View all" link to `/courses`
  - "New course" quick-action link
- Add to `Dashboard.tsx` below QuickActions (or alongside UnscheduledDrafts)

### Navigation (`components/AppShell.tsx` / sidebar)
- Add "Courses" nav item (GraduationCap icon) between Dashboard and Lessons

### New routes (`App.tsx`)
```
/courses        → Courses
/courses/new    → CourseNew
/courses/:id    → CourseDetail
```

### Unit tests (Vitest + RTL)
- `Courses.test.tsx` — renders list, delete confirmation
- `CourseNew.test.tsx` — step navigation, mode switching, form validation
- `CourseDetail.test.tsx` — entry display, reorder buttons, generate lesson button

---

## E2E test (`e2e/tests/courses.spec.ts`)

Happy paths:
1. Create course (general mode): fill wizard → wait for generation → land on detail page with curriculum
2. Create course (exam prep mode): pick DELE exam, date, sessions → verify entries appear
3. View curriculum: assert entries visible with topics + competencies
4. Reorder: click move-down on first entry → assert order changes
5. Edit entry: click edit → change topic → save → verify updated
6. Generate lesson from entry: click "Generate Lesson" on first entry → assert navigate to `/lessons/:id`

---

## Implementation order

1. Backend models + AppDbContext + migration
2. Backend DTOs + CurriculumContext
3. Backend PromptService (curriculum prompt)
4. Backend CurriculumGenerationService
5. Backend CoursesController
6. Frontend `api/courses.ts`
7. Frontend `CourseNew.tsx` + unit test
8. Frontend `CourseDetail.tsx` + unit test
9. Frontend `Courses.tsx` + unit test
10. Dashboard `CoursesOverview.tsx` + integration
11. Sidebar nav + routes
12. E2E `courses.spec.ts`
13. Pre-push checks + qa-verify + review

---

## Design decisions

- **No streaming for curriculum generation**: structured JSON output is simpler to parse as a complete response. Show a spinner while waiting.
- **Move up/down buttons** (not drag-and-drop): satisfies AC, simpler, accessible, easy to test.
- **Competencies stored as comma-separated string**: avoids a join table for a small, fixed set. Frontend splits on display.
- **Soft delete on Course**: consistent with Lesson pattern.
- **No separate "generate curriculum" endpoint**: `POST /api/courses` creates + generates atomically. If generation fails, course is not saved (transaction).
