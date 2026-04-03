using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Tests.Services;

public class SessionHistoryServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly SessionHistoryService _sut;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();

    public SessionHistoryServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _sut = new SessionHistoryService(_db);

        _db.Teachers.Add(new Teacher
        {
            Id = _teacherId,
            Auth0UserId = "auth0|history-test",
            Email = "history-test@test.com",
            DisplayName = "History Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Students.Add(new Student
        {
            Id = _studentId,
            TeacherId = _teacherId,
            Name = "History Student",
            LearningLanguage = "Spanish",
            CefrLevel = "B1",
            SkillLevelOverrides = "{}",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private SessionLog MakeSession(DateTime date, string? planned = null, string? actual = null,
        string? nextTopics = null, string? homework = null, HomeworkStatus status = HomeworkStatus.NotApplicable,
        string topicTags = "[]")
        => new()
        {
            Id = Guid.NewGuid(),
            TeacherId = _teacherId,
            StudentId = _studentId,
            SessionDate = date,
            PlannedContent = planned,
            ActualContent = actual,
            NextSessionTopics = nextTopics,
            HomeworkAssigned = homework,
            PreviousHomeworkStatus = status,
            TopicTags = topicTags,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

    // --- No sessions ---

    [Fact]
    public async Task ReturnsNull_WhenStudentHasNoSessions()
    {
        var result = await _sut.BuildContextAsync(_teacherId, _studentId, DateTime.UtcNow);

        result.Should().BeNull();
    }

    [Fact]
    public async Task ReturnsNull_WhenAllSessionsSoftDeleted()
    {
        var session = MakeSession(DateTime.UtcNow.AddDays(-1));
        session.IsDeleted = true;
        _db.SessionLogs.Add(session);
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, DateTime.UtcNow);

        result.Should().BeNull();
    }

    // --- One session ---

    [Fact]
    public async Task OneSession_ReturnsCorrectBasicFields()
    {
        var sessionDate = new DateTime(2026, 4, 1, 10, 0, 0, DateTimeKind.Utc);
        _db.SessionLogs.Add(MakeSession(sessionDate,
            planned: "Past tense",
            actual: "Irregular verbs",
            nextTopics: "More irregular verbs",
            homework: "10 sentences"));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId,
            new DateTime(2026, 4, 6, 12, 0, 0, DateTimeKind.Utc));

        result.Should().NotBeNull();
        result!.DaysSinceLastSession.Should().Be(5);
        result.RecentSessions.Should().HaveCount(1);
        result.RecentSessions[0].PlannedContent.Should().Be("Past tense");
        result.RecentSessions[0].ActualContent.Should().Be("Irregular verbs");
        result.OpenActionItems.Should().Be("More irregular verbs");
        result.PendingHomework.Should().Be("10 sentences");
    }

    [Fact]
    public async Task SameDaySession_DaysSinceIsZero()
    {
        var today = new DateTime(2026, 4, 3, 9, 0, 0, DateTimeKind.Utc);
        _db.SessionLogs.Add(MakeSession(today));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId,
            new DateTime(2026, 4, 3, 14, 0, 0, DateTimeKind.Utc));

        result!.DaysSinceLastSession.Should().Be(0);
    }

    // --- Multiple sessions ---

    [Fact]
    public async Task ThreeSessions_RecentSessionsHasAllThree_OrderedByDateDesc()
    {
        var base_ = new DateTime(2026, 3, 1, 10, 0, 0, DateTimeKind.Utc);
        _db.SessionLogs.AddRange(
            MakeSession(base_),
            MakeSession(base_.AddDays(7)),
            MakeSession(base_.AddDays(14)));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, base_.AddDays(21));

        result!.RecentSessions.Should().HaveCount(3);
        result.RecentSessions[0].SessionDate.Should().Be(base_.AddDays(14));
        result.RecentSessions[1].SessionDate.Should().Be(base_.AddDays(7));
        result.RecentSessions[2].SessionDate.Should().Be(base_);
    }

    [Fact]
    public async Task FivePlusSessions_RecentSessionsCappedAtThree()
    {
        var base_ = new DateTime(2026, 3, 1, 10, 0, 0, DateTimeKind.Utc);
        for (var i = 0; i < 6; i++)
            _db.SessionLogs.Add(MakeSession(base_.AddDays(i * 7)));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, base_.AddDays(50));

        result!.RecentSessions.Should().HaveCount(3);
    }

    // --- Time gap bands ---

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(2)]
    public async Task DaysSinceLastSession_Band1(int daysAgo)
    {
        _db.SessionLogs.Add(MakeSession(DateTime.UtcNow.AddDays(-daysAgo)));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, DateTime.UtcNow);

        result!.DaysSinceLastSession.Should().Be(daysAgo);
    }

    [Theory]
    [InlineData(3)]
    [InlineData(7)]
    public async Task DaysSinceLastSession_Band2(int daysAgo)
    {
        var date = DateTime.UtcNow.Date.AddDays(-daysAgo);
        _db.SessionLogs.Add(MakeSession(date));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, DateTime.UtcNow);

        result!.DaysSinceLastSession.Should().Be(daysAgo);
    }

    [Theory]
    [InlineData(8)]
    [InlineData(14)]
    public async Task DaysSinceLastSession_Band3(int daysAgo)
    {
        var date = DateTime.UtcNow.Date.AddDays(-daysAgo);
        _db.SessionLogs.Add(MakeSession(date));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, DateTime.UtcNow);

        result!.DaysSinceLastSession.Should().Be(daysAgo);
    }

    [Theory]
    [InlineData(15)]
    [InlineData(30)]
    public async Task DaysSinceLastSession_Band4(int daysAgo)
    {
        var date = DateTime.UtcNow.Date.AddDays(-daysAgo);
        _db.SessionLogs.Add(MakeSession(date));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, DateTime.UtcNow);

        result!.DaysSinceLastSession.Should().Be(daysAgo);
    }

    // --- Topic tag aggregation ---

    [Fact]
    public async Task TopicTags_AggregatedFromAllFiveSessions()
    {
        var base_ = new DateTime(2026, 3, 1, 10, 0, 0, DateTimeKind.Utc);
        for (var i = 0; i < 5; i++)
            _db.SessionLogs.Add(MakeSession(base_.AddDays(i * 7),
                topicTags: $"[{{\"tag\":\"topic{i}\",\"category\":\"grammar\"}}]"));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, base_.AddDays(40));

        result!.CoveredTopics.Should().HaveCount(5);
    }

    [Fact]
    public async Task TopicTags_Deduplicated_CaseInsensitive()
    {
        var base_ = new DateTime(2026, 3, 1, 10, 0, 0, DateTimeKind.Utc);
        // Newer session (processed first due to desc order) has lowercase tag.
        // Older session has capitalized tag — should be deduped.
        _db.SessionLogs.Add(MakeSession(base_,
            topicTags: "[{\"tag\":\"Preterito Indefinido\",\"category\":\"grammar\"}]"));
        _db.SessionLogs.Add(MakeSession(base_.AddDays(7),
            topicTags: "[{\"tag\":\"preterito indefinido\",\"category\":\"grammar\"}]"));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, base_.AddDays(14));

        result!.CoveredTopics.Should().HaveCount(1);
        // Most recent session's tag is kept (first in desc-ordered iteration)
        result.CoveredTopics[0].Tag.Should().Be("preterito indefinido");
    }

    [Fact]
    public async Task TopicTags_EmptyOnAllSessions_CoveredTopicsIsEmpty()
    {
        _db.SessionLogs.Add(MakeSession(DateTime.UtcNow.AddDays(-1)));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, DateTime.UtcNow);

        result!.CoveredTopics.Should().BeEmpty();
    }

    [Fact]
    public async Task TopicTags_MalformedJson_SkippedSilently()
    {
        _db.SessionLogs.Add(MakeSession(DateTime.UtcNow.AddDays(-1), topicTags: "not valid json"));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, DateTime.UtcNow);

        result!.CoveredTopics.Should().BeEmpty();
    }

    // --- Skill level overrides ---

    [Fact]
    public async Task SkillLevelOverrides_EmptyJson_ReturnsEmptyDict()
    {
        _db.SessionLogs.Add(MakeSession(DateTime.UtcNow.AddDays(-1)));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, DateTime.UtcNow);

        result!.SkillLevelOverrides.Should().BeEmpty();
    }

    [Fact]
    public async Task SkillLevelOverrides_NonEmpty_Deserialized()
    {
        var student = await _db.Students.FindAsync(_studentId);
        student!.SkillLevelOverrides = "{\"speaking\":\"A1.2\",\"writing\":\"B1.2\"}";
        await _db.SaveChangesAsync();

        _db.SessionLogs.Add(MakeSession(DateTime.UtcNow.AddDays(-1)));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, DateTime.UtcNow);

        result!.SkillLevelOverrides.Should().HaveCount(2);
        result.SkillLevelOverrides["speaking"].Should().Be("A1.2");
        result.SkillLevelOverrides["writing"].Should().Be("B1.2");
    }

    // --- OpenActionItems / PendingHomework from most recent session ---

    [Fact]
    public async Task OpenActionItems_TakenFromMostRecentSession()
    {
        var base_ = new DateTime(2026, 3, 1, 10, 0, 0, DateTimeKind.Utc);
        _db.SessionLogs.Add(MakeSession(base_, nextTopics: "old topics"));
        _db.SessionLogs.Add(MakeSession(base_.AddDays(7), nextTopics: "new topics"));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, base_.AddDays(14));

        result!.OpenActionItems.Should().Be("new topics");
    }

    [Fact]
    public async Task PendingHomework_NullWhenLastSessionHasNoHomework()
    {
        _db.SessionLogs.Add(MakeSession(DateTime.UtcNow.AddDays(-1), homework: null));
        await _db.SaveChangesAsync();

        var result = await _sut.BuildContextAsync(_teacherId, _studentId, DateTime.UtcNow);

        result!.PendingHomework.Should().BeNull();
    }
}
