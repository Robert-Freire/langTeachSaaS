namespace LangTeach.Api.DTOs;

public record SessionListItemDto(
    Guid SessionLogId,
    Guid StudentId,
    string StudentName,
    string StudentCefrLevel,
    DateTime SessionDate,
    string? PlannedContent,
    string Status
);

public record SessionFilterStudentDto(Guid StudentId, string Name, string CefrLevel);

public record SessionsListDto(
    List<SessionListItemDto> Upcoming,
    List<SessionListItemDto> Today,
    List<SessionListItemDto> Recent,
    List<SessionFilterStudentDto> Students
);

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
    string? PreviousHomeworkStatus,
    List<string> LastSessionTopicTags,
    string? LastSessionHomework,
    List<string> LastSessionFollowups
);

public record UpcomingSessionDto(
    Guid SessionLogId,
    Guid StudentId,
    string StudentName,
    string StudentCefrLevel,
    DateTime SessionDate,
    string? PlannedContent
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
    List<TeachingTodoDto> PendingTodos,
    int CancelledSessionsLast30Days
);

public record DashboardDto(
    NextSessionDto? NextSession,
    List<TodaySessionDto> TodaySessions,
    List<ActiveStudentDto> ActiveStudents,
    List<TeacherFollowupDto> PendingFollowups,
    List<UpcomingSessionDto> UpcomingThisWeek
);
