using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class CorrectionStaleRecoveryServiceTests
{
    private readonly DbContextOptions<AppDbContext> _dbOptions;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();

    public CorrectionStaleRecoveryServiceTests()
    {
        _dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
    }

    [Fact]
    public async Task StaleCorrigiendo_RevertedToEntregada()
    {
        var staleAt = DateTime.UtcNow.AddSeconds(-(RedaccionCorrectionTimeouts.StaleCorrigiendoSeconds + 60));
        using var seedDb = new AppDbContext(_dbOptions);
        seedDb.Corrections.Add(MakeCorrection(CorrectionStatus.Corrigiendo, staleAt));
        await seedDb.SaveChangesAsync();

        await RunOneTickAsync();

        using var checkDb = new AppDbContext(_dbOptions);
        var row = await checkDb.Corrections.FirstAsync();
        Assert.Equal(CorrectionStatus.Entregada, row.Status);
    }

    [Fact]
    public async Task FreshCorrigiendo_NotTouched()
    {
        var freshAt = DateTime.UtcNow.AddSeconds(-10);
        using var seedDb = new AppDbContext(_dbOptions);
        seedDb.Corrections.Add(MakeCorrection(CorrectionStatus.Corrigiendo, freshAt));
        await seedDb.SaveChangesAsync();

        await RunOneTickAsync();

        using var checkDb = new AppDbContext(_dbOptions);
        var row = await checkDb.Corrections.FirstAsync();
        Assert.Equal(CorrectionStatus.Corrigiendo, row.Status);
    }

    [Fact]
    public async Task NonCorrigiendoRow_NotTouched()
    {
        var staleAt = DateTime.UtcNow.AddSeconds(-(RedaccionCorrectionTimeouts.StaleCorrigiendoSeconds + 60));
        using var seedDb = new AppDbContext(_dbOptions);
        seedDb.Corrections.Add(MakeCorrection(CorrectionStatus.CorreccionFallida, staleAt));
        await seedDb.SaveChangesAsync();

        await RunOneTickAsync();

        using var checkDb = new AppDbContext(_dbOptions);
        var row = await checkDb.Corrections.FirstAsync();
        Assert.Equal(CorrectionStatus.CorreccionFallida, row.Status);
    }

    private async Task RunOneTickAsync()
    {
        var scopeServices = new ServiceCollection();
        scopeServices.AddTransient<AppDbContext>(_ => new AppDbContext(_dbOptions));
        var scopeFactory = new FakeServiceScopeFactory(scopeServices.BuildServiceProvider());

        var sut = new CorrectionStaleRecoveryService(
            scopeFactory,
            NullLogger<CorrectionStaleRecoveryService>.Instance);

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        await sut.RecoverOnceForTestAsync(cts.Token);
    }

    private Correction MakeCorrection(string status, DateTime updatedAt) => new()
    {
        Id = Guid.NewGuid(),
        TeacherId = _teacherId,
        StudentId = _studentId,
        AssignmentTitle = "Test",
        SchemaVersion = 1,
        Status = status,
        CreatedAt = updatedAt,
        UpdatedAt = updatedAt,
    };
}
