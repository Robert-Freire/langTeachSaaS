using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class ExtractReflectionRequest
{
    [Required]
    [MaxLength(10000)]
    public string Text { get; set; } = string.Empty;
}

public record SuggestedDifficultyDto(
    string Description,
    string Competency,
    string Subcategory,
    string Severity
);

public record ExtractedReflectionDto(
    string? WhatWasCovered,
    string? AreasToImprove,
    string? EmotionalSignals,
    string? HomeworkAssigned,
    string? NextLessonIdeas,
    string? SessionDate,
    List<SuggestedDifficultyDto> SuggestedDifficulties
);
