# Task 844: Unify TeachingTodo and TeacherFollowup

**Issue:** #844
**Sprint branch:** sprint/stabilisation
**Labels:** area:backend, area:ai, type:tech-debt, size:L

## Goal

Eliminate `Student.TeachingTodos` (JSON column) by migrating all data into `TeacherFollowup`
(relational table) with a new `Kind` discriminator column. This removes in-memory JSON
deserialization from DashboardService and cleans up disambiguation prose from PromptService.

## Key Design Decisions

1. **Keep student endpoints as wrappers.** `/api/students/{id}/teaching-todos/*` remain in
   `StudentsController` and `IStudentService` but are re-implemented to delegate to
   `TeacherFollowupService` with `Kind="pedagogical"`. The frontend (`TeachingTodosCard`,
   `LogSession.tsx`) still calls these endpoints unchanged — no frontend PR needed.

2. **Add `CoveredInSessionLogId` to `TeacherFollowup`.** `TeachingTodoDto` exposes this field
   and `LogSession.tsx` sets it when marking todos covered. We need it for lossless migration
   and for the student endpoint wrappers to remain semantically equivalent.

3. **Extend status values.** `TeacherFollowup.Status` validator expands from `pending|done` to
   include `covered` and `dismissed` (normalised to lowercase as per AC).

4. **Keep `TeachingTodos` in request DTOs (ignored).** `CreateStudentRequest` and
   `UpdateStudentRequest` retain the `TeachingTodos` field for now so the frontend doesn't break.
   The service ignores it. A follow-on task can remove it.

5. **Student.TeacherFollowups navigation property.** Add `ICollection<TeacherFollowup>` to
   `Student` and update AppDbContext `.WithMany()` so EF projections in DashboardService can
   use navigation-based subqueries instead of JSON deserialization.

6. **Seeders updated.** `DemoSeeder` and `ScenarioSeeder` insert `TeacherFollowup` rows with
   `Kind="pedagogical"` instead of setting `TeachingTodos` JSON on the student.

---

## Step 1 — Schema migration: add Kind + CoveredInSessionLogId to TeacherFollowup

### Files
- `backend/LangTeach.Api/Data/Models/Student.cs`
- `backend/LangTeach.Api/Data/Models/TeacherFollowup.cs`
- `backend/LangTeach.Api/Data/AppDbContext.cs`
- New EF migration: `AddTeacherFollowupKindAndCoveredSession`

### Changes

**TeacherFollowup.cs**
```csharp
public string Kind { get; set; } = "operational"; // pedagogical | operational
public Guid? CoveredInSessionLogId { get; set; }
public SessionLog? CoveredInSessionLog { get; set; }
```

**Student.cs** — add reverse navigation property:
```csharp
public ICollection<TeacherFollowup> TeacherFollowups { get; set; } = [];
```

**AppDbContext.cs** — update `.WithMany()` → `.WithMany(s => s.TeacherFollowups)` for the
`HasOne(f => f.Student)` relationship. Add new FK configuration:
```csharp
e.Property(f => f.Kind).HasMaxLength(20).HasDefaultValue("operational");
e.HasOne(f => f.CoveredInSessionLog)
 .WithMany()
 .HasForeignKey(f => f.CoveredInSessionLogId)
 .IsRequired(false)
 .OnDelete(DeleteBehavior.NoAction);
e.HasIndex(f => new { f.TeacherId, f.StudentId, f.Kind });
```

**Run migration:**
```
dotnet ef migrations add AddTeacherFollowupKindAndCoveredSession --project backend/LangTeach.Api
```

---

## Step 2 — Data migration: copy TeachingTodos JSON → TeacherFollowup rows

### Files
- The EF migration from Step 1 (add raw SQL in `Up()`)

### SQL to embed in migration
Use `migrationBuilder.Sql(...)` inside the `AddTeacherFollowupKindAndCoveredSession` migration:

