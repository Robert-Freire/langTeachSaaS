using System.ComponentModel.DataAnnotations;
using LangTeach.Api.Data.Models;

namespace LangTeach.Api.DTOs;

public class SaveContentBlockRequest
{
    public Guid? LessonSectionId { get; set; }

    [Required]
    public ContentBlockType BlockType { get; set; }

    [Required, MinLength(1)]
    public string GeneratedContent { get; set; } = string.Empty;

    public string? GenerationParams { get; set; }
}
