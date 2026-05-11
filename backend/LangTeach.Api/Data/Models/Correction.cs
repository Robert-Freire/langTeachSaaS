namespace LangTeach.Api.Data.Models;

public class Correction
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public Guid StudentId { get; set; }
    public Guid? LessonId { get; set; }
    public Guid? SessionLogId { get; set; }

    public int SchemaVersion { get; set; } = 1;
    public string Status { get; set; } = CorrectionStatus.Pendiente;

    public string AssignmentTitle { get; set; } = string.Empty;
    public string? AssignmentPrompt { get; set; }
    public string? StudentText { get; set; }
    public string? MarkedUpOutput { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? CorrectedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public ICollection<CorrectionTag> Tags { get; set; } = new List<CorrectionTag>();
}
