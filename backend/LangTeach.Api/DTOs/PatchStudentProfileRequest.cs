using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class PatchStudentProfileRequest
{
    public List<string>? AppendInterests { get; set; }
    public List<AppendDifficultyItem>? AppendDifficulties { get; set; }
    // Replaces the full learning goals list (last-write-wins semantics).
    public List<string>? LearningGoals { get; set; }
    public string? AppendTeachingNotes { get; set; }
}

public class AppendDifficultyItem
{
    [Required, MaxLength(500)]
    public string Description { get; set; } = "";

    [Required, MaxLength(100)]
    public string Competency { get; set; } = "";

    [MaxLength(200)]
    public string Subcategory { get; set; } = "";
}
