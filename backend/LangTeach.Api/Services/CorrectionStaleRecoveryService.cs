using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace LangTeach.Api.Services;

public class CorrectionStaleRecoveryService : BackgroundService
{
    // 60-second sweep cadence. Assumes single API instance -- multiple replicas will
    // redundantly sweep the same rows but each update is idempotent (status + timestamp).
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

        // Intentionally cross-tenant: the background service sweeps all teachers' corrections
        // globally. This differs from the per-teacher queries in CorrectionService by design --
        // stale recovery must not depend on a specific teacher initiating a list request.
        //
        // ExecuteUpdateAsync generates a single UPDATE ... WHERE Status='Corrigiendo' AND ...
        // so a correction that completes normally (Corrigiendo -> Corregida) between the
        // WHERE evaluation and the UPDATE is not overwritten.
        var now = DateTime.UtcNow;
        var count = await db.Corrections
            .Where(c => c.DeletedAt == null
                     && c.Status == CorrectionStatus.Corrigiendo
                     && c.UpdatedAt < staleThreshold)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(c => c.Status, CorrectionStatus.Entregada)
                .SetProperty(c => c.UpdatedAt, now), ct);

        if (count == 0) return;

        _logger.LogInformation(
            "CorrectionStaleRecoveryService: reverted {Count} stale Corrigiendo corrections to Entregada",
            count);
    }
}
