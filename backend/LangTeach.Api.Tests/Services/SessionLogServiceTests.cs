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

    // --- Soft Delete ---

    [Fact]
    public async Task SoftDeleteAsync_ExistingSession_ReturnsTrueAndExcludesFromList()
    {
        var sessionId = Guid.NewGuid();
        _db.SessionLogs.Add(new SessionLog
        {
            Id = sessionId, StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var deleted = await _sut.SoftDeleteAsync(_teacherId, _studentId, sessionId);

        deleted.Should().BeTrue();
        var list = await _sut.ListAsync(_teacherId, _studentId);
        list.Should().BeEmpty();
    }

    [Fact]
    public async Task SoftDeleteAsync_NotFound_ReturnsFalse()
    {
        var result = await _sut.SoftDeleteAsync(_teacherId, _studentId, Guid.NewGuid());
        result.Should().BeFalse();
    }

    [Fact]
    public async Task GetByIdAsync_SoftDeleted_ReturnsNull()
    {
        var sessionId = Guid.NewGuid();
        _db.SessionLogs.Add(new SessionLog
        {
            Id = sessionId, StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            IsDeleted = true,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetByIdAsync(_teacherId, _studentId, sessionId);
        result.Should().BeNull();
    }

    // --- Topic Tags ---

    [Fact]
    public async Task CreateAsync_WithTopicTags_RoundTrips()
    {
        var tags = """[{"tag":"preterito indefinido","category":"grammar"}]""";
        var request = BaseRequest();
        request.TopicTags = tags;

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);

        result.TopicTags.Should().Be(tags);
    }

    [Fact]
    public async Task CreateAsync_NullTopicTags_DefaultsToEmptyArray()
    {
        var result = await _sut.CreateAsync(_teacherId, _studentId, BaseRequest());
        result.TopicTags.Should().Be("[]");
    }

    // --- Reassessment Validation ---

    [Fact]
    public async Task CreateAsync_InvalidReassessmentSkill_ThrowsValidation()
    {
        var request = BaseRequest();
        request.LevelReassessmentSkill = "Pronunciation";
        request.LevelReassessmentLevel = "B1.1";

        var act = () => _sut.CreateAsync(_teacherId, _studentId, request);
        await act.Should().ThrowAsync<System.ComponentModel.DataAnnotations.ValidationException>()
            .WithMessage("*LevelReassessmentSkill*");
    }

    [Fact]
    public async Task CreateAsync_InvalidReassessmentLevel_ThrowsValidation()
    {
        var request = BaseRequest();
        request.LevelReassessmentSkill = "Speaking";
        request.LevelReassessmentLevel = "A1+";

        var act = () => _sut.CreateAsync(_teacherId, _studentId, request);
        await act.Should().ThrowAsync<System.ComponentModel.DataAnnotations.ValidationException>()
            .WithMessage("*LevelReassessmentLevel*");
    }

    [Fact]
    public async Task CreateAsync_ReassessmentSkillCaseInsensitive_Accepted()
    {
        var request = BaseRequest();
        request.LevelReassessmentSkill = "speaking";
        request.LevelReassessmentLevel = "a1.2";

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);
        result.LevelReassessmentSkill.Should().Be("speaking");
    }

    // --- Reassessment Propagation ---

    [Fact]
    public async Task CreateAsync_WithReassessment_PropagatesSkillOverrideToStudent()
    {
        var request = BaseRequest();
        request.LevelReassessmentSkill = "Speaking";
        request.LevelReassessmentLevel = "A1.2";

        await _sut.CreateAsync(_teacherId, _studentId, request);

        var student = await _db.Students.FindAsync(_studentId);
        student!.SkillLevelOverrides.Should().Contain("\"speaking\"");
        student.SkillLevelOverrides.Should().Contain("\"A1.2\"");
    }

    [Fact]
    public async Task UpdateAsync_WithReassessment_OverwritesPreviousOverride()
    {
        var sessionId = Guid.NewGuid();
        _db.SessionLogs.Add(new SessionLog
        {
            Id = sessionId, StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            LevelReassessmentSkill = "Speaking", LevelReassessmentLevel = "A1.2",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        var student = await _db.Students.FindAsync(_studentId);
        student!.SkillLevelOverrides = """{"speaking":"A1.2"}""";
        await _db.SaveChangesAsync();

        var request = new UpdateSessionLogRequest
        {
            SessionDate = DateTime.UtcNow,
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            LevelReassessmentSkill = "Speaking",
            LevelReassessmentLevel = "A2.1",
        };

        await _sut.UpdateAsync(_teacherId, _studentId, sessionId, request);

        var updatedStudent = await _db.Students.FindAsync(_studentId);
        updatedStudent!.SkillLevelOverrides.Should().Contain("\"A2.1\"");
        updatedStudent.SkillLevelOverrides.Should().NotContain("\"A1.2\"");
    }

    [Fact]
    public async Task UpdateAsync_ClearingReassessment_DoesNotRevertStudentOverride()
    {
        var sessionId = Guid.NewGuid();
        _db.SessionLogs.Add(new SessionLog
        {
            Id = sessionId, StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        var student = await _db.Students.FindAsync(_studentId);
        student!.SkillLevelOverrides = """{"speaking":"A1.2"}""";
        await _db.SaveChangesAsync();

        var request = new UpdateSessionLogRequest
        {
            SessionDate = DateTime.UtcNow,
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            LevelReassessmentSkill = null,
            LevelReassessmentLevel = null,
        };

        await _sut.UpdateAsync(_teacherId, _studentId, sessionId, request);

        var updatedStudent = await _db.Students.FindAsync(_studentId);
        updatedStudent!.SkillLevelOverrides.Should().Contain("\"speaking\"");
        updatedStudent.SkillLevelOverrides.Should().Contain("\"A1.2\"");
    }

    [Fact]
    public async Task SoftDeleteAsync_DoesNotRevertStudentSkillOverrides()
    {
        var sessionId = Guid.NewGuid();
        _db.SessionLogs.Add(new SessionLog
        {
            Id = sessionId, StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            LevelReassessmentSkill = "Writing", LevelReassessmentLevel = "B1.2",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        var student = await _db.Students.FindAsync(_studentId);
        student!.SkillLevelOverrides = """{"writing":"B1.2"}""";
        await _db.SaveChangesAsync();

        await _sut.SoftDeleteAsync(_teacherId, _studentId, sessionId);

        var updatedStudent = await _db.Students.FindAsync(_studentId);
        updatedStudent!.SkillLevelOverrides.Should().Contain("\"writing\"");
        updatedStudent.SkillLevelOverrides.Should().Contain("\"B1.2\"");
    }

    // ---- GetSummaryAsync tests ----

    [Fact]
    public async Task GetSummary_ZeroSessions_ReturnsEmptyState()
    {
        var result = await _sut.GetSummaryAsync(_teacherId, _studentId);

        result.TotalSessions.Should().Be(0);
        result.LastSessionDate.Should().BeNull();
        result.DaysSinceLastSession.Should().BeNull();
        result.OpenActionItems.Should().BeEmpty();
        result.LevelReassessmentPending.Should().BeFalse();
    }

    [Fact]
    public async Task GetSummary_WithSessions_ReturnsTotalsAndLastDate()
    {
        var date = new DateTime(2026, 3, 30, 0, 0, 0, DateTimeKind.Utc);
        _db.SessionLogs.AddRange(
            new SessionLog { Id = Guid.NewGuid(), StudentId = _studentId, TeacherId = _teacherId, SessionDate = date.AddDays(-5), PreviousHomeworkStatus = HomeworkStatus.NotApplicable, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new SessionLog { Id = Guid.NewGuid(), StudentId = _studentId, TeacherId = _teacherId, SessionDate = date, PreviousHomeworkStatus = HomeworkStatus.NotApplicable, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _db.SaveChangesAsync();

        var result = await _sut.GetSummaryAsync(_teacherId, _studentId);

        result.TotalSessions.Should().Be(2);
        result.LastSessionDate.Should().Be("2026-03-30");
    }

    [Fact]
    public async Task GetSummary_OpenActionItems_SplitsNewlines()
    {
        _db.SessionLogs.Add(new SessionLog
        {
            Id = Guid.NewGuid(), StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            NextSessionTopics = "Work on para/por\nMore listening practice",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetSummaryAsync(_teacherId, _studentId);

        result.OpenActionItems.Should().BeEquivalentTo(new[] { "Work on para/por", "More listening practice" });
    }

    [Fact]
    public async Task GetSummary_OpenActionItems_NullTopics_ReturnsEmpty()
    {
        _db.SessionLogs.Add(new SessionLog
        {
            Id = Guid.NewGuid(), StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            NextSessionTopics = null,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetSummaryAsync(_teacherId, _studentId);

        result.OpenActionItems.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSummary_LevelReassessmentPending_WhenOverrideDiffersFromNominal()
    {
        var student = await _db.Students.FindAsync(_studentId);
        student!.CefrLevel = "B1";
        student.SkillLevelOverrides = """{"speaking":"A1.2"}""";
        await _db.SaveChangesAsync();

        var result = await _sut.GetSummaryAsync(_teacherId, _studentId);

        result.LevelReassessmentPending.Should().BeTrue();
        result.SkillLevelOverrides.Should().ContainKey("speaking").WhoseValue.Should().Be("A1.2");
    }

    [Fact]
    public async Task GetSummary_LevelReassessmentPending_False_WhenNoOverrides()
    {
        var result = await _sut.GetSummaryAsync(_teacherId, _studentId);

        result.LevelReassessmentPending.Should().BeFalse();
        result.SkillLevelOverrides.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSummary_StudentNotFound_ThrowsKeyNotFoundException()
    {
        var act = () => _sut.GetSummaryAsync(_teacherId, Guid.NewGuid());

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetSummary_IgnoresSoftDeletedSessions()
    {
        _db.SessionLogs.Add(new SessionLog
        {
            Id = Guid.NewGuid(), StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            NextSessionTopics = "Some topic", IsDeleted = true,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetSummaryAsync(_teacherId, _studentId);

        result.TotalSessions.Should().Be(0);
        result.OpenActionItems.Should().BeEmpty();
    }
}
