# T6 — Student Profiles API + UI

**Branch:** `task/t6-student-profiles`
**Depends on:** T4 (schema), T5.1 (design system merged to main)
**Effort:** 1.5 days

---

## Pre-task checklist

- [ ] `git checkout main && git pull`
- [ ] `git checkout -b task/t6-student-profiles`
- [ ] Docker stack healthy (`docker-compose up -d`, all 3 services green)

---

## What already exists

- `Student` model: `Id`, `TeacherId`, `Name`, `LearningLanguage`, `CefrLevel`, `Interests` (JSON string `"[]"`), `Notes`, `IsDeleted`, `CreatedAt`, `UpdatedAt`
- `AppDbContext.Students` DbSet
- Migration `InitialSchema` already includes the `Students` table
- Auth0 JWT middleware wired; `User.FindFirstValue(ClaimTypes.NameIdentifier)` gives `auth0UserId`
- Teacher upsert lives in `ProfileController` (called on every profile request) — same pattern applies here: call `UpsertTeacherAsync` on every students endpoint so the teacher row always exists

---

## Step 1 — Backend DTOs

**`DTOs/StudentDto.cs`**
```csharp
public record StudentDto(
    Guid Id,
    string Name,
    string LearningLanguage,
    string CefrLevel,
    List<string> Interests,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
```

**`DTOs/CreateStudentRequest.cs`**
```csharp
public class CreateStudentRequest
{
    [Required, MaxLength(200)] public string Name { get; set; } = "";
    [Required, MaxLength(100)] public string LearningLanguage { get; set; } = "";
    [Required] public string CefrLevel { get; set; } = "";
    public List<string> Interests { get; set; } = [];
    [MaxLength(2000)] public string? Notes { get; set; }
}
```

**`DTOs/UpdateStudentRequest.cs`** — same shape as Create (full replace, no partial PATCH for Phase 1)

**`DTOs/StudentListQuery.cs`** (query params for list endpoint)
```csharp
public class StudentListQuery
{
    public string? Language { get; set; }
    public string? CefrLevel { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
```

**`DTOs/PagedResult.cs`** (reusable generic)
```csharp
public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize);
```

---

## Step 2 — Backend Service

**`Services/IStudentService.cs`**
```csharp
public interface IStudentService
{
    Task<PagedResult<StudentDto>> ListAsync(Guid teacherId, StudentListQuery query);
    Task<StudentDto?> GetByIdAsync(Guid teacherId, Guid studentId);
    Task<StudentDto> CreateAsync(Guid teacherId, CreateStudentRequest request);
    Task<StudentDto?> UpdateAsync(Guid teacherId, Guid studentId, UpdateStudentRequest request);
    Task<bool> DeleteAsync(Guid teacherId, Guid studentId);
}
```

**`Services/StudentService.cs`** — key implementation notes:
- All queries: `.Where(s => s.TeacherId == teacherId && !s.IsDeleted)` — row-level security enforced at service layer
- `GetByIdAsync`: returns `null` if not found or belongs to different teacher (controller returns 404)
- `DeleteAsync`: sets `IsDeleted = true`, `UpdatedAt = UtcNow` — soft delete; returns `false` if not found
- `Interests` stored as JSON string; serialize/deserialize with `JsonSerializer` (same pattern as `ProfileService`)
- Register in `Program.cs`: `builder.Services.AddScoped<IStudentService, StudentService>()`

---

## Step 3 — Backend Controller

**`Controllers/StudentsController.cs`** — route prefix `api/students`, all endpoints `[Authorize]`

Helper: resolve `TeacherId` by calling `_profileService.UpsertTeacherAsync(auth0Id, email)` then querying for the teacher's Guid. Or: refactor the upsert to return the teacher's `Guid` directly (preferred — avoids a second DB round-trip).

