namespace LangTeach.Api.DTOs;

public record ContentBlockDto(
    Guid Id,
    Guid? LessonSectionId,
    string BlockType,
    string GeneratedContent,
    string? EditedContent,
    bool IsEdited,
    string? GenerationParams,
    DateTime CreatedAt);
