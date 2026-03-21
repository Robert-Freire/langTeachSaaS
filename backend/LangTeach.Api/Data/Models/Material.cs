namespace LangTeach.Api.Data.Models;

public class Material
{
    public Guid Id { get; set; }
    public Guid LessonSectionId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string BlobPath { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public LessonSection LessonSection { get; set; } = null!;
}