```sql
INSERT INTO TeacherFollowups
    (Id, TeacherId, StudentId, Text, Status, CreatedAt, SourceSessionLogId,
     CoveredInSessionLogId, Kind)
SELECT
    CAST(JSON_VALUE(t.value, '$.id')      AS UNIQUEIDENTIFIER),
    s.TeacherId,
    s.Id,
    JSON_VALUE(t.value, '$.text'),
    LOWER(ISNULL(JSON_VALUE(t.value, '$.status'), 'pending')),
    ISNULL(
        TRY_CAST(JSON_VALUE(t.value, '$.createdAt') AS DATETIME2),
        s.UpdatedAt),
    TRY_CAST(JSON_VALUE(t.value, '$.sourceSessionLogId') AS UNIQUEIDENTIFIER),
    TRY_CAST(JSON_VALUE(t.value, '$.coveredInSessionLogId') AS UNIQUEIDENTIFIER),
    'pedagogical'
FROM Students s
CROSS APPLY OPENJSON(s.TeachingTodos) AS t
WHERE s.TeachingTodos IS NOT NULL
  AND s.TeachingTodos <> '[]'
  AND s.TeachingTodos <> ''
  AND s.IsDeleted = 0
  AND JSON_VALUE(t.value, '$.id') IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM TeacherFollowups f
      WHERE f.Id = CAST(JSON_VALUE(t.value, '$.id') AS UNIQUEIDENTIFIER)
  );
```

Status normalization: `LOWER(...)` handles 'Pending' → 'pending', 'Covered' → 'covered', etc.

---

---

## Review-plan findings (addressed)

| Finding | Resolution |
|---------|-----------|
| `StudentServiceTests.cs` missing from test table | Added below with per-test disposition |
| `DashboardService` nav query: Include vs projection join | Use EF projection subquery (no Include needed in Select) |
| `ToDto` positional call site update not spelled out | Step 4 now explicitly shows the full new record |
| `MapToDto`: use `ToListAsync` not `AsEnumerable` | Updated snippet |
| SQL NULL-id guard | Added `AND JSON_VALUE(t.value, '$.id') IS NOT NULL` |
| `Guid.Parse` vs `TryParse` for SourceSessionLogId | Use `Guid.TryParse` |
| `UpdateTeacherFollowupRequest` is positional record | Updated approach (change attribute on existing parameter) |
| Lines 162/218 in StudentService need explicit removal | Called out in Step 3 |
| ScenarioSeeder has 3 student todos not 1 | Called out in seeder section |

---

## Step 3 — Remove TeachingTodos column + redirect service

### Files
- `backend/LangTeach.Api/Data/Models/Student.cs` — remove `TeachingTodos` property
- New EF migration: `DropStudentTeachingTodosColumn`
- `backend/LangTeach.Api/Services/StudentService.cs`
- `backend/LangTeach.Api/Services/IStudentService.cs`
- `backend/LangTeach.Api/Services/DashboardService.cs`
- `backend/LangTeach.Api/DTOs/StudentDto.cs` (no change to signature; source changes)
- `backend/LangTeach.Api/Data/DemoSeeder.cs`
- `backend/LangTeach.Api/Data/ScenarioSeeder.cs`

### Student.cs
Remove line: `public string TeachingTodos { get; set; } = "[]";`

### New migration: DropStudentTeachingTodosColumn
```
dotnet ef migrations add DropStudentTeachingTodosColumn --project backend/LangTeach.Api
```
EF will generate `migrationBuilder.DropColumn(name: "TeachingTodos", table: "Students")`.

### StudentService.cs
Use `AppDbContext` directly (already injected), no new service dependency.

**Private helper — maps TeacherFollowup to TeachingTodoDto:**
```csharp
private static TeachingTodoDto ToTodo(TeacherFollowup f) => new(
    f.Id.ToString(),
    f.Text,
    f.CreatedAt,
    f.SourceSessionLogId?.ToString(),
    f.Status,
    f.CoveredInSessionLogId?.ToString());
```

**MapToDto** — replace `JsonStorageHelper.DeserializeList<TeachingTodoDto>(s.TeachingTodos)` with
an async query (called after loading the student entity):
```csharp
var todos = await _db.TeacherFollowups
   .Where(f => f.StudentId == s.Id && f.Kind == "pedagogical")
   .OrderBy(f => f.CreatedAt)
   .ToListAsync(cancellationToken);
// ...todos.Select(ToTodo).ToList() in the DTO construction
```

