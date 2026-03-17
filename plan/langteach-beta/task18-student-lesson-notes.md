# T18 — Student Lesson Notes: Implementation Plan

## Context

After a teacher finishes a lesson, nothing is captured. The lesson editor shows what was planned, but not what happened. T18 adds a structured post-lesson reflection (four free-text fields) tied to each lesson, and a chronological lesson history on each student's profile. This transforms the platform from a one-shot generator into a teaching companion that remembers across sessions, which is critical for the demo narrative.

---

## Step 1: Backend Model + DbContext + Migration

**Create** `backend/LangTeach.Api/Data/Models/LessonNote.cs` (singular, matching project convention: `Lesson`, `Student`, `Teacher`, `LessonSection`)
- POCO: `Guid Id`, `Guid LessonId`, `Guid StudentId`, `Guid TeacherId`, four `string?` fields (`WhatWasCovered`, `HomeworkAssigned`, `AreasToImprove`, `NextLessonIdeas`), `DateTime CreatedAt`, `DateTime UpdatedAt`
- Navigation properties: `Lesson`, `Student`, `Teacher`
- No `IsDeleted` field: notes are 1:1 with Lesson and cascade-deleted with it, so soft-delete is unnecessary

**Modify** `backend/LangTeach.Api/Data/AppDbContext.cs`
- Add `public DbSet<LessonNote> LessonNotes => Set<LessonNote>();` (DbSet plural, entity singular)
- Fluent config: PK on Id, unique index on `LessonId` (one note per lesson), Cascade from Lesson, NoAction for Student and Teacher FKs

**Modify** `backend/LangTeach.Api/Data/Models/Lesson.cs`
- Add `public LessonNote? Notes { get; set; }` navigation property

**Run** `dotnet ef migrations add AddLessonNotes`

---

## Step 2: DTOs

**Create** `backend/LangTeach.Api/DTOs/LessonNotesDto.cs`
- `Guid Id`, `Guid LessonId`, four nullable string fields

**Create** `backend/LangTeach.Api/DTOs/SaveLessonNotesRequest.cs`
- Four nullable string fields (used for both create and update)

**Create** `backend/LangTeach.Api/DTOs/LessonHistoryEntryDto.cs`
- `Guid LessonId`, `string Title`, `string? TemplateName`, `DateTime LessonDate` (ScheduledAt ?? CreatedAt, matching PdfLessonData naming), four nullable string note fields

---

## Step 3: Service

**Create** `backend/LangTeach.Api/Services/ILessonNoteService.cs` + `LessonNoteService.cs`
- DI: `AppDbContext`, `ILogger<LessonNoteService>`
- `GetByLessonIdAsync(teacherId, lessonId)` returns `LessonNotesDto?`
- `UpsertAsync(teacherId, lessonId, request)` creates or updates notes, resolves StudentId from the Lesson entity, returns `LessonNotesDto`
- `GetLessonHistoryAsync(teacherId, studentId)` queries lessons joined with LessonNotes for this student. Order by `l.ScheduledAt ?? l.CreatedAt` descending (EF translates to SQL `COALESCE`). Filter to notes with at least one non-empty field using `!string.IsNullOrWhiteSpace(n.WhatWasCovered) || !string.IsNullOrWhiteSpace(n.HomeworkAssigned) || ...` for all four fields. Include Template for TemplateName. Returns `List<LessonHistoryEntryDto>`.

**Modify** `backend/LangTeach.Api/Program.cs`
- Register `AddScoped<ILessonNoteService, LessonNoteService>()` (after line 105, alongside other service registrations)

---

## Step 4: Controller

**Create** `backend/LangTeach.Api/Controllers/LessonNotesController.cs`
- DI: `ILessonNoteService`, `IProfileService`, `ILogger`. Same auth pattern as LessonsController (Auth0Id/Email properties, UpsertTeacherAsync).
- `GET /api/lessons/{lessonId}/notes` returns DTO or 204 NoContent if no notes exist
- `PUT /api/lessons/{lessonId}/notes` upserts, returns DTO. Returns 400 if lesson has no student linked.

