namespace LangTeach.Api.Data.Models;

public class Course
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public Guid? StudentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Language { get; set; } = string.Empty;
    // "general" or "exam-prep"
    public string Mode { get; set; } = "general";
    public string? TargetCefrLevel { get; set; }
    public string? TargetExam { get; set; }
    public DateOnly? ExamDate { get; set; }
    public int SessionCount { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    // JSON-serialized List<CurriculumWarning> from post-generation validation; null when no warnings.
    public string? GenerationWarnings { get; set; }
    // JSON-serialized List<string> of warning keys the teacher has dismissed.
    public string? DismissedWarnings { get; set; }

    public Teacher Teacher { get; set; } = null!;
    public Student? Student { get; set; }
    public ICollection<CurriculumEntry> Entries { get; set; } = [];
}
