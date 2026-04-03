using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class SessionLogServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly SessionLogService _sut;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _otherTeacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();

    public SessionLogServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _sut = new SessionLogService(_db, NullLogger<SessionLogService>.Instance);

        _db.Teachers.Add(new Teacher
        {
            Id = _teacherId,
            Auth0UserId = "auth0|session-test",
            Email = "session-test@test.com",
            DisplayName = "Test Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Teachers.Add(new Teacher
        {
            Id = _otherTeacherId,
            Auth0UserId = "auth0|other-teacher",
            Email = "other@test.com",
            DisplayName = "Other Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Students.Add(new Student
        {
            Id = _studentId,
            TeacherId = _teacherId,
            Name = "Test Student",
            LearningLanguage = "Spanish",
            CefrLevel = "B1",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private static CreateSessionLogRequest BaseRequest() => new()
    {
        SessionDate = new DateTime(2026, 4, 1, 10, 0, 0, DateTimeKind.Utc),
        PlannedContent = "Review past tense",
        ActualContent = "Covered regular verbs only",
        PreviousHomeworkStatus = HomeworkStatus.Done,
    };

    [Fact]
    public async Task CreateAsync_ValidRequest_ReturnsDto()
    {
        var request = BaseRequest();
        var result = await _sut.CreateAsync(_teacherId, _studentId, request);

        result.Id.Should().NotBeEmpty();
        result.StudentId.Should().Be(_studentId);
        result.SessionDate.Should().Be(request.SessionDate);
        result.PlannedContent.Should().Be("Review past tense");
        result.ActualContent.Should().Be("Covered regular verbs only");
        result.PreviousHomeworkStatus.Should().Be(HomeworkStatus.Done);
        result.PreviousHomeworkStatusName.Should().Be("Done");
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task CreateAsync_StudentNotFound_ThrowsKeyNotFoundException()
    {
        var act = () => _sut.CreateAsync(_teacherId, Guid.NewGuid(), BaseRequest());
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreateAsync_StudentBelongsToDifferentTeacher_ThrowsKeyNotFoundException()
    {
        var act = () => _sut.CreateAsync(_otherTeacherId, _studentId, BaseRequest());
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreateAsync_InvalidHomeworkStatus_ThrowsValidationException()
    {
        var request = BaseRequest();
        request.PreviousHomeworkStatus = (HomeworkStatus)99;

        var act = () => _sut.CreateAsync(_teacherId, _studentId, request);
        await act.Should().ThrowAsync<System.ComponentModel.DataAnnotations.ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_WithLinkedLesson_SetsLessonId()
    {
        var lessonId = Guid.NewGuid();
        _db.Lessons.Add(new Lesson
        {
            Id = lessonId,
            TeacherId = _teacherId,
            Title = "Test Lesson",
            Language = "Spanish",
            CefrLevel = "B1",
            Topic = "Verbs",
            DurationMinutes = 60,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var request = BaseRequest();
        request.LinkedLessonId = lessonId;

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);
        result.LinkedLessonId.Should().Be(lessonId);
    }

    [Fact]
    public async Task CreateAsync_LinkedLessonNotFound_ThrowsKeyNotFoundException()
    {
        var request = BaseRequest();
        request.LinkedLessonId = Guid.NewGuid();

        var act = () => _sut.CreateAsync(_teacherId, _studentId, request);
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task ListAsync_ReturnsOrderedByDateDesc()
    {
        var older = new DateTime(2026, 3, 1, 10, 0, 0, DateTimeKind.Utc);
        var newer = new DateTime(2026, 4, 1, 10, 0, 0, DateTimeKind.Utc);

        _db.SessionLogs.AddRange(
            new SessionLog
            {
                Id = Guid.NewGuid(), StudentId = _studentId, TeacherId = _teacherId,
                SessionDate = older, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
            },
            new SessionLog
            {
                Id = Guid.NewGuid(), StudentId = _studentId, TeacherId = _teacherId,
                SessionDate = newer, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
            });
        await _db.SaveChangesAsync();

        var result = await _sut.ListAsync(_teacherId, _studentId);

        result.Should().HaveCount(2);
        result[0].SessionDate.Should().Be(newer);
        result[1].SessionDate.Should().Be(older);
    }

    [Fact]
    public async Task ListAsync_FiltersByTeacher_DoesNotReturnOtherTeachersData()
    {
        var otherStudentId = Guid.NewGuid();
        _db.Students.Add(new Student
        {
            Id = otherStudentId, TeacherId = _otherTeacherId, Name = "Other Student",
            LearningLanguage = "French", CefrLevel = "A1",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        _db.SessionLogs.Add(new SessionLog
        {
            Id = Guid.NewGuid(), StudentId = otherStudentId, TeacherId = _otherTeacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var act = () => _sut.ListAsync(_teacherId, otherStudentId);
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetByIdAsync_Found_ReturnsDto()
    {
        var sessionId = Guid.NewGuid();
        _db.SessionLogs.Add(new SessionLog
        {
            Id = sessionId, StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PlannedContent = "Grammar",
            PreviousHomeworkStatus = HomeworkStatus.Partial,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetByIdAsync(_teacherId, _studentId, sessionId);

        result.Should().NotBeNull();
        result!.Id.Should().Be(sessionId);
        result.PlannedContent.Should().Be("Grammar");
        result.PreviousHomeworkStatusName.Should().Be("Partial");
    }

    [Fact]
    public async Task GetByIdAsync_NotFound_ReturnsNull()
    {
        var result = await _sut.GetByIdAsync(_teacherId, _studentId, Guid.NewGuid());
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_WrongTeacher_ReturnsNull()
    {
        var sessionId = Guid.NewGuid();
        _db.SessionLogs.Add(new SessionLog
        {
            Id = sessionId, StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetByIdAsync(_otherTeacherId, _studentId, sessionId);
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_ValidRequest_ReturnsUpdatedDto()
    {
        var sessionId = Guid.NewGuid();
        _db.SessionLogs.Add(new SessionLog
        {
            Id = sessionId, StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = new DateTime(2026, 3, 1), PlannedContent = "Old content",
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var request = new UpdateSessionLogRequest
        {
            SessionDate = new DateTime(2026, 4, 2),
            PlannedContent = "New content",
            ActualContent = "Completed exercises",
            PreviousHomeworkStatus = HomeworkStatus.Done,
        };

        var result = await _sut.UpdateAsync(_teacherId, _studentId, sessionId, request);

        result.Should().NotBeNull();
        result!.PlannedContent.Should().Be("New content");
        result.ActualContent.Should().Be("Completed exercises");
        result.PreviousHomeworkStatus.Should().Be(HomeworkStatus.Done);
        result.SessionDate.Should().Be(new DateTime(2026, 4, 2));
    }

    [Fact]
    public async Task UpdateAsync_NotFound_ReturnsNull()
    {
        var request = new UpdateSessionLogRequest
        {
            SessionDate = DateTime.UtcNow,
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
        };

        var result = await _sut.UpdateAsync(_teacherId, _studentId, Guid.NewGuid(), request);
        result.Should().BeNull();
    }
}
