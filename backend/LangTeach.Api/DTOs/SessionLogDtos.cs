using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using LangTeach.Api.Data.Models;

namespace LangTeach.Api.DTOs;

public record DifficultyPairDto(string Competency, string Subcategory);

public record SessionLogDto(
    Guid Id,
    Guid StudentId,
    Guid TeacherId,
    DateTime? SessionDate,
    string? PlannedContent,
    string? ActualContent,
    string? HomeworkAssigned,
    HomeworkStatus PreviousHomeworkStatus,
    string PreviousHomeworkStatusName,
    string? NextSessionTopics,
    string? GeneralNotes,
    string? LevelReassessmentSkill,
    string? LevelReassessmentLevel,
    Guid? LinkedLessonId,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string TopicTags,
    bool IsCancelled,
    SessionLogStatus Status,
    string StatusName,
    string MentionedDifficultyPairs,
    string SuggestedDifficulties
);

public class CreateSessionLogRequest
{
    public DateTime? SessionDate { get; set; }

    [MaxLength(5000)]
    public string? PlannedContent { get; set; }

    [MaxLength(5000)]
    public string? ActualContent { get; set; }

    [MaxLength(2000)]
    public string? HomeworkAssigned { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public HomeworkStatus PreviousHomeworkStatus { get; set; }

    [MaxLength(2000)]
    public string? NextSessionTopics { get; set; }

    [MaxLength(5000)]
    public string? GeneralNotes { get; set; }

    [MaxLength(20)]
    public string? LevelReassessmentSkill { get; set; }

    [MaxLength(10)]
    public string? LevelReassessmentLevel { get; set; }

    public Guid? LinkedLessonId { get; set; }

    [MaxLength(2000)]
    public string? TopicTags { get; set; }

    public bool IsCancelled { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public SessionLogStatus Status { get; set; } = SessionLogStatus.Confirmed;

    public List<DifficultyPairDto>? MentionedDifficultyPairs { get; set; }
    public List<SuggestedDifficultyDto>? SuggestedDifficulties { get; set; }
}

public record StudentSessionSummaryDto(
    int TotalSessions,
    string? LastSessionDate,
    int? DaysSinceLastSession,
    List<string> OpenActionItems,
    bool LevelReassessmentPending,
    Dictionary<string, string> SkillLevelOverrides
);

/// <remarks>
/// Full-replace semantics: every field must be included in the request body.
/// Nullable fields that are omitted will be set to null on the stored record.
/// </remarks>
public class UpdateSessionLogRequest
{
    public DateTime? SessionDate { get; set; }

    [MaxLength(5000)]
    public string? PlannedContent { get; set; }

    [MaxLength(5000)]
    public string? ActualContent { get; set; }

    [MaxLength(2000)]
    public string? HomeworkAssigned { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public HomeworkStatus PreviousHomeworkStatus { get; set; }

    [MaxLength(2000)]
    public string? NextSessionTopics { get; set; }

    [MaxLength(5000)]
    public string? GeneralNotes { get; set; }

    [MaxLength(20)]
    public string? LevelReassessmentSkill { get; set; }

    [MaxLength(10)]
    public string? LevelReassessmentLevel { get; set; }

    public Guid? LinkedLessonId { get; set; }

    [MaxLength(2000)]
    public string? TopicTags { get; set; }

    public bool IsCancelled { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public SessionLogStatus Status { get; set; } = SessionLogStatus.Confirmed;

    public List<DifficultyPairDto>? MentionedDifficultyPairs { get; set; }
    public List<SuggestedDifficultyDto>? SuggestedDifficulties { get; set; }
}
