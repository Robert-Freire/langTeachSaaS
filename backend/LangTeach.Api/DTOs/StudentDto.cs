namespace LangTeach.Api.DTOs;

public record StudentLevelDto(
    string CefrLevel,
    string? OfficialCefrLevel,
    Dictionary<string, string> SkillLevelOverrides
);

public record StudentLanguagesDto(
    List<string> NativeLanguages,
    List<string> SpokenLanguages
);

public record StudentIdentityDto(
    int? BirthYear,
    int? Age,
    string? Profession,
    string? CountryOfOrigin,
    string? CityOfOrigin,
    string? CountryOfResidence,
    string? CityOfResidence
);

public record StudentProfileDto(
    List<string> Interests,
    string? PersonalNotes,
    string? TeachingNotes,
    List<LearningGoalDto> LearningGoals,
    List<StudentWeaknessDto> Weaknesses,
    List<DifficultyDto> Difficulties,
    List<ShortTermObjectiveDto> ShortTermObjectives,
    List<TeachingTodoDto> TeachingTodos,
    string? ReasonForStudying
);

public record StudentCommercialDto(
    bool IsActive,
    bool IsCorporate,
    string? Rate
);

public record StudentDto(
    Guid Id,
    string Name,
    string LearningLanguage,
    StudentLevelDto Level,
    StudentLanguagesDto Languages,
    StudentIdentityDto Identity,
    StudentProfileDto Profile,
    StudentCommercialDto Commercial,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
