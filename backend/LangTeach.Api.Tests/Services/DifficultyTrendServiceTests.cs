using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;
using LangTeach.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class DifficultyTrendServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly DifficultyTrendService _sut;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();

    public DifficultyTrendServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _sut = new DifficultyTrendService(_db, NullLogger<DifficultyTrendService>.Instance);

        _db.Teachers.Add(new Teacher
        {
            Id = _teacherId,
            Auth0UserId = "auth0|trend-test",
            Email = "trend@test.com",
            DisplayName = "Test Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Students.Add(MakeStudent(_studentId, _teacherId));
        _db.SaveChanges();
    }

    [Fact]
    public async Task RecomputeAsync_NoSessions_AllStable()
    {
        SetDifficulties([
            MakeDiff("d1", "Grammar", "ser/estar", "Active"),
        ]);

        await _sut.RecomputeAsync(_teacherId, _studentId);

        var difficulties = GetDifficulties();
        difficulties.Single().Trend.Should().Be("stable");
    }

    [Fact]
    public async Task RecomputeAsync_ThreeConsecutiveSessionsMentioning_Worsening()
    {
        SetDifficulties([MakeDiff("d1", "Grammar", "ser/estar", "Active")]);
        AddSession(DateTime.UtcNow.AddDays(-3), [("Grammar", "ser/estar")]);
        AddSession(DateTime.UtcNow.AddDays(-2), [("Grammar", "ser/estar")]);
        AddSession(DateTime.UtcNow.AddDays(-1), [("Grammar", "ser/estar")]);

        await _sut.RecomputeAsync(_teacherId, _studentId);

        GetDifficulties().Single().Trend.Should().Be("worsening");
    }

    [Fact]
    public async Task RecomputeAsync_OnlyTwoConsecutiveSessions_Stable()
    {
        SetDifficulties([MakeDiff("d1", "Grammar", "ser/estar", "Active")]);
        AddSession(DateTime.UtcNow.AddDays(-2), [("Grammar", "ser/estar")]);
        AddSession(DateTime.UtcNow.AddDays(-1), [("Grammar", "ser/estar")]);

        await _sut.RecomputeAsync(_teacherId, _studentId);

        GetDifficulties().Single().Trend.Should().Be("stable");
    }

    [Fact]
    public async Task RecomputeAsync_GapBreaksConsecutiveRun_Stable()
    {
        SetDifficulties([MakeDiff("d1", "Grammar", "ser/estar", "Active")]);
        AddSession(DateTime.UtcNow.AddDays(-4), [("Grammar", "ser/estar")]);
        AddSession(DateTime.UtcNow.AddDays(-3), [("Grammar", "ser/estar")]);
        AddSession(DateTime.UtcNow.AddDays(-2), []); // gap — pair NOT mentioned
        AddSession(DateTime.UtcNow.AddDays(-1), [("Grammar", "ser/estar")]);

        await _sut.RecomputeAsync(_teacherId, _studentId);

        GetDifficulties().Single().Trend.Should().Be("stable");
    }

    [Fact]
    public async Task RecomputeAsync_CoveredNotMentionedInLastTwo_Improving()
    {
        SetDifficulties([MakeDiff("d1", "Vocabulary", "false friends", "Covered")]);
        AddSession(DateTime.UtcNow.AddDays(-3), [("Vocabulary", "false friends")]);
        AddSession(DateTime.UtcNow.AddDays(-2), []); // not mentioned
        AddSession(DateTime.UtcNow.AddDays(-1), []); // not mentioned

        await _sut.RecomputeAsync(_teacherId, _studentId);

        GetDifficulties().Single().Trend.Should().Be("improving");
    }

    [Fact]
    public async Task RecomputeAsync_CoveredMentionedInLastSession_Stable()
    {
        SetDifficulties([MakeDiff("d1", "Vocabulary", "false friends", "Covered")]);
        AddSession(DateTime.UtcNow.AddDays(-2), []);
        AddSession(DateTime.UtcNow.AddDays(-1), [("Vocabulary", "false friends")]);

        await _sut.RecomputeAsync(_teacherId, _studentId);

        GetDifficulties().Single().Trend.Should().Be("stable");
    }

    [Fact]
    public async Task RecomputeAsync_CancelledSessionsIgnored_WhenCountingConsecutive()
    {
        SetDifficulties([MakeDiff("d1", "Grammar", "ser/estar", "Active")]);
        AddSession(DateTime.UtcNow.AddDays(-3), [("Grammar", "ser/estar")]);
        AddSession(DateTime.UtcNow.AddDays(-2), [("Grammar", "ser/estar")], isCancelled: true); // cancelled → skipped
        AddSession(DateTime.UtcNow.AddDays(-1), [("Grammar", "ser/estar")]);

        await _sut.RecomputeAsync(_teacherId, _studentId);

        // Only 2 non-cancelled sessions both mention the pair — still stable
        GetDifficulties().Single().Trend.Should().Be("stable");
    }

    [Fact]
    public async Task RecomputeAsync_StudentNotFound_DoesNotThrow()
    {
        var act = () => _sut.RecomputeAsync(_teacherId, Guid.NewGuid());
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task RecomputeAsync_MatchingIsCaseInsensitive()
    {
        SetDifficulties([MakeDiff("d1", "grammar", "SER/ESTAR", "Active")]);
        AddSession(DateTime.UtcNow.AddDays(-3), [("GRAMMAR", "ser/estar")]);
        AddSession(DateTime.UtcNow.AddDays(-2), [("Grammar", "SER/ESTAR")]);
        AddSession(DateTime.UtcNow.AddDays(-1), [("grammar", "ser/estar")]);

        await _sut.RecomputeAsync(_teacherId, _studentId);

        GetDifficulties().Single().Trend.Should().Be("worsening");
    }

    // Helpers

    private void SetDifficulties(List<DifficultyDto> diffs)
    {
        var student = _db.Students.Find(_studentId)!;
        student.Difficulties = JsonStorageHelper.Serialize(diffs);
        _db.SaveChanges();
    }

    private List<DifficultyDto> GetDifficulties()
    {
        _db.ChangeTracker.Clear();
        var student = _db.Students.Find(_studentId)!;
        return JsonStorageHelper.DeserializeList<DifficultyDto>(student.Difficulties);
    }

    private void AddSession(
        DateTime date,
        IEnumerable<(string Competency, string Subcategory)> pairs,
        bool isCancelled = false)
    {
        var mentionedJson = System.Text.Json.JsonSerializer.Serialize(
            pairs.Select(p => new { Competency = p.Competency, Subcategory = p.Subcategory }));
        _db.SessionLogs.Add(new SessionLog
        {
            Id = Guid.NewGuid(),
            StudentId = _studentId,
            TeacherId = _teacherId,
            SessionDate = date,
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            TopicTags = "[]",
            MentionedDifficultyPairs = mentionedJson,
            IsCancelled = isCancelled,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();
    }

    private static DifficultyDto MakeDiff(string id, string competency, string subcategory, string status) =>
        new(id, $"Description for {competency}/{subcategory}", competency, subcategory, "medium", "stable", status);

    private static Student MakeStudent(Guid id, Guid teacherId) => new()
    {
        Id = id,
        TeacherId = teacherId,
        Name = "Trend Test Student",
        LearningLanguage = "Spanish",
        CefrLevel = "B1",
        Interests = "[]",
        LearningGoals = "[]",
        Weaknesses = "[]",
        Difficulties = "[]",
        SkillLevelOverrides = "{}",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
    };

    public void Dispose() => _db.Dispose();
}
