namespace LangTeach.Api.Services;

public enum AssistantFeedbackResult
{
    Saved,
    VoiceNoteNotFound,
}

public enum CorrectionFeedbackResult
{
    Saved,
    CorrectionNotFound,
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

    Task<CorrectionFeedbackResult> SubmitForCorrectionAsync(
        Guid teacherId,
        Guid studentId,
        Guid correctionId,
        string rating,
        string? reason,
        CancellationToken ct);
}
