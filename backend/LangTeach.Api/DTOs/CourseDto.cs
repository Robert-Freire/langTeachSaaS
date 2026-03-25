using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public record CurriculumEntryDto(
    Guid Id,
    int OrderIndex,
    string Topic,
    string? GrammarFocus,
    string Competencies,
    string? LessonType,
    Guid? LessonId,
    string Status,
    string? TemplateUnitRef,
    string? CompetencyFocus,
    string? ContextDescription,
    string? PersonalizationNotes,
    string? VocabularyThemes
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
    List<CurriculumEntryDto> Entries,
    List<CurriculumWarning>? Warnings,
    List<string>? DismissedWarningKeys
);

public record AddCurriculumEntryRequest(
    [Required][MaxLength(200)] string Topic,
    [MaxLength(200)] string? GrammarFocus,
    [MaxLength(500)] string? Competencies,
    [MaxLength(100)] string? LessonType
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
