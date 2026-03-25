namespace LangTeach.Api.Data.Models;

public class Lesson
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public Guid? StudentId { get; set; }
    public Guid? TemplateId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public string CefrLevel { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public string? Objectives { get; set; }
    public string Status { get; set; } = "Draft";
    public bool IsDeleted { get; set; }
    public string? LearningTargets { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ScheduledAt { get; set; }

    public Teacher Teacher { get; set; } = null!;
    public Student? Student { get; set; }
    public LessonTemplate? Template { get; set; }
    public ICollection<LessonSection> Sections { get; set; } = [];
    public LessonNote? Notes { get; set; }
}