> **Refactor note:** Change `IProfileService.UpsertTeacherAsync` to return `Task<Guid>` (the teacher's DB Id). Use this in both `ProfileController` and `StudentsController`. This avoids redundant DB lookups across controllers.

Endpoints:

| Method | Route | Response |
|--------|-------|----------|
| GET | `/api/students` | `200 PagedResult<StudentDto>` |
| POST | `/api/students` | `201 StudentDto` with `Location` header |
| GET | `/api/students/{id}` | `200 StudentDto` or `404` |
| PUT | `/api/students/{id}` | `200 StudentDto` or `404` |
| DELETE | `/api/students/{id}` | `204` or `404` |

Logging:
- `GET /api/students` — log TeacherId, filter params, result count (Information)
- `POST /api/students` — log TeacherId, new StudentId, Name (Information)
- `PUT /api/students/{id}` — log TeacherId, StudentId (Information)
- `DELETE /api/students/{id}` — log TeacherId, StudentId (Information); log 404 at Warning
- Validation failures — log at Warning

---

## Step 4 — Backend Tests

Add integration tests in `LangTeach.Api.Tests/Controllers/StudentsControllerTests.cs` using the existing `WebAppFactory`.

Tests to cover:
- `GET /api/students` returns empty list for new teacher
- `POST /api/students` creates and returns student
- `GET /api/students/{id}` returns correct student
- `GET /api/students/{id}` returns 404 for another teacher's student (row-level security)
- `PUT /api/students/{id}` updates correctly
- `DELETE /api/students/{id}` soft-deletes; subsequent GET returns 404
- List filters: `?language=Spanish` returns only matching students

---

## Step 5 — Frontend API client

**`src/api/students.ts`**

```typescript
export interface Student {
  id: string;
  name: string;
  learningLanguage: string;
  cefrLevel: string;
  interests: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentListResponse {
  items: Student[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// getStudents(params?), getStudent(id), createStudent(data), updateStudent(id, data), deleteStudent(id)
// All use the existing Axios instance with the Auth0 token interceptor
```

---

## Step 6 — Frontend Pages

### Route setup (App.tsx)
Add inside `<AppShell>` routes:
```
/students           -> Students (list)
/students/new       -> StudentForm (create)
/students/:id/edit  -> StudentForm (edit)
```

### AppShell.tsx
Add "Students" nav item with `Users` icon (Lucide) between Dashboard and Settings.

### `pages/Students.tsx` (list view)

Layout: page header "Students" + "Add Student" button (top right).

Table/card list columns: Name, Language, Level, Interests (chips, max 3 shown), actions (Edit pencil icon, Delete trash icon).

Empty state: centered illustration placeholder + "No students yet" heading + "Add your first student" CTA button.

Delete flow: inline confirmation — on trash click show a shadcn `AlertDialog` ("Delete [Name]? This cannot be undone.") with Cancel / Delete buttons. On confirm call DELETE endpoint, invalidate TanStack Query cache.

TanStack Query:
- `useQuery(['students'], getStudents)` for list
- `useMutation(deleteStudent, { onSuccess: () => queryClient.invalidateQueries(['students']) })`

### `pages/StudentForm.tsx` (create + edit, shared)

Detect mode: `useParams()` — if `:id` present, fetch student and pre-fill form.

Fields:
- **Name** — `Input`, required, max 200 chars
- **Learning Language** — `Select` dropdown. Fixed list: English, Spanish, French, German, Italian, Portuguese, Mandarin, Japanese, Arabic, Other
- **CEFR Level** — `Select` dropdown. Options: A1, A2, B1, B2, C1, C2
- **Interests** — tag input: user types a word and presses Enter/comma to add a chip; click chip X to remove. Use a controlled `string[]` state. No external library needed — a simple controlled input + badge list.
- **Notes** — `Textarea`, optional, max 2000 chars

Submit button: "Save Student" (create) / "Update Student" (edit).

On success: `navigate('/students')`.

TanStack Query:
- Edit mode: `useQuery(['students', id], () => getStudent(id))`
- `useMutation(createStudent / updateStudent)`

Form validation: client-side only for Phase 1 (required fields, no submit if empty).

---

## Step 7 — Playwright e2e test

**`e2e/tests/students.spec.ts`**

```
test('full student CRUD')
  1. login via auth-helper
  2. navigate to /students
  3. assert empty state visible ("No students yet")
  4. click "Add your first student"
  5. fill: Name="Ana García", Language="Spanish", Level="B2", Interests="travel" + Enter + "music" + Enter
  6. click "Save Student"
  7. assert redirected to /students
  8. assert row "Ana García" visible with "B2" and "travel" chip
  9. click edit icon for Ana García
  10. change Level to "C1"
  11. click "Update Student"
  12. assert row shows "C1"
  13. click delete icon for Ana García
  14. assert confirmation dialog appears
  15. click "Delete" in dialog
  16. assert empty state visible again
```

Run: `npx playwright test students` against running Docker stack before pushing.

---

## Step 8 — Pre-push checks

```bash
cd backend && dotnet build      # zero warnings
cd backend && dotnet test       # all pass
cd frontend && npm run build    # zero errors
cd e2e && npx playwright test students.spec.ts  # passes
```

---

## Step 9 — Commit, push, PR

```bash
git add ...
git commit -m "feat(t6): student profiles API + UI with full CRUD and Playwright e2e"
git push -u origin task/t6-student-profiles
gh pr create --base main --title "T6: Student Profiles API + UI" ...
```

PR body must include:
- What was built
- Any deviations from this plan
- Pre-push check results (dotnet build, dotnet test, npm build, playwright)

---

## Files created / modified summary

| File | Action |
|------|--------|
| `backend/LangTeach.Api/DTOs/StudentDto.cs` | New |
| `backend/LangTeach.Api/DTOs/CreateStudentRequest.cs` | New |
| `backend/LangTeach.Api/DTOs/UpdateStudentRequest.cs` | New |
| `backend/LangTeach.Api/DTOs/StudentListQuery.cs` | New |
| `backend/LangTeach.Api/DTOs/PagedResult.cs` | New |
| `backend/LangTeach.Api/Services/IStudentService.cs` | New |
| `backend/LangTeach.Api/Services/StudentService.cs` | New |
| `backend/LangTeach.Api/Controllers/StudentsController.cs` | New |
| `backend/LangTeach.Api/Services/IProfileService.cs` | Modify — `UpsertTeacherAsync` returns `Task<Guid>` |
| `backend/LangTeach.Api/Services/ProfileService.cs` | Modify — return teacher Id from upsert |
| `backend/LangTeach.Api/Controllers/ProfileController.cs` | Minor update to match new upsert signature |
| `backend/LangTeach.Api/Program.cs` | Add `IStudentService` DI registration |
| `backend/LangTeach.Api.Tests/Controllers/StudentsControllerTests.cs` | New |
| `frontend/src/api/students.ts` | New |
| `frontend/src/pages/Students.tsx` | New |
| `frontend/src/pages/StudentForm.tsx` | New |
| `frontend/src/App.tsx` | Modify — add /students routes |
| `frontend/src/components/AppShell.tsx` | Modify — add Students nav item |
| `e2e/tests/students.spec.ts` | New |
