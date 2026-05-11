using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using Microsoft.Data.SqlClient;
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
        catch (DbUpdateException ex) when (existing is null && IsSqlServerUniqueViolation(ex))
        {
            // Concurrent request (e.g. mobile double-tap) inserted first; unique constraint honoured.
        }

        return AssistantFeedbackResult.Saved;
    }

    public async Task<CorrectionFeedbackResult> SubmitForCorrectionAsync(
        Guid teacherId,
        Guid studentId,
        Guid correctionId,
        string rating,
        string? reason,
        CancellationToken ct)
    {
        var correctionExists = await _db.Corrections
            .AnyAsync(c => c.Id == correctionId && c.TeacherId == teacherId && c.StudentId == studentId, ct);
        if (!correctionExists)
            return CorrectionFeedbackResult.CorrectionNotFound;

        var now = DateTime.UtcNow;

        var existing = await _db.AssistantTurnFeedbacks
            .FirstOrDefaultAsync(f => f.CorrectionId == correctionId && f.TeacherId == teacherId, ct);

        if (existing is not null)
        {
            existing.Rating = rating;
            existing.Reason = reason;
            existing.UpdatedAt = now;
        }
        else
        {
            _db.AssistantTurnFeedbacks.Add(new AssistantTurnFeedback
            {
                Id = Guid.NewGuid(),
                TeacherId = teacherId,
                CorrectionId = correctionId,
                Rating = rating,
                Reason = reason,
                ProposalsJson = "",
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (existing is null && IsSqlServerUniqueViolation(ex))
        {
            // Concurrent double-tap; unique constraint honoured.
        }

        return CorrectionFeedbackResult.Saved;
    }

    // SQL Server error codes: 2601 = unique index violation, 2627 = unique constraint violation.
    private static bool IsSqlServerUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is SqlException { Number: 2601 or 2627 };
}
