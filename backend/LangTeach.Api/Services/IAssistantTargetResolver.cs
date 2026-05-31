using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public record ResolvedTarget(bool IsConfident, ProposedTarget Target);

public interface IAssistantTargetResolver
{
    Task<ResolvedTarget> ResolveAsync(string rawMention, Guid teacherId, CancellationToken ct = default);
}
