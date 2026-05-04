using LangTeach.Api.Services;
using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class CreateStudentRequest
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = "";

    [Required, MaxLength(100)]
    public string LearningLanguage { get; set; } = "";

    [Required]
    [RegularExpression(CefrConstants.ValidationPattern, ErrorMessage = "CefrLevel must be one of: A1, A2, B1, B2, C1, C2.")]
    public string CefrLevel { get; set; } = "";

    [MaxLength(50, ErrorMessage = "Cannot have more than 50 interests.")]
    [MaxStringLengthEach(100)]
    public List<string> Interests { get; set; } = [];

    // Each element validated server-side against StudentService.AllowedNativeLanguages.
    // Must stay in sync with ALL_LANGUAGES in frontend/src/lib/languages.ts.
    [MaxCollectionCount(5)]
    [MaxStringLengthEach(50)]
    public List<string> NativeLanguages { get; set; } = [];

    // Top-level count capped here; nested structure (max 2 levels, IDs, text length) validated in StudentService.ValidateLearningGoals.
    [MaxCollectionCount(20)]
    public List<LearningGoalDto> LearningGoals { get; set; } = [];

    [MaxCollectionCount(30)]
    public List<StudentWeaknessDto> Weaknesses { get; set; } = [];

    [MaxCollectionCount(50)]
    public List<DifficultyDto> Difficulties { get; set; } = [];

    [MaxLength(2000)]
    public string? PersonalNotes { get; set; }

    [MaxLength(2000)]
    public string? TeachingNotes { get; set; }

    // Identity fields
    public int? BirthYear { get; set; }

    [MaxLength(128)]
    public string? Profession { get; set; }

    [MaxLength(64)]
    public string? CountryOfOrigin { get; set; }

    [MaxLength(64)]
    public string? CityOfOrigin { get; set; }

    [MaxLength(64)]
    public string? CountryOfResidence { get; set; }

    [MaxLength(64)]
    public string? CityOfResidence { get; set; }

    [MaxLength(512)]
    public string? ReasonForStudying { get; set; }

    // Level fields
    [RegularExpression(CefrConstants.ValidationPattern, ErrorMessage = "OfficialCefrLevel must be one of: A1, A2, B1, B2, C1, C2.")]
    public string? OfficialCefrLevel { get; set; }

    // Plan fields
    [MaxCollectionCount(10)]
    public List<ShortTermObjectiveDto> ShortTermObjectives { get; set; } = [];

    // Commercial fields
    public bool IsActive { get; set; } = true;
    public bool IsCorporate { get; set; }

    [MaxLength(32)]
    public string? Rate { get; set; }

    // Language fields
    [MaxCollectionCount(20)]
    [MaxStringLengthEach(64)]
    public List<string> SpokenLanguages { get; set; } = [];

    // Teaching fields
    [MaxCollectionCount(50)]
    public List<TeachingTodoDto> TeachingTodos { get; set; } = [];

    // Skill override fields (keys: Reading, Writing, Speaking, Listening; values: A1-C2)
    public Dictionary<string, string> SkillLevelOverrides { get; set; } = new();
}
