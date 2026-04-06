namespace LangTeach.Api.Data.Models;

public class SessionLog
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public Guid TeacherId { get; set; }
    public DateTime? SessionDate { get; set; }
    public string? PlannedContent { get; set; }
    public string? ActualContent { get; set; }
    public string? HomeworkAssigned { get; set; }
    public HomeworkStatus PreviousHomeworkStatus { get; set; }
    public string? NextSessionTopics { get; set; }
    public string? GeneralNotes { get; set; }
    public string? LevelReassessmentSkill { get; set; }
    public string? LevelReassessmentLevel { get; set; }
    public Guid? LinkedLessonId { get; set; }
    public bool IsDeleted { get; set; }
    public bool IsCancelled { get; set; }
    // Lifecycle: IsDeleted=true means soft-deleted (all other fields ignored).
    // IsCancelled=true + Status=Confirmed = teacher-confirmed cancellation.
    // Status=Draft = auto-saved from voice extraction, awaiting teacher confirmation.
    // Status=Draft + IsCancelled=true is not a valid combination.
    public SessionLogStatus Status { get; set; } = SessionLogStatus.Confirmed;
    public string TopicTags { get; set; } = "[]";
    public string MentionedDifficultyPairs { get; set; } = "[]";
    public string SuggestedDifficulties { get; set; } = "[]";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Student Student { get; set; } = null!;
    public Teacher Teacher { get; set; } = null!;
    public Lesson? LinkedLesson { get; set; }
}
