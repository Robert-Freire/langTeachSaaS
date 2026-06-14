using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;

namespace LangTeach.Api.Tests.Helpers;

// Hand-rolled IUsageLimitService double. Defaults to "unlimited" (CanGenerate => true) so it is a
// drop-in for existing correction tests whose behaviour predates the quota gate (#1223). Set
// CanGenerate = false to exercise the over-quota path, and inspect RecordedBlockTypes to assert
// recording happened exactly once (or not at all).
public class StubUsageLimitService : IUsageLimitService
{
    public bool CanGenerate { get; set; } = true;
    public UsageStatusDto Status { get; set; } =
        new(0, 100, SubscriptionTier.Free.ToString(), DateTime.UtcNow.AddDays(7));

    public List<ContentBlockType> RecordedBlockTypes { get; } = new();
    public int RecordCount => RecordedBlockTypes.Count;

    public Task<UsageStatusDto> GetUsageStatusAsync(Guid teacherId, CancellationToken ct = default)
        => Task.FromResult(Status);

    public Task RecordGenerationAsync(Guid teacherId, ContentBlockType blockType, CancellationToken ct = default)
    {
        RecordedBlockTypes.Add(blockType);
        return Task.CompletedTask;
    }

    public Task<bool> CanGenerateAsync(Guid teacherId, CancellationToken ct = default)
        => Task.FromResult(CanGenerate);
}
