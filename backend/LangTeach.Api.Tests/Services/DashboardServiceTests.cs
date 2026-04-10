using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class DashboardServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly DashboardService _sut;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();

    public DashboardServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _sut = new DashboardService(_db, NullLogger<DashboardService>.Instance);

        _db.Teachers.Add(new Teacher
        {
            Id = _teacherId,
            Auth0UserId = "auth0|dashboard-test",
            Email = "dashboard@test.com",
            DisplayName = "Dashboard Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Students.Add(new Student
        {
            Id = _studentId,
            TeacherId = _teacherId,
            Name = "Ana García",
            LearningLanguage = "Spanish",
            CefrLevel = "B1",
            NativeLanguages = "[\"English\"]",
            TeachingTodos = "[]",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private SessionLog MakeSession(Guid studentId, DateTime? sessionDate, bool isCancelled = false, bool isDeleted = false, string? generalNotes = null, string? plannedContent = null)
        => new()
        {
            Id = Guid.NewGuid(),
            StudentId = studentId,
            TeacherId = _teacherId,
            SessionDate = sessionDate,
            IsCancelled = isCancelled,
            IsDeleted = isDeleted,
            GeneralNotes = generalNotes,
            PlannedContent = plannedContent,
            Status = SessionLogStatus.Confirmed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

    [Fact]
    public async Task GetAsync_NoData_ReturnsEmptyDto()
    {
        var result = await _sut.GetAsync(_teacherId);

        result.NextSession.Should().BeNull();
        result.TodaySessions.Should().BeEmpty();
        result.ActiveStudents.Should().HaveCount(1); // student exists but has no sessions
        result.ActiveStudents[0].TotalSessions.Should().Be(0);
        result.ActiveStudents[0].LastSessionDate.Should().BeNull();
        result.ActiveStudents[0].NextSessionDate.Should().BeNull();
    }

    [Fact]
    public async Task GetAsync_OneFutureSession_PopulatesNextSession()
    {
        var future = DateTime.UtcNow.AddDays(1);
        _db.SessionLogs.Add(MakeSession(_studentId, future, plannedContent: "Subjunctive"));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.NextSession.Should().NotBeNull();
        result.NextSession!.StudentId.Should().Be(_studentId);
        result.NextSession.StudentName.Should().Be("Ana García");
        result.NextSession.SessionDate.Should().BeCloseTo(future, TimeSpan.FromSeconds(1));
        result.NextSession.PlannedContent.Should().Be("Subjunctive");
        result.NextSession.LastSessionNotes.Should().BeNull();
        result.NextSession.LastSessionDate.Should().BeNull();
    }

    [Fact]
    public async Task GetAsync_FutureSessionWithPastSession_PopulatesLastSessionNotes()
    {
        var past = DateTime.UtcNow.AddDays(-7);
        var future = DateTime.UtcNow.AddDays(1);
        _db.SessionLogs.Add(MakeSession(_studentId, past, generalNotes: "Struggles with ser/estar"));
        _db.SessionLogs.Add(MakeSession(_studentId, future));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.NextSession!.LastSessionNotes.Should().Be("Struggles with ser/estar");
        result.NextSession.LastSessionDate.Should().BeCloseTo(past, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task GetAsync_MultipleTodaySessions_ReturnedOrderedByTime()
    {
        var today = DateTime.UtcNow.Date;
        var session1 = MakeSession(_studentId, today.AddHours(10));
        var session2 = MakeSession(_studentId, today.AddHours(8));
        _db.SessionLogs.AddRange(session1, session2);
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.TodaySessions.Should().HaveCount(2);
        result.TodaySessions[0].SessionDate.Hour.Should().Be(8);
        result.TodaySessions[1].SessionDate.Hour.Should().Be(10);
    }

    [Fact]
    public async Task GetAsync_CancelledTodaySession_IncludedInTodaySessions()
    {
        var today = DateTime.UtcNow.Date.AddHours(9);
        _db.SessionLogs.Add(MakeSession(_studentId, today, isCancelled: true));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        // Cancelled today-sessions are shown (teacher needs full schedule view).
        // IsCancelled is a separate flag from Status; Status field reflects the session lifecycle state.
        result.TodaySessions.Should().HaveCount(1);
        result.TodaySessions[0].StudentId.Should().Be(_studentId);
    }

    [Fact]
    public async Task GetAsync_CancelledFutureSession_ExcludedFromNextSession()
    {
        var future = DateTime.UtcNow.AddDays(1);
        _db.SessionLogs.Add(MakeSession(_studentId, future, isCancelled: true));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.NextSession.Should().BeNull();
    }

    [Fact]
    public async Task GetAsync_DeletedSession_ExcludedFromAllSections()
    {
        var future = DateTime.UtcNow.AddDays(1);
        var today = DateTime.UtcNow.Date.AddHours(9);
        _db.SessionLogs.Add(MakeSession(_studentId, future, isDeleted: true));
        _db.SessionLogs.Add(MakeSession(_studentId, today, isDeleted: true));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.NextSession.Should().BeNull();
        result.TodaySessions.Should().BeEmpty();
        result.ActiveStudents[0].TotalSessions.Should().Be(0);
    }

    [Fact]
    public async Task GetAsync_ActiveStudents_ComputesSessionStats()
    {
        var past1 = DateTime.UtcNow.AddDays(-14);
        var past2 = DateTime.UtcNow.AddDays(-7);
        var future = DateTime.UtcNow.AddDays(3);
        _db.SessionLogs.AddRange(
            MakeSession(_studentId, past1),
            MakeSession(_studentId, past2),
            MakeSession(_studentId, future));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        var student = result.ActiveStudents.Should().ContainSingle().Subject;
        student.TotalSessions.Should().Be(3);
        student.LastSessionDate.Should().BeCloseTo(past2, TimeSpan.FromSeconds(1));
        student.NextSessionDate.Should().BeCloseTo(future, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task GetAsync_ActiveStudents_DeserializesNativeLanguages()
    {
        var result = await _sut.GetAsync(_teacherId);

        var student = result.ActiveStudents.Should().ContainSingle().Subject;
        student.NativeLanguages.Should().Equal("English");
    }

    [Fact]
    public async Task GetAsync_ActiveStudents_CountsTeachingTodos()
    {
        _db.Students.First(s => s.Id == _studentId).TeachingTodos =
            "[{\"id\":\"1\",\"text\":\"Focus on subjunctive\"},{\"id\":\"2\",\"text\":\"Review homework\"}]";
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.ActiveStudents[0].TeachingTodosCount.Should().Be(2);
    }

    [Fact]
    public async Task GetAsync_ActiveStudents_ReturnsPendingTodos()
    {
        _db.Students.First(s => s.Id == _studentId).TeachingTodos =
            "[{\"id\":\"t1\",\"text\":\"Focus on subjunctive\",\"createdAt\":\"2026-04-01T10:00:00Z\",\"status\":\"pending\",\"sourceSessionLogId\":null,\"coveredInSessionLogId\":null}," +
            "{\"id\":\"t2\",\"text\":\"Review homework\",\"createdAt\":\"2026-04-02T10:00:00Z\",\"status\":\"covered\",\"sourceSessionLogId\":null,\"coveredInSessionLogId\":null}]";
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        var student = result.ActiveStudents[0];
        student.TeachingTodosCount.Should().Be(2);
        student.PendingTodos.Should().HaveCount(1);
        student.PendingTodos[0].Id.Should().Be("t1");
        student.PendingTodos[0].Text.Should().Be("Focus on subjunctive");
        student.PendingTodos[0].Status.Should().Be("pending");
    }

    [Fact]
    public async Task GetAsync_InactiveStudents_ExcludedFromActiveStudents()
    {
        var inactiveId = Guid.NewGuid();
        _db.Students.Add(new Student
        {
            Id = inactiveId,
            TeacherId = _teacherId,
            Name = "Inactive Student",
            LearningLanguage = "Spanish",
            CefrLevel = "A1",
            IsActive = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.ActiveStudents.Should().NotContain(s => s.StudentId == inactiveId);
    }
}
