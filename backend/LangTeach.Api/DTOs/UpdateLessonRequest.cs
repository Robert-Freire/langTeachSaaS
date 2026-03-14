using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class UpdateLessonRequest
{
    [Required, MaxLength(200)]
    public string Title { get; set; } = "";

    [Required, MaxLength(100)]
    public string Language { get; set; } = "";

    [Required]
    [RegularExpression(@"^(A1|A2|B1|B2|C1|C2)$", ErrorMessage = "CefrLevel must be one of: A1, A2, B1, B2, C1, C2.")]
    public string CefrLevel { get; set; } = "";

    [Required, MaxLength(200)]
    public string Topic { get; set; } = "";

    [Range(1, 300)]
    public int DurationMinutes { get; set; } = 60;

    [MaxLength(2000)]
    public string? Objectives { get; set; }

    [RegularExpression(@"^(Draft|Published)$", ErrorMessage = "Status must be Draft or Published.")]
    public string Status { get; set; } = "Draft";

    public Guid? StudentId { get; set; }
}
