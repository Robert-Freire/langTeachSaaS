# Task 627: Student TeachingTodos field (backend prep)

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/627

## Goal
Add a `TeachingTodos` JSON column to `Student`, expose it via the existing GET/PUT `/api/students/{id}` endpoints, and add convenience POST/PATCH sub-resource endpoints for append and status update.

## JSON shape (stored on Student)
```json
[
  {
    "id": "uuid",
    "text": "Trabajar ser/estar en contextos de pasado",
    "createdAt": "2026-04-09T10:15:00Z",
    "sourceSessionLogId": "uuid-or-null",
    "status": "pending",
    "coveredInSessionLogId": null
  }
]
```
Status values: `pending | covered | dismissed`

## Implementation steps

### 1. DTOs
Create `backend/LangTeach.Api/DTOs/TeachingTodoDto.cs`:
```csharp
public record TeachingTodoDto(
    string Id,
    string Text,
    DateTime CreatedAt,
    string? SourceSessionLogId,
    string Status,
    string? CoveredInSessionLogId);

public record CreateTeachingTodoDto(string Text, string? SourceSessionLogId);

public record UpdateTeachingTodoDto(string Status, string? CoveredInSessionLogId);
```

### 2. Student model
Add to `Student.cs`:
```csharp
public string TeachingTodos { get; set; } = "[]";
```

### 3. EF migration
Run:
```bash
dotnet ef migrations add AddTeachingTodos --project backend/LangTeach.Api --startup-project backend/LangTeach.Api
```
Migration sets NOT NULL default `'[]'`.

### 4. StudentDto
Append `List<TeachingTodoDto> TeachingTodos` as the **last parameter** of the positional record (after `SpokenLanguages`). Update `MapToDto` to pass `JsonStorageHelper.DeserializeList<TeachingTodoDto>(s.TeachingTodos)` as the final argument.

### 5. StudentService
- `MapToDto`: add `JsonStorageHelper.DeserializeList<TeachingTodoDto>(s.TeachingTodos)`
- `CreateAsync`: initialize `TeachingTodos = "[]"` (already default, but explicit for clarity)
- `UpdateAsync`: accept `TeachingTodos` from request (full replacement), validate max 50 entries and each `Text` non-empty, length <= 500; validate `Status` is one of `pending | covered | dismissed`
- Add `ValidateTeachingTodos(List<TeachingTodoDto> todos)` private method
- Add `IStudentService` method stubs: `AppendTeachingTodoAsync`, `UpdateTeachingTodoAsync`
- Implement both in `StudentService`:
  - `AppendTeachingTodoAsync(teacherId, studentId, CreateTeachingTodoDto)`: deserialize current list, append new entry with generated Guid + UtcNow + status=pending, enforce max 50, save, return updated StudentDto
  - `UpdateTeachingTodoAsync(teacherId, studentId, todoId, UpdateTeachingTodoDto)`: find todo by id (return null if not found -- controller returns 404), update status and coveredInSessionLogId, validate status is one of the allowed values, save, return updated StudentDto
  - On full PUT replacement (UpdateAsync), caller-supplied `Id` values in `TeachingTodos` are trusted as-is (same as `ShortTermObjectives`). Do NOT regenerate IDs.

### 6. CreateStudentRequest / UpdateStudentRequest
Add to both:
```csharp
[MaxCollectionCount(50)]
public List<TeachingTodoDto> TeachingTodos { get; set; } = [];
```

### 7. StudentsController
Add two new endpoints:
```
POST  /api/students/{id}/teaching-todos        -> AppendTeachingTodoAsync
PATCH /api/students/{id}/teaching-todos/{todoId} -> UpdateTeachingTodoAsync
```

### 8. DemoSeeder
Add 2-3 teaching todos to Ana Souza seed student:
- "Trabajar la diferencia entre artículo determinado e indeterminado"
- "Repasar pretérito en narraciones personales"
- "Practicar ser/estar en descripciones" (optional third)

Set the `TeachingTodos` JSON column directly in the Ana Souza `new()` inline initializer (line 49 of DemoSeeder.cs), since the student is constructed inside a collection initializer. Post-construction assignment is not possible there. Use a raw JSON string literal identical to the shape above.

### 9. Unit tests
In `LangTeach.Api.Tests/Services/StudentServiceTests.cs`, add:
- `TeachingTodo_JsonRoundTrip_Succeeds` -- create student with todos via UpdateAsync, GetById returns correct deserialized list
- `TeachingTodo_StatusTransition_Covered_Succeeds`
- `TeachingTodo_StatusTransition_Dismissed_Succeeds`
- `TeachingTodo_MaxEnforced_ThrowsValidation` -- 51 entries rejected
- `TeachingTodo_InvalidStatus_ThrowsValidation`
- `UpdateTeachingTodoAsync_UnknownTodoId_ReturnsNull` -- PATCH with non-existent todoId returns null (controller 404)
- `AppendTeachingTodoAsync_WrongTeacher_ReturnsNull` -- auth boundary: different teacherId cannot append

## Acceptance criteria checklist
- [ ] EF migration adds `TeachingTodos` column (NOT NULL, default `[]`)
- [ ] `GET /api/students/{id}` returns teaching todos array
- [ ] `PUT /api/students/{id}` accepts full-replacement todos array
- [ ] `POST /api/students/{id}/teaching-todos` appends a new todo
- [ ] `PATCH /api/students/{id}/teaching-todos/{todoId}` updates status
- [ ] `sourceSessionLogId` stored and returned (nullable, no FK constraint)
- [ ] Seeder adds 2-3 todos for Ana Souza seed student
- [ ] Unit tests: JSON round-trip, status transitions, max-50 enforcement
- [ ] Max 50 entries validation enforced

## Out of scope
- Frontend UI (separate issues)
- TeacherFollowup / dashboard bandeja (different entity)
- dueHint / urgency field

## Files to modify
- `backend/LangTeach.Api/Data/Models/Student.cs`
- `backend/LangTeach.Api/DTOs/StudentDto.cs`
- `backend/LangTeach.Api/DTOs/CreateStudentRequest.cs`
- `backend/LangTeach.Api/DTOs/UpdateStudentRequest.cs`
- `backend/LangTeach.Api/Services/IStudentService.cs`
- `backend/LangTeach.Api/Services/StudentService.cs`
- `backend/LangTeach.Api/Controllers/StudentsController.cs`
- `backend/LangTeach.Api/Data/DemoSeeder.cs`
- `backend/LangTeach.Api.Tests/Services/StudentServiceTests.cs`

## Files to create
- `backend/LangTeach.Api/DTOs/TeachingTodoDto.cs`
- EF migration files (auto-generated)
