# Task 812 - Fix Teaching Todo Checkbox 400 Error

## Problem

Clicking a Teaching Todo checkbox returns a 400 Bad Request. The root cause is a case mismatch: the backend validates statuses against a lowercase set `["pending", "covered", "dismissed"]`, but the frontend sends PascalCase values (`"Pending"`, `"Covered"`).

## Evidence

- `StudentService.cs:47`: `AllowedTodoStatuses = ["pending", "covered", "dismissed"]`
- `TeachingTodosCard.tsx:144`: `const next = todo.status === 'Pending' ? 'Covered' : 'Pending'`
- `LogSession.tsx:373`: `updateTeachingTodo(..., { status: 'Covered', ... })`
- `StudentService.cs:402`: `AppendTeachingTodoAsync` creates todos with `status: "pending"` (lowercase), making existing stored todos invisible to the frontend's `=== 'Pending'` check

## Acceptance criteria

- [ ] Clicking a pending Teaching Todo checkbox marks it as covered and saves without error
- [ ] Clicking a covered Teaching Todo unchecks it (back to pending) and saves without error
- [ ] The status change persists after page reload
- [ ] No regression on the Followups checkbox
- [ ] Fix covers both Edit Student sidebar and LogSession left panel

## Fix plan

Normalize all status values to PascalCase throughout the backend (matching what the frontend already sends). No frontend changes needed.

### 1. `backend/LangTeach.Api/Services/StudentService.cs`

- Change `AllowedTodoStatuses` from `["pending", "covered", "dismissed"]` to `["Pending", "Covered", "Dismissed"]`
- Change `AppendTeachingTodoAsync`: `status: "pending"` → `"Pending"`

### 2. `backend/LangTeach.Api/Services/DashboardService.cs`

- Change `t.Status == "pending"` to `t.Status == "Pending"` (line 259)

### 3. `backend/LangTeach.Api/Data/DemoSeeder.cs`

- Update inline JSON literals: `"status":"pending"` → `"status":"Pending"`

### 4. `backend/LangTeach.Api/Data/ScenarioSeeder.cs`

- Update inline JSON literals: `"status":"pending"` → `"status":"Pending"`

### 5. Tests

Update any test assertions that expect lowercase status strings:
- `DashboardServiceTests.cs`: `student.PendingTodos[0].Status.Should().Be("pending")` → `"Pending"`
- `StudentServiceTests.cs`: any `"pending"`/`"covered"` status assertions
- `StudentsControllerTests.cs`: same

### 6. E2E test

Add/extend e2e test in `e2e/tests/students.spec.ts` to cover:
- Toggle Teaching Todo to covered (verify no network error, verify persistence after reload)
- Toggle back to pending

## Scope

- No frontend changes needed (frontend already uses PascalCase correctly)
- No migration needed (dev DB is re-seeded; existing data will normalize on first toggle)
- Followups use a separate endpoint (`updateFollowupStatus`) - not affected

## Files to change

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Services/StudentService.cs` | PascalCase allowed statuses + append initial status |
| `backend/LangTeach.Api/Services/DashboardService.cs` | PascalCase status comparison |
| `backend/LangTeach.Api/Data/DemoSeeder.cs` | PascalCase JSON literals |
| `backend/LangTeach.Api/Data/ScenarioSeeder.cs` | PascalCase JSON literals |
| `backend/LangTeach.Api.Tests/Services/DashboardServiceTests.cs` | PascalCase assertions |
| `backend/LangTeach.Api.Tests/Services/StudentServiceTests.cs` | PascalCase assertions |
| `backend/LangTeach.Api.Tests/Controllers/StudentsControllerTests.cs` | PascalCase assertions |
| `e2e/tests/students.spec.ts` | Add todo toggle test |