**AppendTeachingTodoAsync** — `SourceSessionLogId` is `string?` in `CreateTeachingTodoDto`;
use `TryParse`:
```csharp
var followup = new TeacherFollowup {
    Id = Guid.NewGuid(),
    TeacherId = teacherId,
    StudentId = studentId,
    Text = request.Text,
    Status = "pending",
    CreatedAt = DateTime.UtcNow,
    SourceSessionLogId = Guid.TryParse(request.SourceSessionLogId, out var sid) ? sid : null,
    Kind = "pedagogical"
};
_db.TeacherFollowups.Add(followup);
await _db.SaveChangesAsync(cancellationToken);
return await GetByIdAsync(teacherId, studentId, cancellationToken);
```

**UpdateTeachingTodoAsync** — guard on Guid.TryParse, include both `done` and `covered` for
CompletedAt:
```csharp
if (!Guid.TryParse(todoId, out var todoGuid)) return null;
var followup = await _db.TeacherFollowups
    .FirstOrDefaultAsync(f => f.Id == todoGuid
                           && f.StudentId == studentId
                           && f.TeacherId == teacherId
                           && f.Kind == "pedagogical", cancellationToken);
if (followup is null) return null;
followup.Status = request.Status.ToLowerInvariant();
if (!string.IsNullOrWhiteSpace(request.Text)) followup.Text = request.Text;
if (request.CoveredInSessionLogId is not null &&
    Guid.TryParse(request.CoveredInSessionLogId, out var covGuid))
    followup.CoveredInSessionLogId = covGuid;
followup.CompletedAt = followup.Status is "done" or "covered" ? DateTime.UtcNow : null;
await _db.SaveChangesAsync(cancellationToken);
return await GetByIdAsync(teacherId, studentId, cancellationToken);
```

**DeleteTeachingTodoAsync:**
```csharp
if (!Guid.TryParse(todoId, out var todoGuid)) return null;
var followup = await _db.TeacherFollowups
    .FirstOrDefaultAsync(f => f.Id == todoGuid
                           && f.StudentId == studentId
                           && f.TeacherId == teacherId
                           && f.Kind == "pedagogical", cancellationToken);
if (followup is null) return null;
_db.TeacherFollowups.Remove(followup);
await _db.SaveChangesAsync(cancellationToken);
return await GetByIdAsync(teacherId, studentId, cancellationToken);
```

**Explicit removals from StudentService.cs:**
- Remove `ValidateTeachingTodos` method and both calls to it (CreateAsync + UpdateAsync)
- Remove `TeachingTodos = Serialize(request.TeachingTodos),` in `CreateAsync` (~line 162)
- Remove `student.TeachingTodos = Serialize(request.TeachingTodos);` in `UpdateAsync` (~line 218)
- Keep `TeachingTodos` field in `CreateStudentRequest`/`UpdateStudentRequest` (ignored, field stays)

### DashboardService.cs
Replace `s.TeachingTodos` selection and in-memory JSON deserialization.

EF Core translates navigation property subqueries in a `Select(s => new { ... })` projection
to SQL automatically (no `Include` needed):
```csharp
TeachingTodosCount = s.TeacherFollowups.Count(f => f.Kind == "pedagogical"),
PendingTodos = s.TeacherFollowups
    .Where(f => f.Kind == "pedagogical" && f.Status == "pending")
    .Select(f => new TeachingTodoDto(
        f.Id.ToString(), f.Text, f.CreatedAt,
        f.SourceSessionLogId != null ? f.SourceSessionLogId.ToString() : null,
        f.Status,
        f.CoveredInSessionLogId != null ? f.CoveredInSessionLogId.ToString() : null))
    .ToList()
```

In the `rows.Select(r => ...)` lambda, remove:
- `var allTodos = JsonStorageHelper.DeserializeList<TeachingTodoDto>(r.TeachingTodos);`
- `var pendingTodos = allTodos.Where(...).ToList();`
- Update `ActiveStudentDto` constructor to use `r.TeachingTodosCount` and `r.PendingTodos`.

