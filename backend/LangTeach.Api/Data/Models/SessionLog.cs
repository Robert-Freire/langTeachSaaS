namespace LangTeach.Api.Data.Models;

public class SessionLog
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public Guid TeacherId { get; set; }
    public DateTime SessionDate { get; set; }
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
    public string TopicTags { get; set; } = "[]";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Student Student { get; set; } = null!;
    public Teacher Teacher { get; set; } = null!;
    public Lesson? LinkedLesson { get; set; }
}
