using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Helpers;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Tests.Services;

// Uses SQLite (not InMemory) because ExecuteUpdateAsync in the worker requires a real SQL provider.
public class CorrectionWorkerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _dbOptions;
    private readonly StubClaudeClient _claude = new();
    private readonly ICorrectionPromptService _correctionPromptService;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();

    public CorrectionWorkerTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        CreateSchema();

        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var promptBuilder = new RedaccionCorrectionPromptBuilder(pedagogy,
            NullLogger<RedaccionCorrectionPromptBuilder>.Instance);
        var filterPromptBuilder = new RedaccionLevelFilterPromptBuilder(pedagogy,
            NullLogger<RedaccionLevelFilterPromptBuilder>.Instance);
        var scopeAffirmerBuilder = new RedaccionScopeAffirmerPromptBuilder(pedagogy,
            NullLogger<RedaccionScopeAffirmerPromptBuilder>.Instance);
        _correctionPromptService = new CorrectionPromptService(promptBuilder, filterPromptBuilder, scopeAffirmerBuilder);

        SeedTeacherAndStudent();
    }

    public void Dispose() => _connection.Dispose();

    [Fact]
    public async Task Worker_ClaimsEncolada_TransitionsToCorrigiendo_ThenCorregida()
    {
        var text = "Hoy ablar.";
        var correctionId = SeedCorrection(text, CorrectionStatus.Encolada);
        _claude.SetDefaultResponse("""{"schemaVersion":1,"tags":[]}""");

        await RunOneTickAsync();

        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.First(c => c.Id == correctionId);
        Assert.Equal(CorrectionStatus.Corregida, row.Status);
    }

    [Fact]
    public async Task Worker_EncoladaRow_ClaudeRateLimit_RevertsToEntregada()
    {
        var correctionId = SeedCorrection("Texto.", CorrectionStatus.Encolada);
        var rateEx = new ClaudeRateLimitException(retryAfter: null);
        _claude.DuringCompleteAsync = () => Task.FromException(rateEx);

        await RunOneTickAsync();

        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.First(c => c.Id == correctionId);
        Assert.Equal(CorrectionStatus.Entregada, row.Status);
    }

    [Fact]
    public async Task Worker_EncoladaRow_GenericException_SetsCorreccionFallida()
    {
        var correctionId = SeedCorrection("Texto.", CorrectionStatus.Encolada);
        _claude.DuringCompleteAsync = () => Task.FromException(new InvalidOperationException("Claude exploded"));

        await RunOneTickAsync();

        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.First(c => c.Id == correctionId);
        Assert.Equal(CorrectionStatus.CorreccionFallida, row.Status);
    }

    [Fact]
    public async Task Worker_NoEncoladaRows_DoesNothing()
    {
        SeedCorrection("Texto.", CorrectionStatus.Entregada);

        await RunOneTickAsync();

        _claude.CompleteCallCount.Should().Be(0, "no Encolada rows to process");
    }

    [Fact]
    public async Task Worker_IgnoresDeletedRows()
    {
        var correctionId = SeedCorrection("Texto.", CorrectionStatus.Encolada, isDeleted: true);

        await RunOneTickAsync();

        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.First(c => c.Id == correctionId);
        Assert.Equal(CorrectionStatus.Encolada, row.Status); // unchanged
        _claude.CompleteCallCount.Should().Be(0);
    }

    [Fact]
    public async Task Worker_CancellationBeforeClaiming_StopsGracefully()
    {
        SeedCorrection("Texto.", CorrectionStatus.Encolada);

        using var cts = new CancellationTokenSource();
        cts.Cancel();

        // Should not throw even if already cancelled before we start
        var worker = BuildWorker();
        await worker.ProcessBatchOnceForTestAsync(cts.Token);

        _claude.CompleteCallCount.Should().Be(0);
    }

    private async Task RunOneTickAsync()
    {
        var worker = BuildWorker();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await worker.ProcessBatchOnceForTestAsync(cts.Token);
    }

    private CorrectionWorker BuildWorker()
    {
        var scopeServices = new ServiceCollection();
        scopeServices.AddTransient<AppDbContext>(_ => new AppDbContext(_dbOptions));
        scopeServices.AddSingleton<IClaudeClient>(_claude);
        scopeServices.AddSingleton(_correctionPromptService);
        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        scopeServices.AddSingleton<IPedagogyConfigService>(new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps));
        scopeServices.AddLogging();
        var provider = scopeServices.BuildServiceProvider();
        var scopeFactory = new FakeServiceScopeFactory(provider);

        var options = Options.Create(new CorrectionWorkerOptions());

        return new CorrectionWorker(
            scopeFactory,
            options,
            NullLogger<CorrectionWorker>.Instance);
    }

    private Guid SeedCorrection(string text, string status, bool isDeleted = false)
    {
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;
        using var db = new AppDbContext(_dbOptions);
        db.Corrections.Add(new Correction
        {
            Id = id,
            TeacherId = _teacherId,
            StudentId = _studentId,
            AssignmentTitle = "Test",
            Status = status,
            SchemaVersion = 1,
            StudentText = text,
            CreatedAt = now,
            UpdatedAt = now,
            IsDeleted = isDeleted,
            RowVersion = new byte[8],
        });
        db.SaveChanges();
        return id;
    }

    private void SeedTeacherAndStudent()
    {
        var now = DateTime.UtcNow;
        using var db = new AppDbContext(_dbOptions);
        db.Teachers.Add(new LangTeach.Api.Data.Models.Teacher
        {
            Id = _teacherId,
            Auth0UserId = "auth0|worker-test",
            Email = "worker@test.com",
            DisplayName = "Worker Test",
            IsApproved = true,
            CreatedAt = now,
            UpdatedAt = now,
        });
        db.Students.Add(new LangTeach.Api.Data.Models.Student
        {
            Id = _studentId,
            TeacherId = _teacherId,
            Name = "Ana",
            LearningLanguage = "Spanish",
            CefrLevel = "A1",
            NativeLanguages = "[\"English\"]",
            CreatedAt = now,
            UpdatedAt = now,
        });
        db.SaveChanges();
    }

    private void CreateSchema()
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS Teachers (
                Id TEXT NOT NULL PRIMARY KEY,
                Auth0UserId TEXT NOT NULL,
                Email TEXT NOT NULL,
                DisplayName TEXT NOT NULL,
                IsApproved INTEGER NOT NULL DEFAULT 0,
                HasCompletedOnboarding INTEGER NOT NULL DEFAULT 0,
                SubscriptionTier INTEGER NOT NULL DEFAULT 0,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS Students (
                Id TEXT NOT NULL PRIMARY KEY,
                TeacherId TEXT NOT NULL,
                Name TEXT NOT NULL,
                LearningLanguage TEXT NOT NULL,
                CefrLevel TEXT NOT NULL,
                Interests TEXT NOT NULL DEFAULT '[]',
                NativeLanguages TEXT NOT NULL DEFAULT '[]',
                LearningGoals TEXT NOT NULL DEFAULT '[]',
                Weaknesses TEXT NOT NULL DEFAULT '[]',
                Difficulties TEXT NOT NULL DEFAULT '[]',
                PersonalNotes TEXT,
                TeachingNotes TEXT,
                SkillLevelOverrides TEXT NOT NULL DEFAULT '{}',
                BirthYear INTEGER,
                Profession TEXT,
                CountryOfOrigin TEXT,
                CityOfOrigin TEXT,
                CountryOfResidence TEXT,
                CityOfResidence TEXT,
                ReasonForStudying TEXT,
                OfficialCefrLevel TEXT,
                ShortTermObjectives TEXT NOT NULL DEFAULT '[]',
                IsActive INTEGER NOT NULL DEFAULT 1,
                IsCorporate INTEGER NOT NULL DEFAULT 0,
                Rate TEXT,
                TeachingChannel INTEGER,
                SpokenLanguages TEXT NOT NULL DEFAULT '[]',
                IsDeleted INTEGER NOT NULL DEFAULT 0,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL
            );
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
                FilterStatus TEXT NOT NULL DEFAULT 'kept',
                CHECK (FilterStatus IN ('kept', 'removed'))
            );
            """;
        cmd.ExecuteNonQuery();
    }
}
