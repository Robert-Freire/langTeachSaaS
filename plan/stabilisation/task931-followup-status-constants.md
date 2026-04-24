# Task #931 — TeacherFollowup: unify status/kind validation with constants class

## Problem

1. **MAJOR**: `UpdateTeachingTodoDto` accepts both title-case and lowercase status values (regex `Pending|Done|...`), while `UpdateTeacherFollowupRequest` accepts lowercase only. Both write to the same `TeacherFollowup.Status` column. Services normalize via `.ToLowerInvariant()` today, but the permissive DTO regex signals mixed-case is acceptable.

2. `TeacherFollowupStatuses` constants class is missing — "pending"/"done"/"covered"/"dismissed" strings are duplicated across DTOs, services, seeders, model defaults, and AppDbContext.

3. `CreateTeacherFollowupRequest.Kind` already has a comment "regex must stay as string literal for attributes" but the error message strings could reference constants via a comment pointer.

## Approach

### Step 1: Add `TeacherFollowupStatuses` constants class
Mirror of `TeacherFollowupKinds`, in `Data/Models/`.

### Step 2: Fix `UpdateTeachingTodoDto` regex — lowercase only
Change `^(Pending|Done|Covered|Dismissed|pending|done|covered|dismissed)$` to `^(pending|done|covered|dismissed)$`.
Add comment pointer to `TeacherFollowupStatuses`.

### Step 3: Add comment pointer to `UpdateTeacherFollowupRequest`
Add comment "// Allowed values defined in TeacherFollowupStatuses; regex must stay as string literal for attributes".

### Step 4: Normalize status on write in service layer
Both `TeacherFollowupService.UpdateStatusAsync` and `StudentService.UpdateTeachingTodoAsync` already call `.ToLowerInvariant()`. Keep as-is, add a comment citing the guard.

### Step 5: Update status string literals in service layer to use constants
- `TeacherFollowupService`: `Status = "pending"` on create → `TeacherFollowupStatuses.Pending`
- `StudentService`: `Status = "pending"` on create → `TeacherFollowupStatuses.Pending`
- Status comparisons: `"done" or "covered"` → constants

### Step 6: Update seeders to use constants
- `DemoSeeder.cs`: all `Status = "pending"` literal lines
- `ScenarioSeeder.cs`: all `Status = "pending"` literal lines
Note: Only status literals on `TeacherFollowup` entities, not on `CurriculumEntry` or `SessionLog`.

### Step 7: Update model default
`TeacherFollowup.Status = "pending"` → `TeacherFollowupStatuses.Pending`

### Step 8: Add unit tests
In `backend/LangTeach.Api.Tests/DTOs/` add a new test file `TeacherFollowupDtoValidationTests.cs`.

Tests:
- `UpdateTeachingTodoDto` rejects title-case "Pending", "Done", "Covered", "Dismissed"
- `UpdateTeachingTodoDto` accepts lowercase "pending", "done", "covered", "dismissed"
- `UpdateTeacherFollowupRequest` rejects title-case "Pending"
- `UpdateTeacherFollowupRequest` accepts lowercase "pending"

Use `System.ComponentModel.DataAnnotations.Validator` directly (same pattern as existing DTO tests).

## Files changed
- `backend/LangTeach.Api/Data/Models/TeacherFollowupStatuses.cs` (NEW)
- `backend/LangTeach.Api/DTOs/TeachingTodoDto.cs`
- `backend/LangTeach.Api/DTOs/TeacherFollowupDto.cs`
- `backend/LangTeach.Api/Data/Models/TeacherFollowup.cs`
- `backend/LangTeach.Api/Services/TeacherFollowupService.cs`
- `backend/LangTeach.Api/Services/StudentService.cs`
- `backend/LangTeach.Api/Data/DemoSeeder.cs`
- `backend/LangTeach.Api/Data/ScenarioSeeder.cs`
- `backend/LangTeach.Api.Tests/DTOs/TeacherFollowupDtoValidationTests.cs` (NEW)

## No migration needed
The Status column has no DB check constraint (only Kind does). No schema change required.

## No e2e required
This is a backend validation correctness fix. Existing e2e tests cover the status update flows.
