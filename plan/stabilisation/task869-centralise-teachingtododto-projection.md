# Task 869: Centralise TeachingTodoDto Projection

## Problem
Two independent sites project `TeacherFollowup` to `TeachingTodoDto`:
- `StudentService.ToTodo()` (static method, LINQ-to-Objects at line 273-279)
- `DashboardService` inline LINQ (IQueryable, EF Core-translated at lines 233-237)

Both must stay in sync when `TeachingTodoDto` shape changes.

## Approach
Introduce a single shared `Expression<Func<TeacherFollowup, TeachingTodoDto>>` that:
- EF Core can translate to SQL (used directly in `IQueryable` chains)
- Can be compiled to a cached `Func<>` for in-memory (LINQ-to-Objects) use

## Files to Change

### New: `backend/LangTeach.Api/DTOs/TeachingTodoDtoProjection.cs`
```csharp
using System.Linq.Expressions;
using LangTeach.Api.Data.Models;

namespace LangTeach.Api.DTOs;

public static class TeachingTodoDtoProjection
{
    public static readonly Expression<Func<TeacherFollowup, TeachingTodoDto>> Projection =
        f => new TeachingTodoDto(
            f.Id.ToString(),
            f.Text,
            f.CreatedAt,
            f.SourceSessionLogId != null ? f.SourceSessionLogId.ToString() : null,
            f.Status,
            f.CoveredInSessionLogId != null ? f.CoveredInSessionLogId.ToString() : null);

    public static readonly Func<TeacherFollowup, TeachingTodoDto> Compiled = Projection.Compile();
}
```

Use explicit null-check (not `?.ToString()`) for EF Core compatibility.

### Modify: `backend/LangTeach.Api/Services/StudentService.cs`
- Replace `.Select(ToTodo)` with `.Select(TeachingTodoDtoProjection.Compiled)` (line 262)
- Remove the `private static TeachingTodoDto ToTodo(TeacherFollowup f)` method (lines 273-279)

### Modify: `backend/LangTeach.Api/Services/DashboardService.cs`
- Replace inline `.Select(f => new TeachingTodoDto(...))` with `.Select(TeachingTodoDtoProjection.Projection)` (lines 233-237)

## Acceptance Criteria Checklist
- [ ] Single shared projection expression used in both services
- [ ] No behaviour change; all existing tests pass

## Test Strategy
Run `dotnet test` in `backend/`. No new tests needed (behaviour unchanged).
