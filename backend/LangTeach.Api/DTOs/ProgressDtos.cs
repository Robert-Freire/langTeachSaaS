namespace LangTeach.Api.DTOs;

public record StudentProgressDto(
    string StudentName,
    string? CourseName,
    Guid? CourseId,
    // Coverage
    int TotalEntries,
    int TaughtEntries,
    int CreatedEntries,
    int PlannedEntries,
    // Pacing
    int? PlannedSessionCount,
    int SessionsDone,
    DateOnly? ExamDate,
    string PacingStatus,
    int? DaysUntilExam,
    int? SessionsRemaining,
    // Difficulty trends
    List<DifficultyProgressDto> Difficulties,
    // Timeline
    List<TimelineEntryDto> Timeline
);

public record DifficultyProgressDto(
    string Id,
    string Description,
    string Competency,
    string Subcategory,
    string Severity,
    string Status,
    string Trend
);

public record TimelineEntryDto(
    int OrderIndex,
    string Topic,
    string? GrammarFocus,
    string Status,
    DateTime? SessionDate
);
