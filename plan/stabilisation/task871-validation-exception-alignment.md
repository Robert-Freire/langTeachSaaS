# Task 871: Align ValidationException error handling in StudentsController and CoursesController

## Issue
#871 — follow-up to #852.

## Changes

**StudentsController** (4 occurrences):
- `Create` (line ~66): `ValidationProblem(ex.Message)` → `ModelState.AddModelError + BadRequest(ModelState)`
- `Update` (line ~114): same
- `AppendTeachingTodo` (line ~147): same (fully-qualified `System.ComponentModel.DataAnnotations.ValidationException`)
- `UpdateTeachingTodo` (line ~168): same

**CoursesController** (1 occurrence):
- `Create` (line ~59): raw `BadRequest(ex.Message)` → `ModelState.AddModelError + BadRequest(ModelState)`

## Testing
- `dotnet build`: 0 errors, 0 warnings
- `dotnet test`: 1141 passed, 0 failed
