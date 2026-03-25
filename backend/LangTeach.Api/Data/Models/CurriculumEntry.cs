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
    // Reference to the original template unit (null for AI-generated entries)
    public string? TemplateUnitRef { get; set; }
    // Comma-separated CEFR skill codes, e.g. "EO,CO" (null for AI-generated entries)
    public string? CompetencyFocus { get; set; }
    // AI-generated personalized scenario for this session (e.g., "Marco at a Barcelona registration office")
    public string? ContextDescription { get; set; }
    // AI rationale for personalization choices (emphasis areas, constraint compliance)
    public string? PersonalizationNotes { get; set; }

    public Course Course { get; set; } = null!;
    public Lesson? Lesson { get; set; }
}
