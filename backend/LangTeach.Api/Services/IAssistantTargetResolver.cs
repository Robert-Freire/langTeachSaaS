using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public record ResolvedTarget(bool IsConfident, ProposedTarget Target, string? ResolvedGroupName = null, string? ResolvedCefrLevel = null);

public interface IAssistantTargetResolver
{
    Task<ResolvedTarget> ResolveAsync(string rawMention, Guid teacherId, CancellationToken ct = default);
    Task<ResolvedTarget?> ResolveByIdAsync(Guid groupId, Guid teacherId, CancellationToken ct = default);
}
