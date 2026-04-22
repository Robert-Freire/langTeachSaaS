namespace LangTeach.Api.DTOs;

public record StudentDto(
    Guid Id,
    string Name,
    string LearningLanguage,
    string CefrLevel,
    List<string> Interests,
    string? PersonalNotes,
    string? TeachingNotes,
    List<string> NativeLanguages,
    List<LearningGoalDto> LearningGoals,
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
    List<string> SpokenLanguages,
    // Teaching fields
    List<TeachingTodoDto> TeachingTodos,
    // Skill override fields
    Dictionary<string, string> SkillLevelOverrides
)
{
    public int? GetAge()
    {
        if (BirthYear is not int year) return null;
        var current = DateTime.UtcNow.Year;
        return year >= current - 120 && year <= current ? current - year : null;
    }
}
