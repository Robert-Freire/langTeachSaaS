using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class SaveContentBlockRequest
{
    public Guid? LessonSectionId { get; set; }

    [Required, MinLength(1)]
    public string BlockType { get; set; } = string.Empty;

    [Required, MinLength(1)]
    public string GeneratedContent { get; set; } = string.Empty;

    public string? GenerationParams { get; set; }
}
