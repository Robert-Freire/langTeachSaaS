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
    // Known limitation (#1237): stores a 15-minute read SAS captured at upload time, so the URL
    // expires. Harmless today because the image is never re-rendered. IF an image preview is built
    // later, persist the blob path here instead and regenerate the SAS on read.
    [System.ComponentModel.DataAnnotations.MaxLength(2048)]
    public string? SourceImageUrl { get; set; }

    public bool IsDeleted { get; set; }
    [System.ComponentModel.DataAnnotations.Timestamp]
    public byte[] RowVersion { get; set; } = [];

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? CorrectedAt { get; set; }

    public ICollection<CorrectionTag> Tags { get; set; } = new List<CorrectionTag>();
}
