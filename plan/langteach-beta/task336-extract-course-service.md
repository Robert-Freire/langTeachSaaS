# Task 336: Extract CourseService and Fix Auth Guard Pattern

## Goal

Bring `CoursesController` in line with the rest of the codebase by:
1. Extracting `ICourseService` / `CourseService` following the `StudentService` pattern
2. Consolidating JSON deserialization helpers into a shared utility
3. Moving two direct-DB queries in `LessonsController` into `ILessonService`
4. Fixing `ProfileController` auth guard

---

## Files to Create

| File | Purpose |
|------|---------|
| `backend/LangTeach.Api/Helpers/JsonStorageHelper.cs` | Shared deserialization utility |
| `backend/LangTeach.Api/Services/ICourseService.cs` | Interface |
| `backend/LangTeach.Api/Services/CourseService.cs` | Implementation |
| `backend/LangTeach.Api.Tests/Services/CourseServiceTests.cs` | Unit tests |

## Files to Modify

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Controllers/CoursesController.cs` | Inject `ICourseService`, remove direct `AppDbContext` usage, remove private helpers |
| `backend/LangTeach.Api/Controllers/LessonsController.cs` | Use `ILessonService.GetStudyAsync` and `ILessonService.GetForExportAsync` |
| `backend/LangTeach.Api/Controllers/ProfileController.cs` | Fix auth guard pattern |
| `backend/LangTeach.Api/Services/ILessonService.cs` | Add two new methods |
| `backend/LangTeach.Api/Services/LessonService.cs` | Implement two new methods |
| `backend/LangTeach.Api/Services/StudentService.cs` | Use `JsonStorageHelper` |
| `backend/LangTeach.Api/Program.cs` | Register `ICourseService` |

---

## Step 1: `JsonStorageHelper`

New static class in `backend/LangTeach.Api/Helpers/JsonStorageHelper.cs`:

```csharp
internal static class JsonStorageHelper
{
    private static readonly JsonSerializerOptions CaseInsensitive = new() { PropertyNameCaseInsensitive = true };

    // Non-null input, returns empty list on failure (replaces StudentService.Deserialize<T> and CoursesController.TryDeserializeStringArray / TryDeserializeDifficultyArray)
    public static List<T> DeserializeList<T>(string json)
    {
        try { return JsonSerializer.Deserialize<List<T>>(json, CaseInsensitive) ?? []; }
        catch { return []; }
    }

    // Nullable input, returns null on null/empty (replaces TryDeserializeStringList and TryDeserializeWarnings)
    public static List<T>? DeserializeListNullable<T>(string? json)
    {
        if (string.IsNullOrEmpty(json)) return null;
        try { return JsonSerializer.Deserialize<List<T>>(json, CaseInsensitive); }
        catch { return null; }
    }

    public static string Serialize<T>(List<T> list) => JsonSerializer.Serialize(list);
}
```

- `StudentService` switches `Deserialize<T>` -> `JsonStorageHelper.DeserializeList<T>`, `Serialize<T>` -> `JsonStorageHelper.Serialize<T>`
- `CourseService` uses `JsonStorageHelper.DeserializeList<string>`, `DeserializeList<DifficultyDto>`, `DeserializeListNullable<CurriculumWarning>`, `DeserializeListNullable<string>`

---

## Step 2: `ICourseService`

```csharp
public interface ICourseService
{
    Task<IReadOnlyList<CourseSummaryDto>> ListAsync(Guid teacherId, CancellationToken ct = default);
    Task<CourseDto?> GetByIdAsync(Guid teacherId, Guid courseId, CancellationToken ct = default);
    Task<(CourseDto dto, List<CurriculumWarning> warnings)> CreateAsync(Guid teacherId, CreateCourseRequest request, CancellationToken ct = default);
    Task<bool> DismissWarningAsync(Guid teacherId, Guid courseId, string warningKey, CancellationToken ct = default);
    Task<bool> UpdateAsync(Guid teacherId, Guid courseId, UpdateCourseRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid teacherId, Guid courseId, CancellationToken ct = default);
    Task<(bool courseFound, CurriculumEntryDto? entry)> AddEntryAsync(Guid teacherId, Guid courseId, AddCurriculumEntryRequest request, CancellationToken ct = default);
    Task<(bool courseFound, bool entryFound)> DeleteEntryAsync(Guid teacherId, Guid courseId, Guid entryId, CancellationToken ct = default);
    Task<ReorderResult> ReorderEntriesAsync(Guid teacherId, Guid courseId, ReorderCurriculumRequest request, CancellationToken ct = default);
    Task<(bool courseFound, CurriculumEntryDto? entry)> UpdateEntryAsync(Guid teacherId, Guid courseId, Guid entryId, UpdateCurriculumEntryRequest request, CancellationToken ct = default);
    Task<Guid?> GenerateLessonFromEntryAsync(Guid teacherId, Guid courseId, Guid entryId, CancellationToken ct = default);
}

