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
        var profileService = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, profileService);
        _sut = new SessionLogService(_db, new NullDifficultyTrendService(), pedagogy, NullLogger<SessionLogService>.Instance);

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
        result.TeacherId.Should().Be(_teacherId);
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
    public async Task CreateAsync_FutureDate_Succeeds()
    {
        var request = BaseRequest();
        request.SessionDate = DateTime.UtcNow.AddDays(1);

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);
        result.SessionDate!.Value.Date.Should().Be(request.SessionDate!.Value.Date);
    }

    [Fact]
    public async Task UpdateAsync_FutureDate_Succeeds()
    {
        var sessionId = Guid.NewGuid();
        _db.SessionLogs.Add(new SessionLog
        {
            Id = sessionId,
            StudentId = _studentId,
            TeacherId = _teacherId,
            SessionDate = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc),
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            TopicTags = "[]",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();

        var futureDate = DateTime.UtcNow.AddDays(1);
        var request = new UpdateSessionLogRequest
        {
            SessionDate = futureDate,
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
        };

        var result = await _sut.UpdateAsync(_teacherId, _studentId, sessionId, request);
        result.Should().NotBeNull();
        result!.SessionDate!.Value.Date.Should().Be(futureDate.Date);
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
    public async Task ListAsync_HasVoiceNote_TrueWhenVoiceNoteApplicationExists()
    {
        var sessionId = Guid.NewGuid();
        _db.SessionLogs.Add(new SessionLog
        {
            Id = sessionId, StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        _db.VoiceNoteApplications.Add(new VoiceNoteApplication
        {
            Id = Guid.NewGuid(),
            SessionLogId = sessionId,
            ApplicationType = ApplicationType.Create,
            AppliedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.ListAsync(_teacherId, _studentId);

        result.Should().HaveCount(1);
        result[0].HasVoiceNote.Should().BeTrue();
    }

    [Fact]
    public async Task ListAsync_HasVoiceNote_FalseWhenNoVoiceNoteApplication()
    {
        _db.SessionLogs.Add(new SessionLog
        {
            Id = Guid.NewGuid(), StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.ListAsync(_teacherId, _studentId);

        result.Should().HaveCount(1);
        result[0].HasVoiceNote.Should().BeFalse();
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
        request.LevelReassessmentLevel = "B1";

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
        request.LevelReassessmentLevel = "a1";

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);
        result.LevelReassessmentSkill.Should().Be("speaking");
    }

    // --- Reassessment Propagation ---

    [Fact]
    public async Task CreateAsync_WithReassessment_PropagatesSkillOverrideToStudent()
    {
        var request = BaseRequest();
        request.LevelReassessmentSkill = "Speaking";
        request.LevelReassessmentLevel = "A1";

        await _sut.CreateAsync(_teacherId, _studentId, request);

        var student = await _db.Students.FindAsync(_studentId);
        student!.SkillLevelOverrides.Should().Contain("\"speaking\"");
        student.SkillLevelOverrides.Should().Contain("\"A1\"");
    }

    [Fact]
    public async Task UpdateAsync_WithReassessment_OverwritesPreviousOverride()
    {
        var sessionId = Guid.NewGuid();
        _db.SessionLogs.Add(new SessionLog
        {
            Id = sessionId, StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            LevelReassessmentSkill = "Speaking", LevelReassessmentLevel = "A1",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        var student = await _db.Students.FindAsync(_studentId);
        student!.SkillLevelOverrides = """{"speaking":"A1"}""";
        await _db.SaveChangesAsync();

        var request = new UpdateSessionLogRequest
        {
            SessionDate = DateTime.UtcNow,
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            LevelReassessmentSkill = "Speaking",
            LevelReassessmentLevel = "A2",
        };

        await _sut.UpdateAsync(_teacherId, _studentId, sessionId, request);

        var updatedStudent = await _db.Students.FindAsync(_studentId);
        updatedStudent!.SkillLevelOverrides.Should().Contain("\"A2\"");
        updatedStudent.SkillLevelOverrides.Should().NotContain("\"A1\"");
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
        student!.SkillLevelOverrides = """{"speaking":"A1"}""";
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
        updatedStudent.SkillLevelOverrides.Should().Contain("\"A1\"");
    }

    [Fact]
    public async Task SoftDeleteAsync_DoesNotRevertStudentSkillOverrides()
    {
        var sessionId = Guid.NewGuid();
        _db.SessionLogs.Add(new SessionLog
        {
            Id = sessionId, StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            LevelReassessmentSkill = "Writing", LevelReassessmentLevel = "B1",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        var student = await _db.Students.FindAsync(_studentId);
        student!.SkillLevelOverrides = """{"writing":"B1"}""";
        await _db.SaveChangesAsync();

        await _sut.SoftDeleteAsync(_teacherId, _studentId, sessionId);

        var updatedStudent = await _db.Students.FindAsync(_studentId);
        updatedStudent!.SkillLevelOverrides.Should().Contain("\"writing\"");
        updatedStudent.SkillLevelOverrides.Should().Contain("\"B1\"");
    }

    [Fact]
    public async Task CreateAsync_SetsIsCancelledFromRequest()
    {
        var request = BaseRequest();
        request.IsCancelled = true;

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);

        result.IsCancelled.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateAsync_SetsIsCancelledFromRequest()
    {
        var sessionId = Guid.NewGuid();
        _db.SessionLogs.Add(new SessionLog
        {
            Id = sessionId, StudentId = _studentId, TeacherId = _teacherId,
            SessionDate = DateTime.UtcNow, PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            IsCancelled = false, TopicTags = "[]",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();

        var request = new UpdateSessionLogRequest
        {
            SessionDate = DateTime.UtcNow,
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            IsCancelled = true,
        };

        var result = await _sut.UpdateAsync(_teacherId, _studentId, sessionId, request);

        result.Should().NotBeNull();
        result!.IsCancelled.Should().BeTrue();
    }

    [Fact]
    public async Task CreateAsync_WithVoiceNoteFields_WritesVoiceNoteApplicationRow()
    {
        var voiceNoteId = Guid.NewGuid();
        _db.VoiceNotes.Add(new VoiceNote
        {
            Id = voiceNoteId,
            TeacherId = _teacherId,
            BlobPath = "teachers/test/file.webm",
            OriginalFileName = "file.webm",
            ContentType = "audio/webm",
            SizeBytes = 1024,
            DurationSeconds = 0,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var request = new CreateSessionLogRequest
        {
            SessionDate = new DateTime(2026, 4, 1, 10, 0, 0, DateTimeKind.Utc),
            PreviousHomeworkStatus = HomeworkStatus.Done,
            VoiceNoteId = voiceNoteId,
            VoiceNoteTranscription = "Hoy trabajamos los verbos irregulares",
            RawExtractionJson = "{\"whatWasCovered\":\"verbos irregulares\"}"
        };

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);

        var application = await _db.VoiceNoteApplications
            .SingleAsync(a => a.SessionLogId == result.Id);
        application.VoiceNoteId.Should().Be(voiceNoteId);
        application.Transcription.Should().Be("Hoy trabajamos los verbos irregulares");
        application.RawExtractionJson.Should().Be("{\"whatWasCovered\":\"verbos irregulares\"}");
        application.ApplicationType.Should().Be(ApplicationType.Create);
        application.AppliedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task CreateAsync_WithoutVoiceNoteFields_WritesNoVoiceNoteApplicationRow()
    {
        var result = await _sut.CreateAsync(_teacherId, _studentId, BaseRequest());

        var count = await _db.VoiceNoteApplications
            .CountAsync(a => a.SessionLogId == result.Id);
        count.Should().Be(0);
    }

    [Fact]
    public async Task CreateAsync_VoiceNoteIdBelongsToOtherTeacher_ThrowsKeyNotFoundException()
    {
        var otherVoiceNoteId = Guid.NewGuid();
        _db.VoiceNotes.Add(new VoiceNote
        {
            Id = otherVoiceNoteId,
            TeacherId = _otherTeacherId,
            BlobPath = "teachers/other/file.webm",
            OriginalFileName = "file.webm",
            ContentType = "audio/webm",
            SizeBytes = 512,
            DurationSeconds = 0,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var request = new CreateSessionLogRequest
        {
            SessionDate = new DateTime(2026, 4, 1, 10, 0, 0, DateTimeKind.Utc),
            PreviousHomeworkStatus = HomeworkStatus.Done,
            VoiceNoteId = otherVoiceNoteId
        };

        var act = () => _sut.CreateAsync(_teacherId, _studentId, request);
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreateAsync_TelegramFlow_WritesVoiceNoteApplicationWithNullVoiceNoteId()
    {
        var request = new CreateSessionLogRequest
        {
            SessionDate = new DateTime(2026, 4, 1, 10, 0, 0, DateTimeKind.Utc),
            PreviousHomeworkStatus = HomeworkStatus.Done,
            VoiceNoteTranscription = "Marco hizo los deberes y repasamos el subjuntivo",
            RawExtractionJson = "{\"whatWasCovered\":\"subjuntivo\"}"
        };

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);

        var application = await _db.VoiceNoteApplications
            .SingleAsync(a => a.SessionLogId == result.Id);
        application.VoiceNoteId.Should().BeNull();
        application.Transcription.Should().Be("Marco hizo los deberes y repasamos el subjuntivo");
        application.ApplicationType.Should().Be(ApplicationType.Create);
    }

    // --- Duration and Title ---

    [Fact]
    public async Task CreateAsync_WithDuration_PersistsDuration()
    {
        var request = BaseRequest();
        request.Duration = 60;

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);
        result.Duration.Should().Be(60);
    }

    [Fact]
    public async Task CreateAsync_WithExplicitTitle_PreservesTitle()
    {
        var request = BaseRequest();
        request.Title = "Subjunctive in Time Clauses";

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);
        result.Title.Should().Be("Subjunctive in Time Clauses");
    }

    [Fact]
    public async Task CreateAsync_NullTitle_WithActualContent_GeneratesTitleFromFirstLine()
    {
        var request = BaseRequest();
        request.Title = null;
        request.ActualContent = "Ser vs Estar: discussed key differences\nStudent struggled with copulas";
        request.PlannedContent = null;

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);
        result.Title.Should().Be("Ser vs Estar: discussed key differences");
    }

    [Fact]
    public async Task CreateAsync_NullTitle_PrefersActualContentOverPlanned()
    {
        var request = BaseRequest();
        request.Title = null;
        request.ActualContent = "Actual topic";
        request.PlannedContent = "Planned topic";

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);
        result.Title.Should().Be("Actual topic");
    }

    [Fact]
    public async Task CreateAsync_NullTitle_WithOnlyPlannedContent_GeneratesTitleFromPlanned()
    {
        var request = BaseRequest();
        request.Title = null;
        request.ActualContent = null;
        request.PlannedContent = "Preterite tense review";

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);
        result.Title.Should().Be("Preterite tense review");
    }

    [Fact]
    public async Task CreateAsync_NullTitle_NoContent_WithDate_GeneratesDateFallback()
    {
        var request = BaseRequest();
        request.Title = null;
        request.ActualContent = null;
        request.PlannedContent = null;
        request.SessionDate = new DateTime(2026, 4, 5, 0, 0, 0, DateTimeKind.Utc);

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);
        result.Title.Should().Be("Session, Apr 5");
    }

    [Fact]
    public async Task CreateAsync_NullTitle_NoContent_NoDate_GeneratesUnknownDateFallback()
    {
        var request = BaseRequest();
        request.Title = null;
        request.ActualContent = null;
        request.PlannedContent = null;
        request.SessionDate = null;

        var result = await _sut.CreateAsync(_teacherId, _studentId, request);
        result.Title.Should().Be("Session, unknown date");
    }

    [Fact]
    public async Task UpdateAsync_NullTitle_WithActualContent_AutoGeneratesTitleFromContent()
    {
        var created = await _sut.CreateAsync(_teacherId, _studentId, BaseRequest());

        var update = new UpdateSessionLogRequest
        {
            ActualContent = "Subjunctive in time clauses",
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            Title = null,
        };

        var result = await _sut.UpdateAsync(_teacherId, _studentId, created.Id, update);
        result!.Title.Should().Be("Subjunctive in time clauses");
    }

    [Fact]
    public async Task UpdateAsync_NullTitle_NullContent_FallsBackToEntityContent()
    {
        // Entity has content from create; update clears content but provides no title.
        // Title should be generated from the entity's pre-existing content, not the date.
        var created = await _sut.CreateAsync(_teacherId, _studentId, BaseRequest());

        var update = new UpdateSessionLogRequest
        {
            IsCancelled = true,
            ActualContent = null,
            PlannedContent = null,
            SessionDate = new DateTime(2026, 4, 10, 0, 0, 0, DateTimeKind.Utc),
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            Title = null,
        };

        var result = await _sut.UpdateAsync(_teacherId, _studentId, created.Id, update);
        result!.Title.Should().Be("Covered regular verbs only");
    }

    [Fact]
    public async Task UpdateAsync_NullTitle_NullContentOnEntityToo_GeneratesDateFallback()
    {
        // Entity has no content; update also provides no content or title.
        // Title should fall back to the session date.
        var noContentRequest = new CreateSessionLogRequest
        {
            SessionDate = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc),
            PlannedContent = null,
            ActualContent = null,
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            Title = "Placeholder",
        };
        var created = await _sut.CreateAsync(_teacherId, _studentId, noContentRequest);

        var update = new UpdateSessionLogRequest
        {
            IsCancelled = true,
            ActualContent = null,
            PlannedContent = null,
            SessionDate = new DateTime(2026, 4, 10, 0, 0, 0, DateTimeKind.Utc),
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            Title = null,
        };

        var result = await _sut.UpdateAsync(_teacherId, _studentId, created.Id, update);
        result!.Title.Should().NotBeNull();
        result.Title.Should().StartWith("Session,");
    }

    [Fact]
    public async Task UpdateAsync_WithExplicitTitle_PreservesTitle()
    {
        var created = await _sut.CreateAsync(_teacherId, _studentId, BaseRequest());

        var update = new UpdateSessionLogRequest
        {
            ActualContent = "Something else",
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            Title = "My Custom Title",
        };

        var result = await _sut.UpdateAsync(_teacherId, _studentId, created.Id, update);
        result!.Title.Should().Be("My Custom Title");
    }

    // --- GenerateTitle unit tests ---

    [Theory]
    [InlineData("Short title", null, "Short title")]
    [InlineData("Multiline\nSecond line", null, "Multiline")]
    public void GenerateTitle_ShortFirstLine_ReturnsAsIs(string planned, string? actual, string expected)
    {
        SessionLogService.GenerateTitle(planned, actual, null).Should().Be(expected);
    }

    [Fact]
    public void GenerateTitle_LongFirstLine_TruncatesAtWordBoundary()
    {
        var longLine = "This is a very long session title that exceeds sixty characters in total length here";
        // 60th char is within "characters", last space before 60 is before "characters"
        var result = SessionLogService.GenerateTitle(longLine, null, null);
        (result.Length <= 60).Should().BeTrue("title must fit in 60 chars");
        result.Should().NotEndWith(" ");
    }

    [Fact]
    public void GenerateTitle_NoContent_UsesSessionDateFallback()
    {
        var date = new DateTime(2026, 4, 5, 0, 0, 0, DateTimeKind.Utc);
        SessionLogService.GenerateTitle(null, null, date).Should().Be("Session, Apr 5");
    }

    [Fact]
    public void GenerateTitle_NoContent_NoDate_UsesUnknownDate()
    {
        SessionLogService.GenerateTitle(null, null, null).Should().Be("Session, unknown date");
    }
}

file class NullDifficultyTrendService : IDifficultyTrendService
{
    public Task RecomputeAsync(Guid teacherId, Guid studentId, CancellationToken ct = default)
        => Task.CompletedTask;
}
