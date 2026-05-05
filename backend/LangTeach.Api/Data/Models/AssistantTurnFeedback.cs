namespace LangTeach.Api.Data.Models;

public class AssistantTurnFeedback
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public Guid? VoiceNoteId { get; set; }
    public Guid? StudentId { get; set; }
    public Guid? SessionLogId { get; set; }
    public string Rating { get; set; } = "";
    public string? Reason { get; set; }
    public string ProposalsJson { get; set; } = "";
    public DateTime CreatedAt { get; set; }

    public Teacher Teacher { get; set; } = null!;
    public VoiceNote? VoiceNote { get; set; }
}
