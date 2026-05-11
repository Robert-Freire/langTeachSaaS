using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace LangTeach.Api.Services;

public class CorrectionStaleRecoveryService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(60);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CorrectionStaleRecoveryService> _logger;

    public CorrectionStaleRecoveryService(
        IServiceScopeFactory scopeFactory,
        ILogger<CorrectionStaleRecoveryService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RecoverStaleCorrectionsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "CorrectionStaleRecoveryService: unhandled exception during tick");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }

    internal async Task RecoverOnceForTestAsync(CancellationToken ct) =>
        await RecoverStaleCorrectionsAsync(ct);

    private async Task RecoverStaleCorrectionsAsync(CancellationToken ct)
    {
        var staleThreshold = DateTime.UtcNow.AddSeconds(-RedaccionCorrectionTimeouts.StaleCorrigiendoSeconds);

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var stale = await db.Corrections
            .Where(c => c.DeletedAt == null
                     && c.Status == CorrectionStatus.Corrigiendo
                     && c.UpdatedAt < staleThreshold)
            .ToListAsync(ct);

        if (stale.Count == 0) return;

        var now = DateTime.UtcNow;
        foreach (var s in stale)
        {
            s.Status = CorrectionStatus.Entregada;
            s.UpdatedAt = now;
        }

        await db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "CorrectionStaleRecoveryService: reverted {Count} stale Corrigiendo corrections to Entregada",
            stale.Count);
    }
}
