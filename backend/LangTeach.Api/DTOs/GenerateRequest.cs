using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class GenerateRequest
{
    [Required, NotEmptyGuid]
    public Guid LessonId { get; set; }

    [Required, MinLength(1)]
    public string Language { get; set; } = string.Empty;

    [Required, MinLength(1)]
    public string CefrLevel { get; set; } = string.Empty;

    [Required, MinLength(1)]
    public string Topic { get; set; } = string.Empty;

    public string Style { get; set; } = "Conversational";

    public Guid? StudentId { get; set; }

    public string? ExistingNotes { get; set; }

    [MaxLength(200)]
    public string? Direction { get; set; }

    [MaxLength(500)]
    public string? GrammarConstraints { get; set; }
}
