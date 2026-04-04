using LangTeach.Api.AI;

namespace LangTeach.Api.Services;

public interface ISessionHistoryService
{
    /// <summary>
    /// Builds a <see cref="SessionHistoryContext"/> from the student's recent session logs.
    /// Returns null when the student has no session logs, leaving generation unaffected.
    /// </summary>
    Task<SessionHistoryContext?> BuildContextAsync(
        Guid teacherId,
        Guid studentId,
        DateTime generationDate,
        CancellationToken ct = default);
}
