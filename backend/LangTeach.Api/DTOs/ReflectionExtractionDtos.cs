using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace LangTeach.Api.DTOs;

public sealed class CamelCaseStringEnumConverter : JsonStringEnumConverter
{
    public CamelCaseStringEnumConverter() : base(JsonNamingPolicy.CamelCase) { }
}

[JsonConverter(typeof(CamelCaseStringEnumConverter))]
public enum ExtractionMode { Append, Replace, Skip }

[JsonConverter(typeof(CamelCaseStringEnumConverter))]
public enum ExtractedHomeworkStatus { Done, Partial, NotDone }

public class ExtractReflectionRequest
{
    [Required]
    [MaxLength(10000)]
    public string Text { get; set; } = string.Empty;
}

public record ExtractedTextFieldDto(string? Value, ExtractionMode Mode);

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
    ExtractedHomeworkStatus? PreviousHomeworkStatus,
    List<string> TeachingTodos,
    List<string> TeacherFollowups,
    string? LevelReassessment,
    int? DurationMinutes,
    bool? IsCancelled,
    List<string> DifficultiesWorkedOn,
    string? SessionStartTime
);
