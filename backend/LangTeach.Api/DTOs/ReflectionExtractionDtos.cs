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

public record TopicTagDto(string Tag, string? Category);

public record ExtractedReflectionDto(
    string? WhatWasCovered,
    string? AreasToImprove,
    string? EmotionalSignals,
    string? HomeworkAssigned,
    string? NextLessonIdeas,
    string? SessionDate,
    List<SuggestedDifficultyDto> SuggestedDifficulties,
    string? RawExtractionJson,
    string? SessionTitle,
    List<TopicTagDto> TopicTags,
    string? PreviousHomeworkStatus,
    List<string> TeachingTodos,
    List<string> TeacherFollowups,
    string? LevelReassessment,
    int? DurationMinutes,
    bool? IsCancelled,
    List<string> DifficultiesWorkedOn
);