### DemoSeeder.cs + ScenarioSeeder.cs
Instead of setting `TeachingTodos = """[...]"""` on the student objects, insert `TeacherFollowup`
rows after the student upsert:
```csharp
var todo = new TeacherFollowup {
    Id = Guid.Parse("a1b2c3d4-0000-0000-0000-000000000001"),
    TeacherId = teacher.Id,
    StudentId = anaId,
    Text = "Trabajar la diferencia entre artículo determinado e indeterminado",
    Status = "pending",
    Kind = "pedagogical",
    CreatedAt = new DateTime(2026, 4, 9, 10, 0, 0, DateTimeKind.Utc),
};
if (!db.TeacherFollowups.Any(f => f.Id == todo.Id))
    db.TeacherFollowups.Add(todo);
```
Use the same GUIDs as the current JSON so seeded data stays consistent.

**DemoSeeder** has `TeachingTodos` on 3 students (Ana Souza, one other with id `...010`, and one
with `...011`). All 3 need the same treatment.

**ScenarioSeeder** sets `TeachingTodos` at lines 139 (reset to `[]`), 418 (Clara), and 602 (Ana
Visual). Line 139 just clears the field — after refactor, delete any `Kind="pedagogical"` rows for
that student instead. Lines 418 and 602 insert 1-2 items — replace with `TeacherFollowup` inserts.

---

## Step 4 — API surface: add Kind to TeacherFollowupDto and request

### Files
- `backend/LangTeach.Api/DTOs/TeacherFollowupDto.cs`
- `backend/LangTeach.Api/Services/TeacherFollowupService.cs`

### TeacherFollowupDto.cs
```csharp
public record TeacherFollowupDto(
    string Id,
    string? StudentId,
    string? StudentName,
    string Text,
    string Status,
    DateTime CreatedAt,
    DateOnly? DueDate,
    DateTime? CompletedAt,
    string? SourceSessionLogId,
    string Kind);               // NEW
```

### CreateTeacherFollowupRequest
`CreateTeacherFollowupRequest` is a positional record. Add `Kind` as a trailing optional parameter:
```csharp
public record CreateTeacherFollowupRequest(
    [Required]
    [MaxLength(500)]
    [RegularExpression(@".*\S.*", ErrorMessage = "Text cannot be blank.")]
    string Text,
    Guid? StudentId,
    DateOnly? DueDate,
    Guid? SourceSessionLogId,
    [RegularExpression("^(pedagogical|operational)$",
        ErrorMessage = "Kind must be 'pedagogical' or 'operational'.")]
    string? Kind = null);  // defaults to "operational" in service
```

### UpdateTeacherFollowupRequest
`UpdateTeacherFollowupRequest` is a positional record. Change only the `[RegularExpression]`
attribute on the existing `Status` parameter (no structural change):
```csharp
public record UpdateTeacherFollowupRequest(
    [Required]
    [RegularExpression("^(pending|done|covered|dismissed)$",
        ErrorMessage = "Status must be 'pending', 'done', 'covered', or 'dismissed'.")]
    string Status);
```

### TeacherFollowupService.cs
`ToDto`:
```csharp
private static TeacherFollowupDto ToDto(TeacherFollowup f, string? studentName) =>
    new(f.Id.ToString(), f.StudentId?.ToString(), studentName, f.Text, f.Status,
        f.CreatedAt, f.DueDate, f.CompletedAt, f.SourceSessionLogId?.ToString(),
        f.Kind);
```

`CreateAsync` — use `request.Kind ?? "operational"`.

---

## Step 5 — PromptService: remove disambiguation prose

### File
- `backend/LangTeach.Api/AI/PromptService.cs`

### Change
Remove lines 1521-1523 (the "TeachingTodo vs TeacherFollowup distinction:" block):
```
TeachingTodo vs TeacherFollowup distinction:
- teachingTodos: pedagogical ideas...
- teacherFollowups: operational actions...
```

Keep the `teachingTodos` and `teacherFollowups` field names in the JSON schema section below it
(lines 1553-1554) since the frontend still expects these two separate arrays in the extraction
response. Only the verbose disambiguation explanation is removed.

---

## Tests to update

### StudentServiceTests.cs (critical — most tests change)

