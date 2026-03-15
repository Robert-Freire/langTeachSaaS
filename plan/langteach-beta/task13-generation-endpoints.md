# T13 — Generation Endpoints

**Branch**: `task/t13-generation-endpoints`
**Priority**: Must | **Effort**: 1 day
**Blocks**: T14 (streaming SSE), T15 (lesson editor AI UI)

---

## Goal

Seven POST endpoints under `/api/generate` that wire together `IPromptService` + `IClaudeClient`, persist a `LessonContentBlock`, and return structured JSON.

---

## Endpoints

| Method | Path | Model |
|--------|------|-------|
| POST | `/api/generate/lesson-plan` | Sonnet |
| POST | `/api/generate/vocabulary` | Haiku |
| POST | `/api/generate/grammar` | Sonnet |
| POST | `/api/generate/exercises` | Haiku |
| POST | `/api/generate/conversation` | Haiku |
| POST | `/api/generate/reading` | Sonnet |
| POST | `/api/generate/homework` | Sonnet |

---

## Request Body (common)

```json
{
  "lessonId": "guid",
  "language": "Spanish",
  "cefrLevel": "B1",
  "topic": "ordering food",
  "style": "Conversational",
  "studentId": "optional-guid",
  "existingNotes": "optional teacher notes"
}
```

**Validation**: `language`, `cefrLevel`, and `topic` are required. `lessonId` is required.

---

## Response Body

```json
{
  "id": "guid",
  "blockType": "vocabulary",
  "generatedContent": "{ ...raw JSON string from Claude... }"
}
```

DTO: `GenerationResultDto(Guid Id, string BlockType, string GeneratedContent)`

---

## Per-Endpoint Flow

1. Extract `Auth0Id` from JWT; return 401 if null.
2. Call `UpsertTeacherAsync(auth0Id, email)` to get `teacherId`.
3. Load `Teacher` entity from DB by `teacherId`; check `IsApproved`. Return 403 if false.
4. Load `Lesson` by `(lessonId, teacherId)` — return 404 if not found or not owned by teacher.
5. If `studentId` provided, call `IStudentService.GetByIdAsync(teacherId, studentId)` — return 404 if not found.
6. Map to `GenerationContext`:
   - `Language`, `CefrLevel`, `Topic`, `Style` from request
   - `DurationMinutes` from `lesson.DurationMinutes`
   - `StudentName`, `StudentNativeLanguage`, `StudentInterests`, `StudentGoals`, `StudentWeaknesses` from student DTO (or null if no student)
   - `ExistingNotes` from request
   - `LessonSummary` null (only for homework, pass `existingNotes` as summary if desired — leave null for T13)
7. Call the appropriate `IPromptService.Build*Prompt(ctx)` method.
8. Call `IClaudeClient.CompleteAsync(request, ct)`.
9. Persist `LessonContentBlock` row (`LessonSectionId = null` in T13).
10. Return `GenerationResultDto`.

---

## New Files

| File | Description |
|------|-------------|
| `Data/Models/LessonContentBlock.cs` | EF entity |
| `Controllers/GenerateController.cs` | 7 endpoints |
| `DTOs/GenerateRequest.cs` | Request DTO + validation |
| `DTOs/GenerationResultDto.cs` | Response DTO |

## Modified Files

| File | Change |
|------|--------|
| `Data/AppDbContext.cs` | Add `DbSet<LessonContentBlock>` + model builder config |
| `Program.cs` | No change needed (services already registered) |

---

## LessonContentBlock Entity

```csharp
// Data/Models/LessonContentBlock.cs
namespace LangTeach.Api.Data.Models;

public class LessonContentBlock
{
    public Guid Id { get; set; }
    public Guid LessonId { get; set; }
    public Guid? LessonSectionId { get; set; }
    public string BlockType { get; set; } = string.Empty;       // "vocabulary", "grammar", etc.
    public string GeneratedContent { get; set; } = string.Empty; // raw JSON from Claude
    public string? EditedContent { get; set; }                   // teacher edits (T15)
    public string? GenerationParams { get; set; }                // serialized request params
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Lesson Lesson { get; set; } = null!;
    public LessonSection? LessonSection { get; set; }
}
```

**AppDbContext additions:**
- `DbSet<LessonContentBlock> LessonContentBlocks`
- Model builder: PK on `Id`, cascade delete from `Lesson`, no-action from `LessonSection` (nullable FK, SQL Server multi-cascade constraint), index on `LessonId`.

---

## EF Migration

```
cd backend && dotnet ef migrations add AddLessonContentBlocks --project LangTeach.Api --startup-project LangTeach.Api
```

---

## IsApproved Check

After `UpsertTeacherAsync` returns `teacherId`, load the teacher from DB:

```csharp
var teacher = await _db.Teachers.FindAsync([teacherId], ct);
if (teacher is null || !teacher.IsApproved) return Forbid();
```

`AppDbContext` is injected directly into the controller (same pattern used in `LessonTemplatesController`).

---

## Test Strategy

File: `Controllers/GenerateControllerTests.cs` — uses `[Collection("ApiTests")]` + `AuthenticatedWebAppFactory`.

**Unit tests (mock IClaudeClient, IPromptService):** none needed — integration tests cover the controller.

**Integration tests:**
- `POST /api/generate/vocabulary` with valid lesson+student returns 200 + GenerationResultDto, block persisted in DB.
- `POST /api/generate/vocabulary` with unapproved teacher returns 403.
- `POST /api/generate/vocabulary` with unknown lessonId returns 404.
- `POST /api/generate/vocabulary` with missing required fields returns 400.
- One additional endpoint (e.g. `grammar`) happy-path to confirm routing works.

**Note:** Integration tests mock `IClaudeClient` to avoid real API calls (swap in `AuthenticatedWebAppFactory` `ConfigureServices`).

---

## Done When

- All 7 endpoints return 200 with valid `GenerationResultDto`.
- `LessonContentBlock` row persisted in DB after each call.
- 403 returned for unapproved teacher.
- 404 returned for unknown lesson.
- All integration tests pass.
- `dotnet build` and `dotnet test` clean.
