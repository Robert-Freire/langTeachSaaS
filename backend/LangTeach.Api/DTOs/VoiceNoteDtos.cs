using System.ComponentModel.DataAnnotations;

namespace LangTeach.Api.DTOs;

public record VoiceNoteDto(
    Guid Id,
    string OriginalFileName,
    string ContentType,
    long SizeBytes,
    int DurationSeconds,
    string? Transcription,
    DateTime? TranscribedAt,
    DateTime CreatedAt
);

public class UpdateTranscriptionRequest
{
    [Required]
    [MaxLength(10000)]
    public string Transcription { get; set; } = string.Empty;
}
