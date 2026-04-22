# Task 636: Teacher Dashboard Aggregation Endpoint

## Goal

Add `GET /api/dashboard` returning a single DTO with `nextSession`, `todaySessions`, and `activeStudents` for the authenticated teacher. Eliminates the N+1 pattern from the frontend dashboard redesign.

## Files to create

- `backend/LangTeach.Api/DTOs/DashboardDtos.cs`
- `backend/LangTeach.Api/Services/IDashboardService.cs`
- `backend/LangTeach.Api/Services/DashboardService.cs`
- `backend/LangTeach.Api/Controllers/DashboardController.cs`
- `backend/LangTeach.Api.Tests/Services/DashboardServiceTests.cs`

## Files to modify

- `backend/LangTeach.Api/Program.cs` — register `IDashboardService`

## DTOs (DashboardDtos.cs)

```csharp
public record NextSessionDto(
    Guid SessionLogId,
    Guid StudentId,
    string StudentName,
    string StudentCefrLevel,
    DateTime SessionDate,         // projected as sl.SessionDate!.Value (null filtered by Where)
    string? PlannedContent,
    string? LastSessionNotes,     // maps from SessionLog.GeneralNotes of the most recent past session
    DateTime? LastSessionDate,
    string? HomeworkAssigned,
    string? PreviousHomeworkStatus  // serialized as enum.ToString() (e.g. "Done")
);

public record TodaySessionDto(
    Guid SessionLogId,
    Guid StudentId,
    string StudentName,
    string StudentCefrLevel,
    DateTime SessionDate,         // projected as sl.SessionDate!.Value (null filtered by Where)
    string? PlannedContent,
    string Status                 // serialized as enum.ToString()
);

public record ActiveStudentDto(
    Guid StudentId,
    string Name,
    string CefrLevel,
    List<string> NativeLanguages,
    bool IsActive,
    DateTime? LastSessionDate,
    DateTime? NextSessionDate,
    int TotalSessions,
    int TeachingTodosCount
);

public record DashboardDto(
    NextSessionDto? NextSession,
    List<TodaySessionDto> TodaySessions,
    List<ActiveStudentDto> ActiveStudents
);
```

## Service logic (DashboardService)

All queries filter by `teacherId` to enforce teacher isolation.

### nextSession
```sql
SELECT TOP 1 sl.*, s.Name, s.CefrLevel
FROM SessionLogs sl
JOIN Students s ON sl.StudentId = s.Id
WHERE sl.TeacherId = @teacherId
  AND sl.IsDeleted = 0
  AND sl.IsCancelled = 0
  AND sl.SessionDate > GETUTCDATE()
ORDER BY sl.SessionDate ASC
```
Then a second query to get the most recent past session for that student (for `lastSessionNotes` / `lastSessionDate`).

### todaySessions
```csharp
.Where(sl => sl.TeacherId == teacherId && !sl.IsDeleted
          && sl.SessionDate.HasValue && sl.SessionDate.Value.Date == today)
.OrderBy(sl => sl.SessionDate)
```
Cancelled sessions **are included** in todaySessions (teacher needs to see their full schedule for today, cancelled or not). `Status` is serialized as `sl.Status.ToString()`.

### activeStudents
Single grouped query to avoid N+1:
```csharp
var students = await _db.Students
    .Where(s => s.TeacherId == teacherId && !s.IsDeleted && s.IsActive)
    .Select(s => new {
        s.Id, s.Name, s.CefrLevel, s.NativeLanguages, s.IsActive, s.TeachingTodos,
        LastSessionDate = s.SessionLogs
            .Where(sl => !sl.IsDeleted && sl.SessionDate < now)
            .Max(sl => (DateTime?)sl.SessionDate),
        NextSessionDate = s.SessionLogs
            .Where(sl => !sl.IsDeleted && !sl.IsCancelled && sl.SessionDate > now)
            .Min(sl => (DateTime?)sl.SessionDate),
        TotalSessions = s.SessionLogs.Count(sl => !sl.IsDeleted)
    })
    .ToListAsync();
```
Post-query in C#:
- `TeachingTodosCount` = `JsonSerializer.Deserialize<List<JsonElement>>(s.TeachingTodos)?.Count ?? 0`
- `NativeLanguages` = `JsonSerializer.Deserialize<List<string>>(s.NativeLanguages) ?? []`

Both are JSON string columns; deserialization must happen after the EF query (cannot be translated to SQL).

## Interface (IDashboardService)

```csharp
public interface IDashboardService
{
    Task<DashboardDto> GetAsync(Guid teacherId, CancellationToken cancellationToken = default);
}
```

## Controller (DashboardController)

- Route: `GET /api/dashboard`
- Inject `IDashboardService`, `IProfileService`
- Auth: `[Authorize]`, resolve `teacherId` via `IProfileService.UpsertTeacherAsync`
- Return `Ok(dto)`

## Unit tests (DashboardServiceTests)

Use in-memory EF (same pattern as `SessionLogServiceTests`).

Test cases:
1. **No data**: teacher exists, no students, no sessions — returns `null` nextSession, empty lists
2. **Next session**: one future session — nextSession populated correctly
3. **Multiple today sessions**: two sessions on today's date — todaySessions has 2 items ordered by time
4. **Active students**: students with sessions — lastSessionDate, nextSessionDate, totalSessions correct
5. **Student with no sessions**: in activeStudents with 0 totalSessions, null dates
6. **Cancelled session excluded from nextSession**: future cancelled session not returned as nextSession
7. **Deleted session excluded**: deleted session not counted in totals
8. **Cancelled today-session included**: cancelled session on today appears in todaySessions

## Non-goals

- EF query logging verification in tests (EF in-memory doesn't support it; N+1 verified by review)
- Frontend changes (out of scope per issue)
- TeacherFollowup / pendientes (separate issue)

## Notes

- `PreviousHomeworkStatus` in `NextSessionDto` is a string (enum name) for consistency with frontend consumption
- UTC date comparison for todaySessions uses `DateTime.UtcNow.Date`; EF will translate `.Date` property
- `teachingTodosCount`: `System.Text.Json.JsonSerializer.Deserialize<List<JsonElement>>(s.TeachingTodos)?.Count ?? 0`