public enum ReorderResult { Success, CourseNotFound, InvalidEntryIds }
```

**Validation errors** (student not found, template not found, CEFR mismatch): throw `System.ComponentModel.DataAnnotations.ValidationException` (same type used in `StudentService`). Step 4 adds `catch (ValidationException ex) { return BadRequest(ex.Message); }` to `CoursesController.Create` and `AddEntry`.
**Curriculum generation failures**: `CurriculumGenerationException` / `JsonException` propagate; controller's existing try/catch handles them as 502.

---

## Step 3: `CourseService`

Constructor injects: `AppDbContext`, `ICurriculumGenerationService`, `ICurriculumTemplateService`, `ILogger<CourseService>`.

- Move all mapping helpers (`MapToSummary`, `MapToDto`, `MapEntryToDto`, `BuildCurriculumContext`) from `CoursesController` to `CourseService` (as private static methods).
- Replace `TryDeserializeStringArray` / `TryDeserializeDifficultyArray` / `TryDeserializeWarnings` / `TryDeserializeStringList` with `JsonStorageHelper` calls.

---

## Step 4: Updated `CoursesController`

Remove:
- `AppDbContext _db` field
- Private static helpers (`TryDeserialize*`, `MapTo*`, `BuildCurriculumContext`)
- `ICurriculumGenerationService` and `ICurriculumTemplateService` fields

Add:
- `ICourseService _courseService` field

Each action becomes a thin delegate: auth guard -> get teacherId -> call service -> map result to IActionResult.

---

## Step 5: `ILessonService` additions

```csharp
Task<StudyLessonDto?> GetStudyAsync(Guid teacherId, Guid lessonId, CancellationToken ct = default);
Task<PdfLessonData?> GetForExportAsync(Guid teacherId, Guid lessonId, CancellationToken ct = default);
```

`GetStudyAsync` in `LessonService`:
- Load lesson + sections from DB; check ownership; load `LessonContentBlocks` for the lesson
- Build `StudyLessonDto`. For the parsed content field use `ContentJsonHelper.StripFences` + `JsonSerializer.Deserialize<JsonElement>` directly (same logic as `LessonContentBlocksController.TryParseContent` but called from the service, avoiding the service-to-controller dependency)
- Parse `LearningTargets` JSON

`GetForExportAsync` in `LessonService`:
- Load lesson with `.Include(l => l.Sections).Include(l => l.Student)` + load `LessonContentBlocks` separately (same as ExportPdf lines 263-274)
- Check ownership
- Build and return `PdfLessonData`

Controller's `ExportPdf` still calls `_pdfExportService.GeneratePdf(data, exportMode)` and builds the filename from `data.Title`.

---

## Step 6: `ProfileController` Fix

Line 25: `private string Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier)!;`
Change to: `private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);`

All three action methods (`Get`, `Update`, `CompleteOnboarding`) add:
```csharp
if (Auth0Id is null) return Unauthorized();
```
at the top.

---

## Step 7: `Program.cs`

Add after the `IStudentService` registration:
```csharp
builder.Services.AddScoped<ICourseService, CourseService>();
```

---

## Step 8: Unit Tests (`CourseServiceTests.cs`)

Using `InMemoryDatabase` pattern (same as `MaterialServiceTests`).

Tests to cover:
- `ListAsync` returns only non-deleted courses for the teacher
- `GetByIdAsync` returns null for other teacher's course
- `GetByIdAsync` returns correct DTO with warnings deserialized
- `CreateAsync` with valid data creates course and entries
- `CreateAsync` throws `ValidationException` when student not found
- `CreateAsync` throws `ValidationException` when template not found
- `CreateAsync` throws `ValidationException` on CEFR mismatch
- `UpdateAsync` updates name/description, returns false for not found
- `DeleteAsync` soft-deletes course, returns false for not found
- `AddEntryAsync` appends entry with correct OrderIndex
- `DeleteEntryAsync` soft-deletes entry and reindexes remaining
- `ReorderEntriesAsync` returns `InvalidEntryIds` on wrong IDs
- `UpdateEntryAsync` updates fields, returns entry
- `GenerateLessonFromEntryAsync` creates lesson and links it to entry

Mock `ICurriculumGenerationService` and `ICurriculumTemplateService` (interfaces, easy to stub with NSubstitute or simple test doubles).

---

## E2E Impact

No new endpoints, no schema changes. Existing e2e tests for courses and lessons are unaffected.

---

## Review Routing

- Backend change only: run `review` agent
- No frontend, no Sophy trigger (no hardcoded if/switch on language/level/template in PromptService)
