using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Services;

public class CorrectionWorker : BackgroundService
{
    private static readonly TimeSpan PollInterval =
        TimeSpan.FromSeconds(RedaccionCorrectionTimeouts.WorkerPollIntervalSeconds);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptions<CorrectionWorkerOptions> _options;
    private readonly ILogger<CorrectionWorker> _logger;

    public CorrectionWorker(
        IServiceScopeFactory scopeFactory,
        IOptions<CorrectionWorkerOptions> options,
        ILogger<CorrectionWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessBatchAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "CorrectionWorker: unhandled error during tick");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    internal async Task ProcessBatchOnceForTestAsync(CancellationToken ct)
    {
        try { await ProcessBatchAsync(ct); }
        catch (OperationCanceledException) { }
    }

    private async Task ProcessBatchAsync(CancellationToken stoppingToken)
    {
        var concurrency = _options.Value.WorkerConcurrency;

        using var queryScope = _scopeFactory.CreateScope();
        var db = queryScope.ServiceProvider.GetRequiredService<AppDbContext>();

        var candidates = await db.Corrections
            .Where(c => !c.IsDeleted && c.Status == CorrectionStatus.Encolada)
            .OrderBy(c => c.UpdatedAt)
            .Take(concurrency)
            .Select(c => new { c.Id, c.StudentId, c.TeacherId, c.RowVersion })
            .ToListAsync(stoppingToken);

        if (candidates.Count == 0)
            return;

        foreach (var candidate in candidates)
        {
            if (stoppingToken.IsCancellationRequested)
                break;

            await ClaimAndRunAsync(candidate.Id, candidate.StudentId, candidate.TeacherId, candidate.RowVersion, stoppingToken);
        }
    }

    private async Task ClaimAndRunAsync(
        Guid correctionId, Guid studentId, Guid teacherId, byte[] knownRowVersion,
        CancellationToken stoppingToken)
    {
        // Atomically claim the row by updating Status from Encolada to Corrigiendo.
        // RowVersion concurrency token ensures only one worker wins if multiple replicas race.
        using var claimScope = _scopeFactory.CreateScope();
        var claimDb = claimScope.ServiceProvider.GetRequiredService<AppDbContext>();

        var row = await claimDb.Corrections
            .FirstOrDefaultAsync(c => c.Id == correctionId && !c.IsDeleted && c.Status == CorrectionStatus.Encolada, stoppingToken);

        if (row is null)
            return;

        row.Status = CorrectionStatus.Corrigiendo;
        row.UpdatedAt = DateTime.UtcNow;

        // Set the concurrency token to the value we observed so EF generates
        // a WHERE clause that includes RowVersion = @knownRowVersion.
        claimDb.Entry(row).Property(r => r.RowVersion).OriginalValue = knownRowVersion;

        try
        {
            await claimDb.SaveChangesAsync(stoppingToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Another worker instance claimed this row; skip.
            _logger.LogDebug("CorrectionWorker: concurrency conflict claiming {CorrectionId}; skipping", correctionId);
            return;
        }

        _logger.LogInformation(
            "CorrectionWorker: claimed correction {CorrectionId} (TeacherId={TeacherId} StudentId={StudentId})",
            correctionId, teacherId, studentId);

        using var runScope = _scopeFactory.CreateScope();
        var sp = runScope.ServiceProvider;
        var runDb = sp.GetRequiredService<AppDbContext>();
        var claude = sp.GetRequiredService<IClaudeClient>();
        var correctionPromptService = sp.GetRequiredService<ICorrectionPromptService>();
        var runLogger = sp.GetRequiredService<ILogger<RedaccionCorrectionService>>();

        try
        {
            await RedaccionCorrectionService.RunCorrectionInScopeAsync(
                correctionId, studentId, teacherId,
                runDb, claude, correctionPromptService, runLogger,
                stoppingToken);
        }
        catch (ClaudeRateLimitException rle)
        {
            _logger.LogWarning(
                "CorrectionWorker: rate limit hit; reverting to Entregada. CorrectionId={CorrectionId} RetryAfter={RetryAfter}",
                correctionId, rle.RetryAfter);
            await RevertToEntregadaAsync(correctionId, stoppingToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex,
                "CorrectionWorker: correction failed; setting CorreccionFallida. CorrectionId={CorrectionId}",
                correctionId);
            await SetFallidaAsync(correctionId, stoppingToken);
        }
    }

    private async Task RevertToEntregadaAsync(Guid correctionId, CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var now = DateTime.UtcNow;
            await db.Corrections
                .Where(c => c.Id == correctionId && !c.IsDeleted && c.Status == CorrectionStatus.Corrigiendo)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(c => c.Status, CorrectionStatus.Entregada)
                    .SetProperty(c => c.UpdatedAt, now), ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "CorrectionWorker: failed to revert to Entregada. CorrectionId={CorrectionId}", correctionId);
        }
    }

    private async Task SetFallidaAsync(Guid correctionId, CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var now = DateTime.UtcNow;
            await db.Corrections
                .Where(c => c.Id == correctionId && !c.IsDeleted && c.Status == CorrectionStatus.Corrigiendo)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(c => c.Status, CorrectionStatus.CorreccionFallida)
                    .SetProperty(c => c.UpdatedAt, now), ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "CorrectionWorker: failed to persist CorreccionFallida. CorrectionId={CorrectionId}", correctionId);
        }
    }
}
