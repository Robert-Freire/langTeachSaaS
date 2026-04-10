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
    List<StudentWeaknessDto> Weaknesses,
    List<DifficultyDto> Difficulties,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    // Identity fields
    int? BirthYear,
    string? Profession,
    string? CountryOfOrigin,
    string? CityOfOrigin,
    string? CountryOfResidence,
    string? CityOfResidence,
    string? ReasonForStudying,
    // Level fields
    string? OfficialCefrLevel,
    // Plan fields
    List<ShortTermObjectiveDto> ShortTermObjectives,
    // Commercial fields
    bool IsActive,
    bool IsCorporate,
    string? Rate,
    // Language fields
    List<string> SpokenLanguages
);
