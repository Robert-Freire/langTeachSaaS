# Task 546 — Add POST /api/students/{studentId}/sessions/extract

**Issue:** #546  
**Branch:** task/t546-sessions-extract-endpoint  
**Sprint:** Adaptive Replanning (sprint/adaptive-replanning)

## Context

The existing `POST /api/lessons/{lessonId}/notes/extract` requires a lessonId. Issue #544
(voice recording + extraction in Log Session dialog) must work from the Student detail
page where no lesson is selected. A new student-scoped endpoint is needed that validates
student ownership and delegates to the same `IReflectionExtractionService`.

## What to Build

### New controller: `SessionsController`

File: `backend/LangTeach.Api/Controllers/SessionsController.cs`

- Route: `[Route("api/students/{studentId:guid}/sessions")]`
- Single action: `POST extract`
- Injects: `IStudentService`, `IReflectionExtractionService`, `IProfileService`
- Auth pattern identical to `StudentsController` (Auth0Id + UpsertTeacher + studentService.GetByIdAsync)

### Endpoint logic

```
POST /api/students/{studentId}/sessions/extract
Body: ExtractReflectionRequest  (reuse existing DTO — has [Required] text field)
```

1. Return 401 if not authenticated
2. Resolve teacherId via `_profileService.UpsertTeacherAsync(Auth0Id, Email)`
3. Look up student: `await _studentService.GetByIdAsync(teacherId, studentId, ct)`
4. Return 404 if student is null (not found or not owned by teacher)
5. Return 400 if `!ModelState.IsValid` (covers empty/missing text via `[Required]`)
6. Call `_extractionService.ExtractAsync(request.Text, ct)`
7. Return `Ok(extracted)` — `ExtractedReflectionDto`

No changes to `ReflectionExtractionService`, `IReflectionExtractionService`, or existing
`LessonNotesController`.

## Tests

### Unit tests (xUnit, in `LangTeach.Api.Tests/Controllers/`)

File: `SessionsControllerTests.cs`

| Test | Expected |
|------|----------|
| Valid studentId + valid text | 200 with `ExtractedReflectionDto` shape |
| studentId not belonging to teacher | 404 |
| Empty text (missing body field) | 400 |

Pattern: `AuthenticatedWebAppFactory`, seed Teacher + Student in DB, use
`IReflectionExtractionService` stub (already registered in test config — see
`StubReflectionExtractionService`).

### E2E test

File: `e2e/tests/sessions-extract.spec.ts`

- `beforeAll`: `setupMockTeacher`
- Create a student via `POST /api/students`
- `POST /api/students/{studentId}/sessions/extract` with real text
- Assert 200 and that response body has the five expected fields
  (`whatWasCovered`, `areasToImprove`, `emotionalSignals`, `homeworkAssigned`,
  `nextLessonIdeas`)
- No UI navigation needed (API-only test, same pattern as `post-class-reflection.spec.ts`)

## Files to create/modify

| Action | File |
|--------|------|
| CREATE | `backend/LangTeach.Api/Controllers/SessionsController.cs` |
| CREATE | `backend/LangTeach.Api.Tests/Controllers/SessionsControllerTests.cs` |
| CREATE | `e2e/tests/sessions-extract.spec.ts` |

No migrations, no DTO changes, no service changes.

## Acceptance criteria checklist

- [ ] `POST /api/students/{studentId}/sessions/extract` exists and returns `ExtractedReflectionDto`
- [ ] Valid studentId + non-empty text → 200 with extracted fields
- [ ] Wrong teacher's studentId → 404
- [ ] Empty/missing text → 400
- [ ] Unit test: valid extraction returns expected DTO shape
- [ ] Unit test: wrong teacher gets 404
- [ ] Unit test: empty text gets 400
- [ ] E2E test: authenticated teacher calls endpoint, gets structured response
