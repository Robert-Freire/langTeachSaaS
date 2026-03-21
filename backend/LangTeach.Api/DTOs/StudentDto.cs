namespace LangTeach.Api.DTOs;

public record StudentDto(
    Guid Id,
    string Name,
    string LearningLanguage,
    string CefrLevel,
    List<string> Interests,
    string? Notes,
    string? NativeLanguage,
    List<string> LearningGoals,
    List<string> Weaknesses,
    List<DifficultyDto> Difficulties,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
