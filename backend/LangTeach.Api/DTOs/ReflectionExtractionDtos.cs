using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public class ExtractReflectionRequest
{
    [Required]
    [MaxLength(10000)]
    public string Text { get; set; } = string.Empty;
}

public record ExtractedTextFieldDto(string? Value, string Mode); // Mode: "append" | "replace" | "skip"

public record SuggestedDifficultyDto(
    string Description,
    string Competency,
    string Subcategory,
    string Severity
);

public record TopicTagDto(string Tag, string? Category);

public record ExtractedReflectionDto(
    ExtractedTextFieldDto? WhatWasCovered,
    ExtractedTextFieldDto? AreasToImprove,
    string? EmotionalSignals,
    ExtractedTextFieldDto? HomeworkAssigned,
    ExtractedTextFieldDto? NextLessonIdeas,
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
    List<string> DifficultiesWorkedOn,
    string? SessionStartTime
);
