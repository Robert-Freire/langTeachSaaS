namespace LangTeach.Api.DTOs;

public record CurriculumEntryDto(
    Guid Id,
    int OrderIndex,
    string Topic,
    string? GrammarFocus,
    string Competencies,
    string? LessonType,
    Guid? LessonId,
    string Status
);

public record CourseDto(
    Guid Id,
    string Name,
    string? Description,
    string Language,
    string Mode,
    string? TargetCefrLevel,
    string? TargetExam,
    DateOnly? ExamDate,
    int SessionCount,
    Guid? StudentId,
    string? StudentName,
    int LessonsCreated,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<CurriculumEntryDto> Entries
);

public record CourseSummaryDto(
    Guid Id,
    string Name,
    string? Description,
    string Language,
    string Mode,
    string? TargetCefrLevel,
    string? TargetExam,
    int SessionCount,
    Guid? StudentId,
    string? StudentName,
    int LessonsCreated,
    DateTime CreatedAt
);
