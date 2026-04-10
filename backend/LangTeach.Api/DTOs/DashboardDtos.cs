namespace LangTeach.Api.DTOs;

public record NextSessionDto(
    Guid SessionLogId,
    Guid StudentId,
    string StudentName,
    string StudentCefrLevel,
    DateTime SessionDate,
    string? PlannedContent,
    string? LastSessionNotes,
    DateTime? LastSessionDate,
    string? HomeworkAssigned,
    string? PreviousHomeworkStatus
);

public record TodaySessionDto(
    Guid SessionLogId,
    Guid StudentId,
    string StudentName,
    string StudentCefrLevel,
    DateTime SessionDate,
    string? PlannedContent,
    string Status
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
    int TeachingTodosCount,
    List<TeachingTodoDto> PendingTodos
);

public record DashboardDto(
    NextSessionDto? NextSession,
    List<TodaySessionDto> TodaySessions,
    List<ActiveStudentDto> ActiveStudents
);
