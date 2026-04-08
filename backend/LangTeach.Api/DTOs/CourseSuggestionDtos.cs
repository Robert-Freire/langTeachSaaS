namespace LangTeach.Api.DTOs;

public record CourseSuggestionDto(
    Guid Id,
    Guid CourseId,
    Guid? CurriculumEntryId,
    string? CurriculumEntryTopic,
    int? CurriculumEntryOrderIndex,
    string ProposedChange,
    string Reasoning,
    string Status,
    string? TeacherEdit,
    DateTime GeneratedAt,
    DateTime? RespondedAt
);

public record RespondToSuggestionRequest(
    string Action,      // "accept" | "dismiss"
    string? TeacherEdit
);
