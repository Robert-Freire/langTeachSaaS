using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Helpers;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

// Uses SQLite (not InMemory) because ExecuteUpdateAsync requires a real SQL provider.
// The schema is created via raw SQL to avoid SQL-Server-specific collation constraints
// that EnsureCreated() would emit from the EF model.
public class CorrectionStaleRecoveryServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _dbOptions;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();

    public CorrectionStaleRecoveryServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        CreateSchema();
    }

    public void Dispose() => _connection.Dispose();

    [Fact]
    public async Task StaleCorrigiendo_RevertedToEntregada()
    {
        var staleAt = DateTime.UtcNow.AddSeconds(-(RedaccionCorrectionTimeouts.StaleCorrigiendoSeconds + 60));
        await SeedAsync(MakeCorrection(CorrectionStatus.Corrigiendo, staleAt));

        await RunOneTickAsync();

        using var checkDb = new AppDbContext(_dbOptions);
        var row = await checkDb.Corrections.FirstAsync();
        Assert.Equal(CorrectionStatus.Entregada, row.Status);
    }

    [Fact]
    public async Task FreshCorrigiendo_NotTouched()
    {
        var freshAt = DateTime.UtcNow.AddSeconds(-10);
        await SeedAsync(MakeCorrection(CorrectionStatus.Corrigiendo, freshAt));

        await RunOneTickAsync();

        using var checkDb = new AppDbContext(_dbOptions);
        var row = await checkDb.Corrections.FirstAsync();
        Assert.Equal(CorrectionStatus.Corrigiendo, row.Status);
    }

    [Fact]
    public async Task NonCorrigiendoRow_NotTouched()
    {
        var staleAt = DateTime.UtcNow.AddSeconds(-(RedaccionCorrectionTimeouts.StaleCorrigiendoSeconds + 60));
        await SeedAsync(MakeCorrection(CorrectionStatus.CorreccionFallida, staleAt));

        await RunOneTickAsync();

        using var checkDb = new AppDbContext(_dbOptions);
        var row = await checkDb.Corrections.FirstAsync();
        Assert.Equal(CorrectionStatus.CorreccionFallida, row.Status);
    }

    [Fact]
    public async Task StaleEncolada_RevertedToEntregada()
    {
        var staleAt = DateTime.UtcNow.AddSeconds(-(RedaccionCorrectionTimeouts.StaleEncoladaSeconds + 10));
        await SeedAsync(MakeCorrection(CorrectionStatus.Encolada, staleAt));

        await RunOneTickAsync();

        using var checkDb = new AppDbContext(_dbOptions);
        var row = await checkDb.Corrections.FirstAsync();
        Assert.Equal(CorrectionStatus.Entregada, row.Status);
    }

    [Fact]
    public async Task FreshEncolada_NotTouched()
    {
        var freshAt = DateTime.UtcNow.AddSeconds(-5);
        await SeedAsync(MakeCorrection(CorrectionStatus.Encolada, freshAt));

        await RunOneTickAsync();

        using var checkDb = new AppDbContext(_dbOptions);
        var row = await checkDb.Corrections.FirstAsync();
        Assert.Equal(CorrectionStatus.Encolada, row.Status);
    }

    private async Task SeedAsync(Correction correction)
    {
        using var db = new AppDbContext(_dbOptions);
        db.Corrections.Add(correction);
        await db.SaveChangesAsync();
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

    private void CreateSchema()
    {
        // Raw SQL avoids SQL-Server-specific collation in the EF-generated DDL.
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS Corrections (
                Id TEXT NOT NULL PRIMARY KEY,
                TeacherId TEXT NOT NULL,
                StudentId TEXT NOT NULL,
                LessonId TEXT,
                SessionLogId TEXT,
                AssignmentTitle TEXT NOT NULL,
                AssignmentPrompt TEXT,
                StudentText TEXT,
                SourceImageUrl TEXT,
                MarkedUpOutput TEXT,
                Status TEXT NOT NULL,
                SchemaVersion INTEGER NOT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                CorrectedAt TEXT,
                IsDeleted INTEGER NOT NULL DEFAULT 0,
                RowVersion BLOB NOT NULL DEFAULT (randomblob(8))
            );
            CREATE TABLE IF NOT EXISTS CorrectionTags (
                Id TEXT NOT NULL PRIMARY KEY,
                CorrectionId TEXT NOT NULL,
                Category TEXT NOT NULL,
                StartIndex INTEGER NOT NULL,
                EndIndex INTEGER NOT NULL,
                SpannedText TEXT NOT NULL,
                Explanation TEXT,
                CorrectedForm TEXT,
                OrderIndex INTEGER NOT NULL,
                FilterStatus TEXT NOT NULL DEFAULT 'kept'
            );
            """;
        cmd.ExecuteNonQuery();
    }
}
