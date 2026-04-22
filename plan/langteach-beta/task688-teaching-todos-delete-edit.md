# Task 688: Teaching Todos Delete + Text-Edit Backend Endpoints

## Goal
Add DELETE and text-edit support for teaching todos, unblocking #665.

## Acceptance Criteria
- [ ] `DELETE /api/students/{id}/teaching-todos/{todoId}` removes the todo and returns updated student
- [ ] `PATCH /api/students/{id}/teaching-todos/{todoId}` accepts optional `Text` field (max 500 chars)
- [ ] Unit tests for both operations in `StudentServiceTests`
- [ ] Controller tests updated

## Current State
- `TeachingTodos` stored as JSON on the `Student` entity
- `UpdateTeachingTodoDto` only has `Status` + `CoveredInSessionLogId`
- No DELETE endpoint exists

## Changes

### 1. DTOs (`backend/LangTeach.Api/DTOs/TeachingTodoDto.cs`)
- Add `Text? string` to `UpdateTeachingTodoDto` (optional, max 500 chars)

### 2. Service interface (`backend/LangTeach.Api/Services/IStudentService.cs`)
- Add `Task<StudentDto?> DeleteTeachingTodoAsync(Guid teacherId, Guid studentId, string todoId, CancellationToken ct)`

### 3. Service (`backend/LangTeach.Api/Services/StudentService.cs`)
- `UpdateTeachingTodoAsync`: `Status` remains `[Required]`; if `request.Text` is provided, validate (1-500 chars) and update the text field. Callers must always pass the current/desired status (keeps existing validation logic unchanged).
- `DeleteTeachingTodoAsync`: find student, deserialize todos, remove by id, return null if todo not found, save + return updated student

### 4. Controller (`backend/LangTeach.Api/Controllers/StudentsController.cs`)
- Add `DELETE {id:guid}/teaching-todos/{todoId}` action calling `DeleteTeachingTodoAsync`
- Returns 200 with updated student on success (consistent with PATCH), 404 if not found

### 5. Tests (`backend/LangTeach.Api.Tests/Services/StudentServiceTests.cs`)
- `DeleteTeachingTodoAsync_RemovesTodo_ReturnsUpdatedStudent`
- `DeleteTeachingTodoAsync_UnknownTodoId_ReturnsNull`
- `DeleteTeachingTodoAsync_WrongTeacher_ReturnsNull`
- `UpdateTeachingTodoAsync_WithText_UpdatesText`
- `UpdateTeachingTodoAsync_TextTooLong_ThrowsValidation`

### 6. Controller tests (`backend/LangTeach.Api.Tests/Controllers/StudentsControllerTests.cs`)
- Add DELETE endpoint tests (success 204, not found 404)

## Notes
- No migration needed (TeachingTodos is a JSON column, no schema change)
- Reorder is out of scope per issue recommendation
