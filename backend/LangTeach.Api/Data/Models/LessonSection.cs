namespace LangTeach.Api.Data.Models;

public class LessonSection
{
    public Guid Id { get; set; }
    public Guid LessonId { get; set; }
    public string SectionType { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Lesson Lesson { get; set; } = null!;
}
