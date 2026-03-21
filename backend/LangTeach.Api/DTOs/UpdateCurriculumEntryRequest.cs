using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class UpdateCurriculumEntryRequest
{
    [Required, MaxLength(200)]
    public string Topic { get; set; } = "";

    [MaxLength(200)]
    public string? GrammarFocus { get; set; }

    [MaxLength(200)]
    public string? Competencies { get; set; }

    [MaxLength(100)]
    public string? LessonType { get; set; }
}
