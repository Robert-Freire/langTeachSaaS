using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using LangTeach.Api.Data.Models;

namespace LangTeach.Api.DTOs;

public record SessionLogDto(
    Guid Id,
    Guid StudentId,
    DateTime SessionDate,
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
    DateTime UpdatedAt
);

public class CreateSessionLogRequest
{
    [Required]
    public DateTime SessionDate { get; set; }

    public string? PlannedContent { get; set; }
    public string? ActualContent { get; set; }
    public string? HomeworkAssigned { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public HomeworkStatus PreviousHomeworkStatus { get; set; }

    public string? NextSessionTopics { get; set; }
    public string? GeneralNotes { get; set; }
    public string? LevelReassessmentSkill { get; set; }
    public string? LevelReassessmentLevel { get; set; }
    public Guid? LinkedLessonId { get; set; }
}

public class UpdateSessionLogRequest
{
    [Required]
    public DateTime SessionDate { get; set; }

    public string? PlannedContent { get; set; }
    public string? ActualContent { get; set; }
    public string? HomeworkAssigned { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public HomeworkStatus PreviousHomeworkStatus { get; set; }

    public string? NextSessionTopics { get; set; }
    public string? GeneralNotes { get; set; }
    public string? LevelReassessmentSkill { get; set; }
    public string? LevelReassessmentLevel { get; set; }
    public Guid? LinkedLessonId { get; set; }
}
