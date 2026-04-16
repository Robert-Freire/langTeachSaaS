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
        var followupService = new TeacherFollowupService(_db);
        _sut = new DashboardService(_db, followupService, NullLogger<DashboardService>.Instance);

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

    private SessionLog MakeSession(Guid studentId, DateTime? sessionDate, bool isCancelled = false, bool isDeleted = false, string? generalNotes = null, string? plannedContent = null,
        HomeworkStatus previousHomeworkStatus = HomeworkStatus.NotApplicable, string? homeworkAssigned = null)
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
            PreviousHomeworkStatus = previousHomeworkStatus,
            HomeworkAssigned = homeworkAssigned,
            Status = SessionLogStatus.Confirmed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

    private void SetStudentObjectives(Guid studentId, string shortTermObjectivesJson)
    {
        var student = _db.Students.Find(studentId)!;
        student.ShortTermObjectives = shortTermObjectivesJson;
        _db.SaveChanges();
    }

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

    [Fact]
    public async Task GetAsync_CancelledSessions_CountsOnlyLast30DaysPastSessions()
    {
        var within30Days = DateTime.UtcNow.AddDays(-10);
        var within30DaysAlso = DateTime.UtcNow.AddDays(-25);
        var olderThan30Days = DateTime.UtcNow.AddDays(-35);
        var futureCancelled = DateTime.UtcNow.AddDays(5); // future — should NOT count

        _db.SessionLogs.Add(MakeSession(_studentId, within30Days, isCancelled: true));
        _db.SessionLogs.Add(MakeSession(_studentId, within30DaysAlso, isCancelled: true));
        _db.SessionLogs.Add(MakeSession(_studentId, olderThan30Days, isCancelled: true));
        _db.SessionLogs.Add(MakeSession(_studentId, futureCancelled, isCancelled: true));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.ActiveStudents.Should().HaveCount(1);
        result.ActiveStudents[0].CancelledSessionsLast30Days.Should().Be(2);
    }

    [Fact]
    public async Task GetAsync_DeletedCancelledSessions_NotCounted()
    {
        var within30Days = DateTime.UtcNow.AddDays(-5);

        _db.SessionLogs.Add(MakeSession(_studentId, within30Days, isCancelled: true, isDeleted: true));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.ActiveStudents[0].CancelledSessionsLast30Days.Should().Be(0);
    }

    // GetSessionsListAsync tests

    [Fact]
    public async Task GetSessionsListAsync_NoSessions_ReturnsEmptySectionsAndStudentList()
    {
        var result = await _sut.GetSessionsListAsync(_teacherId, null);

        result.Upcoming.Should().BeEmpty();
        result.Today.Should().BeEmpty();
        result.Recent.Should().BeEmpty();
        result.Students.Should().HaveCount(1);
        result.Students[0].Name.Should().Be("Ana García");
    }

    [Fact]
    public async Task GetSessionsListAsync_FutureSession_AppearsInUpcoming()
    {
        var future = DateTime.UtcNow.AddDays(2);
        _db.SessionLogs.Add(MakeSession(_studentId, future, plannedContent: "Subjunctive"));
        _db.SaveChanges();

        var result = await _sut.GetSessionsListAsync(_teacherId, null);

        result.Upcoming.Should().HaveCount(1);
        result.Upcoming[0].StudentId.Should().Be(_studentId);
        result.Upcoming[0].StudentCefrLevel.Should().Be("B1");
        result.Upcoming[0].PlannedContent.Should().Be("Subjunctive");
        result.Upcoming[0].Status.Should().Be("Confirmed");
        result.Today.Should().BeEmpty();
        result.Recent.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSessionsListAsync_CancelledFutureSession_ExcludedFromUpcoming()
    {
        var future = DateTime.UtcNow.AddDays(2);
        _db.SessionLogs.Add(MakeSession(_studentId, future, isCancelled: true));
        _db.SaveChanges();

        var result = await _sut.GetSessionsListAsync(_teacherId, null);

        result.Upcoming.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSessionsListAsync_TodaySession_AppearsInToday()
    {
        var todayMidMorning = DateTime.UtcNow.Date.AddHours(10);
        _db.SessionLogs.Add(MakeSession(_studentId, todayMidMorning));
        _db.SaveChanges();

        var result = await _sut.GetSessionsListAsync(_teacherId, null);

        result.Today.Should().HaveCount(1);
        result.Today[0].StudentId.Should().Be(_studentId);
        result.Upcoming.Should().BeEmpty();
        result.Recent.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSessionsListAsync_LaterTodaySession_AppearsOnlyInToday_NotUpcoming()
    {
        // Sessions later today should be in Today, not Upcoming (buckets must be disjoint)
        var laterToday = DateTime.UtcNow.Date.AddHours(22);
        _db.SessionLogs.Add(MakeSession(_studentId, laterToday));
        _db.SaveChanges();

        var result = await _sut.GetSessionsListAsync(_teacherId, null);

        result.Today.Should().HaveCount(1);
        result.Upcoming.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSessionsListAsync_SoftDeletedStudent_ExcludedFromSections()
    {
        var deletedStudentId = Guid.NewGuid();
        _db.Students.Add(new Student
        {
            Id = deletedStudentId,
            TeacherId = _teacherId,
            Name = "Deleted Student",
            LearningLanguage = "Spanish",
            CefrLevel = "B2",
            NativeLanguages = "[]",
            TeachingTodos = "[]",
            IsActive = false,
            IsDeleted = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SessionLogs.Add(MakeSession(deletedStudentId, DateTime.UtcNow.AddDays(2)));
        _db.SaveChanges();

        var result = await _sut.GetSessionsListAsync(_teacherId, null);

        result.Upcoming.Should().BeEmpty();
        result.Students.Should().NotContain(s => s.Name == "Deleted Student");
    }

    [Fact]
    public async Task GetSessionsListAsync_PastSessionWithin7Days_AppearsInRecent()
    {
        var recent = DateTime.UtcNow.AddDays(-3);
        _db.SessionLogs.Add(MakeSession(_studentId, recent));
        _db.SaveChanges();

        var result = await _sut.GetSessionsListAsync(_teacherId, null);

        result.Recent.Should().HaveCount(1);
        result.Recent[0].StudentId.Should().Be(_studentId);
        result.Upcoming.Should().BeEmpty();
        result.Today.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSessionsListAsync_SessionOlderThan7Days_ExcludedFromRecent()
    {
        var old = DateTime.UtcNow.AddDays(-10);
        _db.SessionLogs.Add(MakeSession(_studentId, old));
        _db.SaveChanges();

        var result = await _sut.GetSessionsListAsync(_teacherId, null);

        result.Recent.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSessionsListAsync_StudentIdFilter_NarrowsAllSections()
    {
        var otherId = Guid.NewGuid();
        _db.Students.Add(new Student
        {
            Id = otherId,
            TeacherId = _teacherId,
            Name = "Other Student",
            LearningLanguage = "Spanish",
            CefrLevel = "A2",
            NativeLanguages = "[]",
            TeachingTodos = "[]",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SessionLogs.Add(MakeSession(_studentId, DateTime.UtcNow.AddDays(2)));
        _db.SessionLogs.Add(MakeSession(otherId, DateTime.UtcNow.AddDays(3)));
        _db.SaveChanges();

        var result = await _sut.GetSessionsListAsync(_teacherId, _studentId);

        result.Upcoming.Should().HaveCount(1);
        result.Upcoming[0].StudentId.Should().Be(_studentId);
    }

    // GetAsync new fields: LastSessionTopicTags, LastSessionHomework, LastSessionFollowups

    [Fact]
    public async Task GetAsync_FutureSessionWithPastSession_PopulatesLastSessionTopicTags()
    {
        var past = DateTime.UtcNow.AddDays(-7);
        var future = DateTime.UtcNow.AddDays(1);
        var pastSession = MakeSession(_studentId, past);
        pastSession.TopicTags = "[{\"Tag\":\"Subjuntivo\",\"Category\":null},{\"Tag\":\"Concesivas\",\"Category\":null}]";
        _db.SessionLogs.Add(pastSession);
        _db.SessionLogs.Add(MakeSession(_studentId, future));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.NextSession!.LastSessionTopicTags.Should().Equal("Subjuntivo", "Concesivas");
    }

    [Fact]
    public async Task GetAsync_FutureSessionWithPastSession_PopulatesLastSessionHomework()
    {
        var past = DateTime.UtcNow.AddDays(-7);
        var future = DateTime.UtcNow.AddDays(1);
        var pastSession = MakeSession(_studentId, past);
        pastSession.HomeworkAssigned = "Redacción mi ciudad ideal";
        _db.SessionLogs.Add(pastSession);
        _db.SessionLogs.Add(MakeSession(_studentId, future));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.NextSession!.LastSessionHomework.Should().Be("Redacción mi ciudad ideal");
    }

    [Fact]
    public async Task GetAsync_FutureSessionWithPastSession_PopulatesPendingFollowupsFromPastSession()
    {
        var past = DateTime.UtcNow.AddDays(-7);
        var future = DateTime.UtcNow.AddDays(1);
        var pastSession = MakeSession(_studentId, past);
        _db.SessionLogs.Add(pastSession);
        _db.SessionLogs.Add(MakeSession(_studentId, future));
        _db.TeacherFollowups.Add(new TeacherFollowup
        {
            Id = Guid.NewGuid(),
            TeacherId = _teacherId,
            Text = "Prometí ejercicios de por/para",
            Status = "pending",
            SourceSessionLogId = pastSession.Id,
            CreatedAt = DateTime.UtcNow,
        });
        _db.TeacherFollowups.Add(new TeacherFollowup
        {
            Id = Guid.NewGuid(),
            TeacherId = _teacherId,
            Text = "Already done promise",
            Status = "done",
            SourceSessionLogId = pastSession.Id,
            CreatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.NextSession!.LastSessionFollowups.Should().ContainSingle().Which.Should().Be("Prometí ejercicios de por/para");
    }

    [Fact]
    public async Task GetAsync_NoLastSession_LastSessionFieldsAreEmpty()
    {
        var future = DateTime.UtcNow.AddDays(1);
        _db.SessionLogs.Add(MakeSession(_studentId, future));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.NextSession!.LastSessionTopicTags.Should().BeEmpty();
        result.NextSession.LastSessionHomework.Should().BeNull();
        result.NextSession.LastSessionFollowups.Should().BeEmpty();
    }

    // GetAsync new field: UpcomingThisWeek

    [Fact]
    public async Task GetAsync_SessionsThisWeek_ReturnedInUpcomingThisWeek()
    {
        var tomorrow = DateTime.UtcNow.Date.AddDays(1).AddHours(10);
        var inFiveDays = DateTime.UtcNow.Date.AddDays(5).AddHours(10);
        _db.SessionLogs.Add(MakeSession(_studentId, tomorrow));
        _db.SessionLogs.Add(MakeSession(_studentId, inFiveDays));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.UpcomingThisWeek.Should().HaveCount(2);
        result.UpcomingThisWeek[0].SessionDate.Should().BeCloseTo(tomorrow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task GetAsync_SessionBeyond7Days_ExcludedFromUpcomingThisWeek()
    {
        var inTenDays = DateTime.UtcNow.Date.AddDays(10).AddHours(10);
        _db.SessionLogs.Add(MakeSession(_studentId, inTenDays));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.UpcomingThisWeek.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAsync_CancelledSessionThisWeek_ExcludedFromUpcomingThisWeek()
    {
        var tomorrow = DateTime.UtcNow.Date.AddDays(1).AddHours(10);
        _db.SessionLogs.Add(MakeSession(_studentId, tomorrow, isCancelled: true));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.UpcomingThisWeek.Should().BeEmpty();
    }

    // NearestObjectiveDeadline tests

    [Fact]
    public async Task GetAsync_StudentWithNoObjectives_NearestDeadlineIsNull()
    {
        SetStudentObjectives(_studentId, "[]");

        var result = await _sut.GetAsync(_teacherId);

        result.ActiveStudents[0].NearestObjectiveDeadline.Should().BeNull();
    }

    [Fact]
    public async Task GetAsync_StudentWithOnlyPastObjectives_NearestDeadlineIsNull()
    {
        var yesterday = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");
        SetStudentObjectives(_studentId, $"[{{\"id\":\"o1\",\"text\":\"Past exam\",\"targetDate\":\"{yesterday}\"}}]");

        var result = await _sut.GetAsync(_teacherId);

        result.ActiveStudents[0].NearestObjectiveDeadline.Should().BeNull();
    }

    [Fact]
    public async Task GetAsync_StudentWithFutureObjective_NearestDeadlineSet()
    {
        var in30Days = DateTime.UtcNow.AddDays(30).Date;
        var dateStr = in30Days.ToString("yyyy-MM-dd");
        SetStudentObjectives(_studentId, $"[{{\"id\":\"o1\",\"text\":\"Upcoming exam\",\"targetDate\":\"{dateStr}\"}}]");

        var result = await _sut.GetAsync(_teacherId);

        result.ActiveStudents[0].NearestObjectiveDeadline.Should().NotBeNull();
        result.ActiveStudents[0].NearestObjectiveDeadline!.Value.Date.Should().Be(in30Days);
    }

    [Fact]
    public async Task GetAsync_StudentWithMultipleObjectives_ReturnsEarliest()
    {
        var in10Days = DateTime.UtcNow.AddDays(10).Date;
        var in30Days = DateTime.UtcNow.AddDays(30).Date;
        SetStudentObjectives(_studentId,
            $"[{{\"id\":\"o1\",\"text\":\"Later exam\",\"targetDate\":\"{in30Days:yyyy-MM-dd}\"}}," +
            $"{{\"id\":\"o2\",\"text\":\"Sooner exam\",\"targetDate\":\"{in10Days:yyyy-MM-dd}\"}}]");

        var result = await _sut.GetAsync(_teacherId);

        result.ActiveStudents[0].NearestObjectiveDeadline!.Value.Date.Should().Be(in10Days);
    }

    // LastHomeworkStatus tests

    [Fact]
    public async Task GetAsync_NoSessions_LastHomeworkStatusIsNull()
    {
        var result = await _sut.GetAsync(_teacherId);

        result.ActiveStudents[0].LastHomeworkStatus.Should().BeNull();
    }

    [Fact]
    public async Task GetAsync_AllSessionsHomeworkNotApplicable_LastHomeworkStatusIsNull()
    {
        _db.SessionLogs.Add(MakeSession(_studentId, DateTime.UtcNow.AddDays(-7),
            previousHomeworkStatus: HomeworkStatus.NotApplicable,
            homeworkAssigned: "Worksheet 3"));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.ActiveStudents[0].LastHomeworkStatus.Should().BeNull();
    }

    [Fact]
    public async Task GetAsync_MostRecentSessionHomeworkDone_ReturnsDone()
    {
        _db.SessionLogs.Add(MakeSession(_studentId, DateTime.UtcNow.AddDays(-7),
            previousHomeworkStatus: HomeworkStatus.Done,
            homeworkAssigned: "Write 8 sentences"));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.ActiveStudents[0].LastHomeworkStatus.Should().Be("Done");
    }

    [Fact]
    public async Task GetAsync_MostRecentSessionHomeworkPartial_ReturnsPartial()
    {
        _db.SessionLogs.Add(MakeSession(_studentId, DateTime.UtcNow.AddDays(-7),
            previousHomeworkStatus: HomeworkStatus.Partial,
            homeworkAssigned: "Reading exercise"));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.ActiveStudents[0].LastHomeworkStatus.Should().Be("Partial");
    }

    [Fact]
    public async Task GetAsync_MostRecentSessionHomeworkNotDone_ReturnsNotDone()
    {
        _db.SessionLogs.Add(MakeSession(_studentId, DateTime.UtcNow.AddDays(-7),
            previousHomeworkStatus: HomeworkStatus.NotDone,
            homeworkAssigned: "Essay draft"));
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.ActiveStudents[0].LastHomeworkStatus.Should().Be("NotDone");
    }

    [Fact]
    public async Task GetAsync_MultipleSessions_LastHomeworkStatusFromMostRecent()
    {
        _db.SessionLogs.AddRange(
            MakeSession(_studentId, DateTime.UtcNow.AddDays(-14),
                previousHomeworkStatus: HomeworkStatus.Done,
                homeworkAssigned: "Exercise A"),
            MakeSession(_studentId, DateTime.UtcNow.AddDays(-7),
                previousHomeworkStatus: HomeworkStatus.NotDone,
                homeworkAssigned: "Exercise B")
        );
        _db.SaveChanges();

        var result = await _sut.GetAsync(_teacherId);

        result.ActiveStudents[0].LastHomeworkStatus.Should().Be("NotDone");
    }
}
