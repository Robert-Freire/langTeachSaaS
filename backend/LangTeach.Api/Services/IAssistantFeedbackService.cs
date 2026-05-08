namespace LangTeach.Api.Services;

public enum AssistantFeedbackResult
{
    Saved,
    VoiceNoteNotFound,
}

public interface IAssistantFeedbackService
{
    Task<AssistantFeedbackResult> SubmitAsync(
        Guid teacherId,
        Guid voiceNoteId,
        string rating,
        string? reason,
        Guid? studentId,
        Guid? sessionLogId,
        string proposalsJson,
        CancellationToken ct);
}
