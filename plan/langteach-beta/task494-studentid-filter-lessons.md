# Task 494: Add studentId filter to GET /api/lessons

## Problem
`SessionLogDialog` fetches lessons via `GET /api/lessons?pageSize=100` and filters by `studentId` client-side. No `studentId` filter exists on `LessonListQuery`.

## Changes

### Backend
1. `DTOs/LessonListQuery.cs` - add `Guid? StudentId { get; set; }`
2. `Services/LessonService.cs` - add filter clause when `query.StudentId.HasValue`

### Frontend
3. `api/lessons.ts` - add `studentId?: string` to `LessonListQuery` interface
4. `components/session/SessionLogDialog.tsx` - pass `studentId` in query, remove client-side filter

### Tests
5. `LangTeach.Api.Tests/Controllers/LessonsControllerTests.cs` - add test verifying studentId filter returns only matching lessons
6. `components/session/SessionLogDialog.test.tsx` - verify lessons query includes studentId param

## Acceptance Criteria
- `GET /api/lessons?studentId={id}` returns only lessons for that student
- `SessionLogDialog` passes studentId in the lessons request
- Calls without studentId return all lessons (backward compatible)
