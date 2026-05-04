using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace LangTeach.Api.DTOs;

// These extraction enums use camelCase (not PascalCase) because the AI prompt contract
// specifies lowercase values ("append", "replace", "skip"). Other domain enums in the
// project use PascalCase via plain JsonStringEnumConverter — do not change this.
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

public record ProposedNewSession(string Title, string? Date);

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
    string? SessionStartTime,
    ProposedNewSession? ProposedNewSession
);