| Test | Action |
|------|--------|
| `TeachingTodos_JsonRoundTrip_Succeeds` | DELETE — UpdateStudentRequest.TeachingTodos is now ignored |
| `TeachingTodos_MaxEnforced_ThrowsValidation` | DELETE — 50-item limit removed |
| `TeachingTodos_InvalidStatus_ThrowsValidation` | DELETE — UpdateStudentRequest.TeachingTodos ignored |
| `TeachingTodos_StatusTransition_Covered_Succeeds` | REWRITE — seed via `AppendTeachingTodoAsync` then update; status returns `"covered"` (lowercase) |
| `TeachingTodos_StatusTransition_Dismissed_Succeeds` | REWRITE — same approach; status returns `"dismissed"` |
| `AppendTeachingTodoAsync_AppendsEntryWithPendingStatus` | UPDATE — change assertion `"Pending"` → `"pending"` |
| `UpdateTeachingTodoAsync_UnknownTodoId_ReturnsNull` | KEEP as-is |
| `AppendTeachingTodoAsync_WrongTeacher_ReturnsNull` | KEEP as-is |
| `DeleteTeachingTodoAsync_RemovesTodo_ReturnsUpdatedStudent` | REWRITE — seed two todos via `AppendTeachingTodoAsync` |
| `DeleteTeachingTodoAsync_UnknownTodoId_ReturnsNull` | UPDATE — assert null for real non-existent GUID |
| `DeleteTeachingTodoAsync_WrongTeacher_ReturnsNull` | KEEP (no seeding needed — returns null immediately) |
| `UpdateTeachingTodoAsync_WithText_UpdatesText` | REWRITE — seed via `AppendTeachingTodoAsync` |

### Other tests

| File | Change |
|------|--------|
| `StudentsControllerTests.cs` | `DeleteTeachingTodo_Succeeds`, `UpdateTeachingTodo_*`: student fixture no longer needs `TeachingTodos`. The controller tests call service methods; since the service now redirects to the DB, the assertions on `result.TeachingTodos` still work if the test DB is seeded via `AppendTeachingTodoAsync`. |
| `DashboardServiceTests.cs` | Replace `student.TeachingTodos = """[...]"""` (lines 250, 262) with `db.TeacherFollowups.Add(new TeacherFollowup{Kind="pedagogical", StudentId=..., TeacherId=...})` and `db.SaveChanges()`. Remove JSON fixture strings from test setup at lines 44, 417, 471. |
| `PromptServiceTests.cs` | Line 3209: `"teachingTodos"` still in prompt (JSON schema field) — assertion stays. No test checks for the removed disambiguation text, so no change needed. |
| `TeacherFollowupServiceTests.cs` | Remove `TeachingTodos = "[]"` from student fixtures (field no longer exists on model). |
| `TelegramConversationServiceTests.cs` | Remove `TeachingTodos: []` from `StudentDto` positional constructors. |

### New tests to add
- `StudentServiceTests.cs`: test `AppendTeachingTodo` stores in `TeacherFollowup` with `Kind="pedagogical"` (verify via db.TeacherFollowups assertion)
- `TeacherFollowupServiceTests.cs`: test `CreateAsync` with `Kind="pedagogical"` stores the kind field
- `DashboardServiceTests.cs`: `GetAsync_ActiveStudents_CountsTeachingTodos` rewritten against TeacherFollowup rows

---

## Acceptance Criteria Checklist

- [ ] `Student.TeachingTodos` JSON column no longer exists
- [ ] `TeacherFollowup` table has `Kind` column (`pedagogical|operational`)
- [ ] All existing TeachingTodos data migrated to TeacherFollowup with `Kind='pedagogical'`
- [ ] Dashboard pending-todo count reads from TeacherFollowup (no JSON deserialization)
- [ ] Status validation uses lowercase throughout
- [ ] `POST /api/teacher-followups` accepts `kind` field; defaults to `operational`
- [ ] PromptService no longer contains disambiguation prose
- [ ] All existing TeacherFollowup API behaviour (create, update, list, delete) unchanged
- [ ] Backend tests pass

---

## Build/Test Verification

```bash
cd backend && dotnet build
cd backend/LangTeach.Api.Tests && dotnet test
```
