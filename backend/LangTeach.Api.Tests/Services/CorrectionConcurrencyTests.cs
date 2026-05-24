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

// Uses SQLite (not InMemory) because RowVersion concurrency tokens require a real SQL
// provider that enforces the WHERE RowVersion = @original_value filter.
// Schema is created via raw SQL to avoid SQL-Server-specific collation constraints.
public class CorrectionConcurrencyTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _dbOptions;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();

    public CorrectionConcurrencyTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        CreateSchema();
        SeedStudent();
    }

    public void Dispose() => _connection.Dispose();

    [Fact]
    public async Task CorregirAsync_ConcurrentSave_ReturnsCurrentDtoWithoutSpawningBackgroundTask()
    {
        // Arrange: correction in Entregada state
        var correctionId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        using (var seedDb = new AppDbContext(_dbOptions))
        {
            seedDb.Corrections.Add(new Correction
            {
                Id = correctionId,
                TeacherId = _teacherId,
                StudentId = _studentId,
                AssignmentTitle = "Concurrency test",
                StudentText = "El niño juega en el parque.",
                Status = CorrectionStatus.Entregada,
                SchemaVersion = 1,
                CreatedAt = now,
                UpdatedAt = now,
            });
            await seedDb.SaveChangesAsync();
        }

        // Use a service-level DbContext that loads the row first (EF Core tracks RowVersion V1).
        var serviceDb = new AppDbContext(_dbOptions);
        await serviceDb.Corrections.Include(c => c.Tags).FirstAsync(c => c.Id == correctionId);

        // Simulate a concurrent writer bumping the RowVersion before our service saves.
        // The service's context still holds the stale V1 bytes, so SaveChanges will find
        // 0 rows matching "WHERE Id = @id AND RowVersion = V1" and throw DbUpdateConcurrencyException.
        using (var cmd = _connection.CreateCommand())
        {
            cmd.CommandText = "UPDATE Corrections SET RowVersion = randomblob(8) WHERE Id = @id";
            cmd.Parameters.AddWithValue("@id", correctionId.ToString());
            cmd.ExecuteNonQuery();
        }

        // Empty scope factory: the background task must NOT be reached (concurrency exception
        // is caught before Task.Run fires). If the test regresses and the task does fire, it
        // will fail to resolve AppDbContext and log an error — the assertion below catches it.
        var stubClaude = new StubClaudeClient();
        stubClaude.Reset();
        var scopeFactory = new FakeServiceScopeFactory(new ServiceCollection().BuildServiceProvider());

        var sut = new RedaccionCorrectionService(
            serviceDb,
            scopeFactory,
            NullLogger<RedaccionCorrectionService>.Instance);

        // Act
        var dto = await sut.CorregirAsync(_teacherId, _studentId, correctionId);

        // Allow a short window for any accidentally-started background task to surface.
        await Task.Delay(50);

        // Assert: returned a valid DTO, and no background Claude call was fired.
        Assert.NotNull(dto);
        Assert.Equal(correctionId, dto.Id);
        Assert.Equal(0, stubClaude.CompleteCallCount);

        serviceDb.Dispose();
    }

    private void SeedStudent()
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = """
            INSERT INTO Students (
                Id, TeacherId, Name, LearningLanguage, CefrLevel,
                NativeLanguages, Interests, Goals, Difficulties, Weaknesses,
                Profession, ReasonForStudying, CountryOfOrigin, CountryOfResidence,
                SpokenLanguages, OfficialCefrLevel, TeacherFollowupStatus,
                CreatedAt, UpdatedAt, IsDeleted
            ) VALUES (
                @id, @tid, 'Test Student', 'Spanish', 'B1',
                '[]', '[]', '[]', '[]', '[]',
                NULL, NULL, NULL, NULL,
                '[]', NULL, 'none',
                @now, @now, 0
            );
            """;
        cmd.Parameters.AddWithValue("@id", _studentId.ToString());
        cmd.Parameters.AddWithValue("@tid", _teacherId.ToString());
        cmd.Parameters.AddWithValue("@now", DateTime.UtcNow.ToString("o"));
        cmd.ExecuteNonQuery();
    }

    private void CreateSchema()
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS Teachers (
                Id TEXT NOT NULL PRIMARY KEY,
                Auth0Id TEXT NOT NULL,
                Email TEXT NOT NULL,
                Name TEXT,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS Students (
                Id TEXT NOT NULL PRIMARY KEY,
                TeacherId TEXT NOT NULL,
                Name TEXT NOT NULL,
                LearningLanguage TEXT NOT NULL,
                CefrLevel TEXT NOT NULL,
                NativeLanguages TEXT NOT NULL,
                Interests TEXT NOT NULL,
                Goals TEXT NOT NULL,
                Difficulties TEXT NOT NULL,
                Weaknesses TEXT NOT NULL,
                Profession TEXT,
                ReasonForStudying TEXT,
                CountryOfOrigin TEXT,
                CountryOfResidence TEXT,
                SpokenLanguages TEXT NOT NULL,
                OfficialCefrLevel TEXT,
                TeacherFollowupStatus TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                IsDeleted INTEGER NOT NULL DEFAULT 0
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
                IsDeleted INTEGER NOT NULL DEFAULT 0,
                RowVersion BLOB NOT NULL DEFAULT (randomblob(8)),
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                CorrectedAt TEXT
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
