namespace LangTeach.Api.Data.Models;

public class LessonContentBlock
{
    public Guid Id { get; set; }
    public Guid LessonId { get; set; }
    public Guid? LessonSectionId { get; set; }
    public ContentBlockType BlockType { get; set; }
    public string GeneratedContent { get; set; } = string.Empty;
    public string? EditedContent { get; set; }
    public string? GenerationParams { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Lesson Lesson { get; set; } = null!;
    public LessonSection? LessonSection { get; set; }
}
