namespace LangTeach.Api.Data.Models;

public enum ApplicationType
{
    Create,
    Update
}

public class VoiceNoteApplication
{
    public Guid Id { get; set; }
    public Guid SessionLogId { get; set; }
    public Guid? VoiceNoteId { get; set; }
    public string? Transcription { get; set; }
    public string? RawExtractionJson { get; set; }
    public ApplicationType ApplicationType { get; set; }
    public DateTime AppliedAt { get; set; }

    public SessionLog SessionLog { get; set; } = null!;
    public VoiceNote? VoiceNote { get; set; }
}
