namespace LangTeach.Api.Data.Models;

public class CourseSuggestion
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }

    // Which upcoming curriculum entry this suggestion targets (null = general course-level suggestion)
    public Guid? CurriculumEntryId { get; set; }

    // What the teacher should change in the upcoming lesson
    public string ProposedChange { get; set; } = string.Empty;

    // Why: evidence from lesson notes, difficulties, coverage gaps
    public string Reasoning { get; set; } = string.Empty;

    // "pending" | "accepted" | "dismissed"
    public string Status { get; set; } = "pending";

    // Teacher's inline edit before accepting (null = accepted as proposed)
    public string? TeacherEdit { get; set; }

    public DateTime GeneratedAt { get; set; }
    public DateTime? RespondedAt { get; set; }

    public Course Course { get; set; } = null!;
    public CurriculumEntry? CurriculumEntry { get; set; }
}
