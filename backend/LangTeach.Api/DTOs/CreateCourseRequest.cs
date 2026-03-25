using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class CreateCourseRequest
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = "";

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Required, MaxLength(100)]
    public string Language { get; set; } = "";

    [Required]
    [RegularExpression(@"^(general|exam-prep)$", ErrorMessage = "Mode must be 'general' or 'exam-prep'.")]
    public string Mode { get; set; } = "general";

    [RegularExpression(@"^(A1|A2|B1|B2|C1|C2)$", ErrorMessage = "TargetCefrLevel must be one of: A1, A2, B1, B2, C1, C2.")]
    public string? TargetCefrLevel { get; set; }

    [MaxLength(100)]
    public string? TargetExam { get; set; }

    public DateOnly? ExamDate { get; set; }

    [Range(1, 100)]
    public int SessionCount { get; set; } = 10;

    public Guid? StudentId { get; set; }

    // Optional: use a curriculum template instead of AI generation (general mode only)
    [RegularExpression(@"^[ABC][12]\.\d+\+?$", ErrorMessage = "Invalid TemplateLevel format.")]
    [MaxLength(10)]
    public string? TemplateLevel { get; set; }

    // Optional teacher notes for constraints and context (e.g., "Relocating to Barcelona. Hates role-play.")
    [MaxLength(2000)]
    public string? TeacherNotes { get; set; }
}
