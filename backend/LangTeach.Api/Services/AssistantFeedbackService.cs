using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class AssistantFeedbackService : IAssistantFeedbackService
{
    private readonly AppDbContext _db;

    public AssistantFeedbackService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<AssistantFeedbackResult> SubmitAsync(
        Guid teacherId,
        Guid voiceNoteId,
        string rating,
        string? reason,
        Guid? studentId,
        Guid? sessionLogId,
        string proposalsJson,
        CancellationToken ct)
    {
        var voiceNoteExists = await _db.VoiceNotes
            .AnyAsync(v => v.Id == voiceNoteId && v.TeacherId == teacherId, ct);
        if (!voiceNoteExists)
            return AssistantFeedbackResult.VoiceNoteNotFound;

        var now = DateTime.UtcNow;

        var existing = await _db.AssistantTurnFeedbacks
            .FirstOrDefaultAsync(f => f.VoiceNoteId == voiceNoteId && f.TeacherId == teacherId, ct);

        if (existing is not null)
        {
            existing.Rating = rating;
            existing.Reason = reason;
            existing.ProposalsJson = proposalsJson;
            existing.StudentId = studentId;
            existing.SessionLogId = sessionLogId;
            existing.UpdatedAt = now;
        }
        else
        {
            _db.AssistantTurnFeedbacks.Add(new AssistantTurnFeedback
            {
                Id = Guid.NewGuid(),
                TeacherId = teacherId,
                VoiceNoteId = voiceNoteId,
                StudentId = studentId,
                SessionLogId = sessionLogId,
                Rating = rating,
                Reason = reason,
                ProposalsJson = proposalsJson,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException) when (existing is null)
        {
            // Concurrent request (e.g. mobile double-tap) inserted first; unique constraint honoured.
        }

        return AssistantFeedbackResult.Saved;
    }
}
