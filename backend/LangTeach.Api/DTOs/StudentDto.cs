namespace LangTeach.Api.DTOs;

public record StudentDto(
    Guid Id,
    string Name,
    string LearningLanguage,
    string CefrLevel,
    List<string> Interests,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
