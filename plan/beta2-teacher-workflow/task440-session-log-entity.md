# Task #440: SessionLog Entity, Migration, and CRUD API

## Goal

Create the `SessionLog` entity and full CRUD API so teachers can log what happened in each tutoring session. This is the foundation for the entire Post-Class Tracking sprint.

## Files to Create

| File | Purpose |
|------|---------|
| `backend/LangTeach.Api/Data/Models/SessionLog.cs` | Entity model |
| `backend/LangTeach.Api/Data/Models/HomeworkStatus.cs` | Enum for PreviousHomeworkStatus |
| `backend/LangTeach.Api/DTOs/SessionLogDtos.cs` | DTOs: SessionLogDto, CreateSessionLogRequest, UpdateSessionLogRequest |
| `backend/LangTeach.Api/Services/ISessionLogService.cs` | Service interface |
| `backend/LangTeach.Api/Services/SessionLogService.cs` | Service implementation |
| `backend/LangTeach.Api/Controllers/SessionLogsController.cs` | API controller |
| `backend/LangTeach.Api.Tests/Services/SessionLogServiceTests.cs` | Unit tests |

## Files to Modify

| File | Change |
|------|--------|
| `backend/LangTeach.Api/Data/AppDbContext.cs` | Add `DbSet<SessionLog>`, configure FK/indexes in `OnModelCreating` |
| `backend/LangTeach.Api/Data/Models/Student.cs` | Add `ICollection<SessionLog> SessionLogs` nav property |
| `backend/LangTeach.Api/Program.cs` | Register `ISessionLogService` DI |
| EF Migration (auto-generated) | `SessionLogs` table |

## Entity Design

```csharp
public class SessionLog
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public Guid TeacherId { get; set; }
    public DateTime SessionDate { get; set; }
    public string? PlannedContent { get; set; }
    public string? ActualContent { get; set; }
    public string? HomeworkAssigned { get; set; }
    public HomeworkStatus PreviousHomeworkStatus { get; set; }
    public string? NextSessionTopics { get; set; }
    public string? GeneralNotes { get; set; }
    public string? LevelReassessmentSkill { get; set; }
    public string? LevelReassessmentLevel { get; set; }
    public Guid? LinkedLessonId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Student Student { get; set; } = null!;
    public Teacher Teacher { get; set; } = null!;
    public Lesson? LinkedLesson { get; set; }
}
```

### HomeworkStatus Enum

```csharp
public enum HomeworkStatus
{
    NotApplicable = 0,
    NotDone = 1,
    Partial = 2,
    Done = 3
}
```

Stored as int in DB. `NotApplicable` is the default (value 0).

### DB Configuration

- FK to Student: `NoAction` cascade (SQL Server multi-path constraint, same pattern as Lesson)
- FK to Teacher: `NoAction` cascade (same reason)
- FK to Lesson (LinkedLessonId): nullable, `NoAction` cascade (per issue spec)
- Index on `(StudentId, SessionDate)` for the "list by student ordered by date" query
- TeacherId column is denormalized (could derive from Student.TeacherId) but needed for the auth guard query without a join

## API Endpoints

All nested under `/api/students/{studentId:guid}/sessions`.

| Method | Route | Status Codes |
|--------|-------|-------------|
| POST | `/` | 201 Created, 400, 401, 404 (student) |
| GET | `/` | 200, 401, 404 (student) |
| GET | `/{sessionId:guid}` | 200, 401, 404 |
| PUT | `/{sessionId:guid}` | 200, 401, 404 |

### Auth Guard

Controller resolves teacherId from Auth0 claims (same pattern as StudentsController). Service methods filter by teacherId so a teacher can only access their own students' sessions.

### Request Validation

- `SessionDate`: required
- `PreviousHomeworkStatus`: validated as valid enum value (0-3)
- `LinkedLessonId`: if provided, must be an existing lesson belonging to the same teacher
- String fields: no max length constraint in v1 (consistent with other entities)

### Response DTO

```csharp
public record SessionLogDto(
    Guid Id,
    Guid StudentId,
    DateTime SessionDate,
    string? PlannedContent,
    string? ActualContent,
    string? HomeworkAssigned,
    HomeworkStatus PreviousHomeworkStatus,
    string PreviousHomeworkStatusName,  // friendly string for frontend
    string? NextSessionTopics,
    string? GeneralNotes,
    string? LevelReassessmentSkill,
    string? LevelReassessmentLevel,
    Guid? LinkedLessonId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
```

## Service Implementation

`SessionLogService` follows the same pattern as `StudentService`:
- Constructor injection of `AppDbContext` and `ILogger`
- All methods take `teacherId` as first param for auth scoping
- `ListAsync`: returns `List<SessionLogDto>` ordered by SessionDate desc (no pagination in v1, sessions per student will be small)
- `GetByIdAsync`: returns `SessionLogDto?`
- `CreateAsync`: validates student belongs to teacher, validates LinkedLessonId if provided, sets CreatedAt/UpdatedAt
- `UpdateAsync`: validates ownership, returns null if not found

## Unit Tests

Test class: `SessionLogServiceTests` following `StudentServiceTests` pattern (InMemory DB, IDisposable).

Tests to write:
1. `CreateAsync_ValidRequest_ReturnsDto` - happy path
2. `CreateAsync_StudentNotFound_ThrowsKeyNotFoundException`
3. `CreateAsync_StudentBelongsToDifferentTeacher_ThrowsKeyNotFoundException`
4. `CreateAsync_InvalidHomeworkStatus_ThrowsValidationException`
5. `CreateAsync_WithLinkedLesson_SetsLessonId`
6. `CreateAsync_LinkedLessonNotFound_ThrowsKeyNotFoundException`
7. `ListAsync_ReturnsOrderedByDateDesc`
8. `ListAsync_FiltersbyTeacher_DoesNotReturnOtherTeachersData`
9. `GetByIdAsync_Found_ReturnsDto`
10. `GetByIdAsync_NotFound_ReturnsNull`
11. `GetByIdAsync_WrongTeacher_ReturnsNull`
12. `UpdateAsync_ValidRequest_ReturnsUpdatedDto`
13. `UpdateAsync_NotFound_ReturnsNull`

## Implementation Order

1. Entity + Enum models
2. AppDbContext configuration + Student nav property
3. EF Migration
4. DTOs (request + response)
5. Service interface + implementation
6. DI registration in Program.cs
7. Controller
8. Unit tests
9. Build verify
