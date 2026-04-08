using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Helpers;
using LangTeach.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Tests.Services;

public class ProgressServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly ProgressService _sut;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();

    public ProgressServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _sut = new ProgressService(_db);

        _db.Teachers.Add(new Teacher
        {
            Id          = _teacherId,
            Auth0UserId = "auth0|progress-test",
            Email       = "progress@test.com",
            DisplayName = "Test Teacher",
            IsApproved  = true,
            CreatedAt   = DateTime.UtcNow,
            UpdatedAt   = DateTime.UtcNow,
        });
        _db.Students.Add(MakeStudent(_studentId, _teacherId, difficulties: "[]"));
        _db.SaveChanges();
    }

    [Fact]
    public async Task GetAsync_StudentNotFound_ReturnsNull()
    {
        var result = await _sut.GetAsync(_teacherId, Guid.NewGuid());
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAsync_StudentWithNoCourse_ReturnsPartialDto()
    {
        // Add a session log
        _db.SessionLogs.Add(MakeSessionLog(_studentId, _teacherId, DateTime.UtcNow.AddDays(-7)));
        await _db.SaveChangesAsync();

        var result = await _sut.GetAsync(_teacherId, _studentId);

        result.Should().NotBeNull();
        result!.CourseName.Should().BeNull();
        result.CourseId.Should().BeNull();
        result.TotalEntries.Should().Be(0);
        result.SessionsDone.Should().Be(1);
        result.PacingStatus.Should().Be("unknown");
        result.Timeline.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAsync_CourseWithEntries_ReturnsCoverage()
    {
        var courseId = Guid.NewGuid();
        var lessonId = Guid.NewGuid();
        AddCourseWithEntries(courseId, lessonId, sessionCount: 5);

        var result = await _sut.GetAsync(_teacherId, _studentId);

        result.Should().NotBeNull();
        result!.TotalEntries.Should().Be(3);
        result.TaughtEntries.Should().Be(1);
        result.CreatedEntries.Should().Be(1);
        result.PlannedEntries.Should().Be(1);
        result.PlannedSessionCount.Should().Be(5);
    }

    [Fact]
    public async Task GetAsync_Timeline_OrderedByOrderIndex()
    {
        var courseId = Guid.NewGuid();
        var lessonId = Guid.NewGuid();
        AddCourseWithEntries(courseId, lessonId, sessionCount: 5);

        var result = await _sut.GetAsync(_teacherId, _studentId);

        result!.Timeline.Should().HaveCount(3);
        result.Timeline.Select(t => t.OrderIndex).Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task GetAsync_Timeline_SessionDateFromLinkedLesson()
    {
        var courseId = Guid.NewGuid();
        var lessonId = Guid.NewGuid();
        AddCourseWithEntries(courseId, lessonId, sessionCount: 5);

        var sessionDate = DateTime.UtcNow.AddDays(-3);
        _db.SessionLogs.Add(MakeSessionLog(_studentId, _teacherId, sessionDate, linkedLessonId: lessonId));
        await _db.SaveChangesAsync();

        var result = await _sut.GetAsync(_teacherId, _studentId);

        var taughtEntry = result!.Timeline.First(t => t.Status == "taught");
        taughtEntry.SessionDate.Should().BeCloseTo(sessionDate, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task GetAsync_CancelledSessionsExcluded_FromSessionsDone()
    {
        var courseId = Guid.NewGuid();
        AddCourseWithEntries(courseId, Guid.NewGuid(), sessionCount: 4);

        _db.SessionLogs.Add(MakeSessionLog(_studentId, _teacherId, DateTime.UtcNow.AddDays(-7)));
        _db.SessionLogs.Add(MakeSessionLog(_studentId, _teacherId, DateTime.UtcNow.AddDays(-14), isCancelled: true));
        await _db.SaveChangesAsync();

        var result = await _sut.GetAsync(_teacherId, _studentId);

        result!.SessionsDone.Should().Be(1);
    }

    [Fact]
    public async Task GetAsync_PacingAhead_WhenManySessions()
    {
        var courseId = Guid.NewGuid();
        // Course created 4 weeks ago, 8 sessions planned, 7 done — well ahead of 1/week pace
        var createdAt = DateTime.UtcNow.AddDays(-28);
        _db.Courses.Add(new Course
        {
            Id           = courseId,
            TeacherId    = _teacherId,
            StudentId    = _studentId,
            Name         = "Pacing Test",
            Language     = "English",
            Mode         = "general",
            SessionCount = 8,
            IsDeleted    = false,
            CreatedAt    = createdAt,
            UpdatedAt    = createdAt,
        });
        for (int i = 0; i < 7; i++)
            _db.SessionLogs.Add(MakeSessionLog(_studentId, _teacherId, DateTime.UtcNow.AddDays(-i)));
        await _db.SaveChangesAsync();

        var result = await _sut.GetAsync(_teacherId, _studentId);

        result!.PacingStatus.Should().Be("ahead");
    }

    [Fact]
    public async Task GetAsync_PacingBehind_WhenFewSessions()
    {
        var courseId = Guid.NewGuid();
        // Course created 8 weeks ago, 8 sessions planned, 0 done — clearly behind
        var createdAt = DateTime.UtcNow.AddDays(-56);
        _db.Courses.Add(new Course
        {
            Id           = courseId,
            TeacherId    = _teacherId,
            StudentId    = _studentId,
            Name         = "Pacing Test",
            Language     = "English",
            Mode         = "general",
            SessionCount = 8,
            IsDeleted    = false,
            CreatedAt    = createdAt,
            UpdatedAt    = createdAt,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetAsync(_teacherId, _studentId);

        result!.PacingStatus.Should().Be("behind");
    }

    [Fact]
    public async Task GetAsync_Difficulties_MappedWithTrend()
    {
        var difficulties = JsonStorageHelper.Serialize(new[]
        {
            new { Id = "d1", Description = "Articles", Competency = "Grammar", Subcategory = "Articles", Severity = "medium", Status = "Active", Trend = "worsening" },
            new { Id = "d2", Description = "Listening", Competency = "Skills", Subcategory = "Listening", Severity = "low", Status = "Covered", Trend = "improving" },
        });
        var student = await _db.Students.FindAsync(_studentId);
        student!.Difficulties = difficulties;
        await _db.SaveChangesAsync();

        var result = await _sut.GetAsync(_teacherId, _studentId);

        result!.Difficulties.Should().HaveCount(2);
        result.Difficulties.First(d => d.Id == "d1").Trend.Should().Be("worsening");
        result.Difficulties.First(d => d.Id == "d2").Trend.Should().Be("improving");
    }

    public void Dispose() => _db.Dispose();

    private static Student MakeStudent(Guid id, Guid teacherId, string difficulties = "[]") => new()
    {
        Id               = id,
        TeacherId        = teacherId,
        Name             = "Test Student",
        LearningLanguage = "English",
        CefrLevel        = "B1",
        Difficulties     = difficulties,
        IsDeleted        = false,
        CreatedAt        = DateTime.UtcNow,
        UpdatedAt        = DateTime.UtcNow,
    };

    private static SessionLog MakeSessionLog(
        Guid studentId,
        Guid teacherId,
        DateTime sessionDate,
        Guid? linkedLessonId = null,
        bool isCancelled = false) => new()
    {
        Id                     = Guid.NewGuid(),
        StudentId              = studentId,
        TeacherId              = teacherId,
        SessionDate            = sessionDate,
        LinkedLessonId         = linkedLessonId,
        IsCancelled            = isCancelled,
        PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
        IsDeleted              = false,
        CreatedAt              = sessionDate,
        UpdatedAt              = sessionDate,
    };

    private void AddCourseWithEntries(Guid courseId, Guid lessonId, int sessionCount)
    {
        var createdAt = DateTime.UtcNow.AddDays(-30);
        _db.Courses.Add(new Course
        {
            Id           = courseId,
            TeacherId    = _teacherId,
            StudentId    = _studentId,
            Name         = "Test Course",
            Language     = "English",
            Mode         = "general",
            SessionCount = sessionCount,
            IsDeleted    = false,
            CreatedAt    = createdAt,
            UpdatedAt    = createdAt,
        });
        _db.CurriculumEntries.AddRange(
            new CurriculumEntry { Id = Guid.NewGuid(), CourseId = courseId, OrderIndex = 1, Topic = "Conditionals",   Competencies = "grammar",   Status = "taught",   LessonId = lessonId, IsDeleted = false },
            new CurriculumEntry { Id = Guid.NewGuid(), CourseId = courseId, OrderIndex = 2, Topic = "Past Tense",     Competencies = "grammar",   Status = "created",  LessonId = Guid.NewGuid(), IsDeleted = false },
            new CurriculumEntry { Id = Guid.NewGuid(), CourseId = courseId, OrderIndex = 3, Topic = "Future Plans",   Competencies = "speaking",  Status = "planned",  LessonId = null,   IsDeleted = false }
        );
        _db.SaveChanges();
    }
}
