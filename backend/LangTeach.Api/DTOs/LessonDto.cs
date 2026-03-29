namespace LangTeach.Api.DTOs;

public record LessonDto(
    Guid Id,
    string Title,
    string Language,
    string CefrLevel,
    string Topic,
    int DurationMinutes,
    string? Objectives,
    string Status,
    Guid? StudentId,
    Guid? TemplateId,
    string? TemplateName,
    List<LessonSectionDto> Sections,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? ScheduledAt,
    string? StudentName,
    string[]? LearningTargets
);
