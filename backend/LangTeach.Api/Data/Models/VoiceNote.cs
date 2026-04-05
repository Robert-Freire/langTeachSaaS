namespace LangTeach.Api.Data.Models;

public class VoiceNote
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public string BlobPath { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public int DurationSeconds { get; set; }
    public string? Transcription { get; set; }
    public DateTime? TranscribedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public Teacher Teacher { get; set; } = null!;
}
