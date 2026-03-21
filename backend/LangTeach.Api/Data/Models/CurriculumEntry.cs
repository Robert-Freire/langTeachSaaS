namespace LangTeach.Api.Data.Models;

public class CurriculumEntry
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public int OrderIndex { get; set; }
    public string Topic { get; set; } = string.Empty;
    public string? GrammarFocus { get; set; }
    // Comma-separated: reading,writing,listening,speaking
    public string Competencies { get; set; } = string.Empty;
    public string? LessonType { get; set; }
    public Guid? LessonId { get; set; }
    // "planned" | "created" | "taught"
    public string Status { get; set; } = "planned";

    public Course Course { get; set; } = null!;
    public Lesson? Lesson { get; set; }
}