**Modify** `backend/LangTeach.Api/Controllers/StudentsController.cs`
- Add `ILessonNoteService` to constructor DI (currently: `IStudentService`, `IProfileService`, `ILogger`)
- Add `GET /api/students/{studentId}/lesson-history` returns `List<LessonHistoryEntryDto>`

---

## Step 5: Backend Integration Tests

**Create** `backend/LangTeach.Api.Tests/Controllers/LessonNotesControllerTests.cs`
- `[Collection("ApiTests")]`, same factory pattern
- Tests: PUT notes returns 200, GET returns same data; GET returns 204 when no notes exist; PUT on lesson without student returns 400; lesson-history returns ordered entries; cross-teacher isolation

---

## Step 6: Frontend API Client

**Modify** `frontend/src/api/lessons.ts`
- Add `LessonNotesDto`, `SaveLessonNotesRequest` interfaces
- Add `getLessonNotes(lessonId)`: returns `LessonNotesDto | null`. Must handle 204 response (axios returns `{ data: '' }` for 204), return `null` in that case.
- Add `saveLessonNotes(lessonId, data)`: PUT, returns `LessonNotesDto`

**Modify** `frontend/src/api/students.ts`
- Add `LessonHistoryEntry` interface
- Add `getLessonHistory(studentId)` function

---

## Step 7: LessonNotes Component (Lesson Editor)

**Create** `frontend/src/components/lesson/LessonNotesCard.tsx`
- Props: `lessonId`, `studentId | null`
- Renders nothing if studentId is null
- useQuery to fetch existing notes (handles `null` from 204), local state for four textareas initialized from query data
- Save on blur via useMutation calling `saveLessonNotes(lessonId, allFourFields)`. Note: this is a single PUT of all fields (not the batch section-update pattern from LessonEditor). Show "Saved" indicator for 2.5s after success.
- Card with distinct visual treatment (e.g. subtle amber/warm background tint)

**Modify** `frontend/src/pages/LessonEditor.tsx`
- Render `<LessonNotesCard>` after the PPP section panels, before AlertDialogs

---

## Step 8: LessonHistory Component (Student Profile)

**Create** `frontend/src/components/student/LessonHistoryCard.tsx`
- Props: `studentId`
- useQuery to fetch lesson history
- Each entry: formatted date, clickable lesson title (link to `/lessons/:id`), template badge, non-empty note fields
- Empty state: "No lesson notes yet."

**Modify** `frontend/src/pages/StudentForm.tsx`
- Render `<LessonHistoryCard>` in edit mode, below the Notes card

---

## Step 9: Frontend Unit Tests

**Modify** `frontend/src/pages/LessonEditor.test.tsx`
- Add `getLessonNotes` and `saveLessonNotes` to the existing `vi.mock('../api/lessons')` block (required or LessonNotesCard will fail in existing tests)
- Test: Lesson Notes card renders when studentId present, hidden when null

**Create** `frontend/src/components/lesson/LessonNotesCard.test.tsx`
- Test: four textareas render, blur triggers save

**Create** `frontend/src/components/student/LessonHistoryCard.test.tsx`
- Test: entries render with titles/dates, empty state when no entries

---

## Step 10: E2E Playwright Test

**Create** `e2e/tests/lesson-notes.spec.ts`
- Mock-auth context (`createMockAuthContext` + `setupMockTeacher` from helpers).
- Create student via API, then create lesson with `studentId` set in `CreateLessonRequest` (links student at creation time, no UI flow needed).
- Navigate to lesson editor, scroll to Lesson Notes card, fill "What was covered" and blur, verify saved indicator appears.
- Navigate to student edit page, verify Lesson History section shows entry with the lesson title.

---

## Verification

1. `cd backend && dotnet build` (zero warnings)
2. `cd backend && dotnet test` (all pass)
3. `cd frontend && npm run build` (zero errors)
4. `cd frontend && npm test` (all pass)
5. `docker compose up` then `npx playwright test e2e/tests/lesson-notes.spec.ts --project=mock-auth`
6. Manual check: open lesson editor with linked student, add notes, navigate to student profile, confirm history shows
