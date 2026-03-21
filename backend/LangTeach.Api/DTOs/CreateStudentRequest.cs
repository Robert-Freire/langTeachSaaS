using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class CreateStudentRequest
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = "";

    [Required, MaxLength(100)]
    public string LearningLanguage { get; set; } = "";

    [Required]
    [RegularExpression(@"^(A1|A2|B1|B2|C1|C2)$", ErrorMessage = "CefrLevel must be one of: A1, A2, B1, B2, C1, C2.")]
    public string CefrLevel { get; set; } = "";

    [MaxLength(50, ErrorMessage = "Cannot have more than 50 interests.")]
    [MaxStringLengthEach(100)]
    public List<string> Interests { get; set; } = [];

    // Validated server-side against the allowed language list in StudentService.AllowedNativeLanguages.
    // Must stay in sync with the LANGUAGES constant in frontend/src/pages/StudentForm.tsx.
    public string? NativeLanguage { get; set; }

    [MaxCollectionCount(20)]
    [MaxStringLengthEach(100)]
    public List<string> LearningGoals { get; set; } = [];

    [MaxCollectionCount(30)]
    [MaxStringLengthEach(200)]
    public List<string> Weaknesses { get; set; } = [];

    [MaxCollectionCount(50)]
    public List<DifficultyDto> Difficulties { get; set; } = [];

    [MaxLength(2000)]
    public string? Notes { get; set; }
}
