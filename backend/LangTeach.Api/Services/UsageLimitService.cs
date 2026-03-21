using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Services;

public class UsageLimitService : IUsageLimitService
{
    private readonly AppDbContext _db;
    private readonly GenerationLimitsOptions _limits;
    private readonly ILogger<UsageLimitService> _logger;

    public UsageLimitService(AppDbContext db, IOptions<GenerationLimitsOptions> limits, ILogger<UsageLimitService> logger)
    {
        _db = db;
        _limits = limits.Value;
        _logger = logger;
    }

    public async Task<UsageStatusDto> GetUsageStatusAsync(Guid teacherId, CancellationToken ct = default)
    {
        var teacher = await _db.Teachers.FindAsync(new object[] { teacherId }, ct);
        var tier = teacher?.SubscriptionTier ?? SubscriptionTier.Free;

        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var usedThisMonth = await _db.GenerationUsages
            .CountAsync(g => g.TeacherId == teacherId && g.CreatedAt >= monthStart, ct);

        var limit = tier == SubscriptionTier.Pro ? _limits.ProTierMonthlyLimit : _limits.FreeTierMonthlyLimit;
        var resetsAt = monthStart.AddMonths(1);

        return new UsageStatusDto(usedThisMonth, limit, tier.ToString(), resetsAt);
    }

    public async Task RecordGenerationAsync(Guid teacherId, ContentBlockType blockType, CancellationToken ct = default)
    {
        _db.GenerationUsages.Add(new GenerationUsage
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            BlockType = blockType,
            CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Usage recorded. TeacherId={TeacherId} BlockType={BlockType}", teacherId, blockType);
    }

    public async Task<bool> CanGenerateAsync(Guid teacherId, CancellationToken ct = default)
    {
        var teacher = await _db.Teachers.FindAsync(new object[] { teacherId }, ct);
        var tier = teacher?.SubscriptionTier ?? SubscriptionTier.Free;

        var limit = tier == SubscriptionTier.Pro ? _limits.ProTierMonthlyLimit : _limits.FreeTierMonthlyLimit;
        if (limit < 0) return true; // unlimited

        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var usedThisMonth = await _db.GenerationUsages
            .CountAsync(g => g.TeacherId == teacherId && g.CreatedAt >= monthStart, ct);

        if (usedThisMonth >= limit)
        {
            _logger.LogWarning(
                "Generation quota exceeded. TeacherId={TeacherId} Used={Used} Limit={Limit} Tier={Tier}",
                teacherId, usedThisMonth, limit, tier);
            return false;
        }

        return true;
    }
}
