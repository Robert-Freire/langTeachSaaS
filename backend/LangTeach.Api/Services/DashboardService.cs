using System.Text.Json;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;
    private readonly ITeacherFollowupService _followupService;
    private readonly ILogger<DashboardService> _logger;

    public DashboardService(AppDbContext db, ITeacherFollowupService followupService, ILogger<DashboardService> logger)
    {
        _db = db;
        _followupService = followupService;
        _logger = logger;
    }

    public async Task<DashboardDto> GetAsync(Guid teacherId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;

        var nextSession = await GetNextSessionAsync(teacherId, now, cancellationToken);
        var todaySessions = await GetTodaySessionsAsync(teacherId, today, cancellationToken);
        var activeStudents = await GetActiveStudentsAsync(teacherId, now, cancellationToken);
        var pendingFollowups = await _followupService.GetPendingAsync(teacherId, cancellationToken);
        var upcomingThisWeek = await GetUpcomingThisWeekAsync(teacherId, today, cancellationToken);

        return new DashboardDto(nextSession, todaySessions, activeStudents, pendingFollowups, upcomingThisWeek);
    }

    private async Task<NextSessionDto?> GetNextSessionAsync(Guid teacherId, DateTime now, CancellationToken cancellationToken)
    {
        var next = await _db.SessionLogs
            .Where(sl => sl.TeacherId == teacherId
                      && !sl.IsDeleted
                      && !sl.IsCancelled
                      && sl.SessionDate.HasValue
                      && sl.SessionDate.Value > now)
            .Include(sl => sl.Student)
            .OrderBy(sl => sl.SessionDate)
            .FirstOrDefaultAsync(cancellationToken);

        if (next is null)
            return null;

        var lastPast = await _db.SessionLogs
            .Where(sl => sl.StudentId == next.StudentId
                      && sl.TeacherId == teacherId
                      && !sl.IsDeleted
                      && sl.SessionDate.HasValue
                      && sl.SessionDate.Value < now)
            .OrderByDescending(sl => sl.SessionDate)
            .FirstOrDefaultAsync(cancellationToken);

        List<string> lastSessionTopicTags = [];
        if (lastPast is not null)
        {
            try
            {
                lastSessionTopicTags = (JsonSerializer.Deserialize<List<TopicTagEntry>>(lastPast.TopicTags) ?? [])
                    .Select(t => t.Tag).ToList();
            }
            catch (JsonException)
            {
                _logger.LogWarning("Failed to deserialize TopicTags for session {SessionId}", lastPast.Id);
            }
        }

        var lastSessionFollowups = lastPast is not null
            ? await _db.TeacherFollowups
                .Where(f => f.SourceSessionLogId == lastPast.Id && f.Status != "done")
                .Select(f => f.Text)
                .ToListAsync(cancellationToken)
            : [];

        var totalSessionCount = await _db.SessionLogs
            .CountAsync(sl => sl.StudentId == next.StudentId
                           && sl.TeacherId == teacherId
                           && !sl.IsDeleted
                           && !sl.IsCancelled
                           && sl.Status == SessionLogStatus.Confirmed
                           && sl.SessionDate.HasValue
                           && sl.SessionDate.Value <= now,
                cancellationToken);

        return new NextSessionDto(
            SessionLogId: next.Id,
            StudentId: next.StudentId,
            StudentName: next.Student.Name,
            StudentCefrLevel: next.Student.CefrLevel,
            SessionDate: next.SessionDate!.Value,
            PlannedContent: next.PlannedContent,
            LastSessionNotes: lastPast?.GeneralNotes,
            LastSessionDate: lastPast?.SessionDate,
            HomeworkAssigned: next.HomeworkAssigned,
            PreviousHomeworkStatus: next.PreviousHomeworkStatus.ToString(),
            LastSessionTopicTags: lastSessionTopicTags,
            LastSessionHomework: lastPast?.HomeworkAssigned,
            LastSessionFollowups: lastSessionFollowups,
            TeachingLanguage: string.IsNullOrWhiteSpace(next.Student.LearningLanguage) ? null : next.Student.LearningLanguage,
            TotalSessionCount: totalSessionCount
        );
    }

    private async Task<List<TodaySessionDto>> GetTodaySessionsAsync(Guid teacherId, DateTime today, CancellationToken cancellationToken)
    {
        var sessions = await _db.SessionLogs
            .Where(sl => sl.TeacherId == teacherId
                      && !sl.IsDeleted
                      && sl.SessionDate.HasValue
                      && sl.SessionDate.Value.Date == today)
            .Include(sl => sl.Student)
            .OrderBy(sl => sl.SessionDate)
            .ToListAsync(cancellationToken);

        return sessions.Select(sl => new TodaySessionDto(
            SessionLogId: sl.Id,
            StudentId: sl.StudentId,
            StudentName: sl.Student.Name,
            StudentCefrLevel: sl.Student.CefrLevel,
            SessionDate: sl.SessionDate!.Value,
            PlannedContent: sl.PlannedContent,
            Status: sl.Status.ToString()
        )).ToList();
    }

    private async Task<List<UpcomingSessionDto>> GetUpcomingThisWeekAsync(Guid teacherId, DateTime today, CancellationToken cancellationToken)
    {
        var endOfWeek = today.AddDays(7);

        var sessions = await _db.SessionLogs
            .Where(sl => sl.TeacherId == teacherId
                      && !sl.IsDeleted
                      && !sl.IsCancelled
                      && sl.SessionDate.HasValue
                      && sl.SessionDate.Value.Date > today
                      && sl.SessionDate.Value.Date <= endOfWeek)
            .Include(sl => sl.Student)
            .OrderBy(sl => sl.SessionDate)
            .Take(5)
            .ToListAsync(cancellationToken);

        return sessions.Select(sl => new UpcomingSessionDto(
            SessionLogId: sl.Id,
            StudentId: sl.StudentId,
            StudentName: sl.Student.Name,
            StudentCefrLevel: sl.Student.CefrLevel,
            SessionDate: sl.SessionDate!.Value,
            PlannedContent: sl.PlannedContent
        )).ToList();
    }

    public async Task<SessionsListDto> GetSessionsListAsync(Guid teacherId, Guid? studentId, CancellationToken cancellationToken = default)
    {
        var recentCutoff = DateTime.UtcNow.Date.AddDays(-7);

        IQueryable<SessionLog> baseQuery = _db.SessionLogs
            .Where(sl => sl.TeacherId == teacherId
                      && !sl.IsDeleted
                      && sl.SessionDate.HasValue
                      && !sl.Student.IsDeleted)
            .Include(sl => sl.Student);

        if (studentId.HasValue)
            baseQuery = baseQuery.Where(sl => sl.StudentId == studentId.Value);

        var today = DateTime.UtcNow.Date;

        var upcomingRaw = await baseQuery
            .Where(sl => !sl.IsCancelled && sl.SessionDate!.Value.Date > today)
            .OrderBy(sl => sl.SessionDate)
            .ToListAsync(cancellationToken);

        var todaySessionsRaw = await baseQuery
            .Where(sl => sl.SessionDate!.Value.Date == today)
            .OrderBy(sl => sl.SessionDate)
            .ToListAsync(cancellationToken);

        var recentRaw = await baseQuery
            .Where(sl => sl.SessionDate!.Value >= recentCutoff
                      && sl.SessionDate!.Value.Date < today)
            .OrderByDescending(sl => sl.SessionDate)
            .ToListAsync(cancellationToken);

        var students = await _db.Students
            .Where(s => s.TeacherId == teacherId && !s.IsDeleted)
            .OrderBy(s => s.Name)
            .Select(s => new SessionFilterStudentDto(s.Id, s.Name, s.CefrLevel))
            .ToListAsync(cancellationToken);

        return new SessionsListDto(
            upcomingRaw.Select(MapToSessionListItem).ToList(),
            todaySessionsRaw.Select(MapToSessionListItem).ToList(),
            recentRaw.Select(MapToSessionListItem).ToList(),
            students);
    }

    private static SessionListItemDto MapToSessionListItem(SessionLog sl) =>
        new(
            sl.Id,
            sl.StudentId,
            sl.Student.Name,
            sl.Student.CefrLevel,
            sl.SessionDate!.Value,
            sl.PlannedContent,
            sl.IsCancelled ? "Cancelled" : sl.Status.ToString());

    private async Task<List<ActiveStudentDto>> GetActiveStudentsAsync(Guid teacherId, DateTime now, CancellationToken cancellationToken)
    {
        var cutoff30Days = now.AddDays(-30);

        var rows = await _db.Students
            .Where(s => s.TeacherId == teacherId && !s.IsDeleted && s.IsActive)
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.CefrLevel,
                s.NativeLanguages,
                s.IsActive,
                s.ShortTermObjectives,
                TeachingTodosCount = s.TeacherFollowups.Count(f => f.Kind == TeacherFollowupKinds.Pedagogical),
                PendingTodos = s.TeacherFollowups
                    .Where(f => f.Kind == TeacherFollowupKinds.Pedagogical && f.Status == "pending")
                    .OrderBy(f => f.CreatedAt)
                    // Projection matches TeachingTodoDtoProjection.Compiled — keep in sync.
                    .Select(f => new TeachingTodoDto(
                        f.Id.ToString(), f.Text, f.CreatedAt,
                        f.SourceSessionLogId != null ? f.SourceSessionLogId.ToString() : null,
                        f.Status,
                        f.CoveredInSessionLogId != null ? f.CoveredInSessionLogId.ToString() : null))
                    .ToList(),
                LastSessionDate = s.SessionLogs
                    .Where(sl => !sl.IsDeleted && sl.SessionDate.HasValue && sl.SessionDate.Value < now)
                    .Max(sl => (DateTime?)sl.SessionDate),
                NextSessionDate = s.SessionLogs
                    .Where(sl => !sl.IsDeleted && !sl.IsCancelled && sl.SessionDate.HasValue && sl.SessionDate.Value > now)
                    .Min(sl => (DateTime?)sl.SessionDate),
                TotalSessions = s.SessionLogs.Count(sl => !sl.IsDeleted),
                CancelledSessionsLast30Days = s.SessionLogs
                    .Count(sl => !sl.IsDeleted
                              && sl.IsCancelled
                              && sl.SessionDate.HasValue
                              && sl.SessionDate.Value >= cutoff30Days
                              && sl.SessionDate.Value <= now),
                LastHomeworkStatusRaw = s.SessionLogs
                    .Where(sl => !sl.IsDeleted
                              && sl.SessionDate.HasValue
                              && sl.SessionDate.Value < now
                              && sl.PreviousHomeworkStatus != HomeworkStatus.NotApplicable)
                    .OrderByDescending(sl => sl.SessionDate)
                    .Select(sl => (int?)sl.PreviousHomeworkStatus)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        var todayDateOnly = DateOnly.FromDateTime(now);

        return rows.Select(r =>
        {
            // NearestObjectiveDeadline: earliest future targetDate from ShortTermObjectives JSON
            // DefaultIfEmpty() on empty sequence returns DateTime.MinValue — treated as null below
            var objectives = JsonStorageHelper.DeserializeList<ShortTermObjectiveDto>(r.ShortTermObjectives);
            var nearestDeadline = objectives
                .Where(o => o.TargetDate.HasValue && o.TargetDate.Value > todayDateOnly)
                .Select(o => o.TargetDate!.Value.ToDateTime(TimeOnly.MinValue))
                .DefaultIfEmpty()
                .Min();
            DateTime? nearestObjectiveDeadline = nearestDeadline == DateTime.MinValue ? null : nearestDeadline;

            string? lastHomeworkStatus = r.LastHomeworkStatusRaw.HasValue
                ? ((HomeworkStatus)r.LastHomeworkStatusRaw.Value).ToString()
                : null;

            return new ActiveStudentDto(
                StudentId: r.Id,
                Name: r.Name,
                CefrLevel: r.CefrLevel,
                NativeLanguages: JsonStorageHelper.DeserializeList<string>(r.NativeLanguages),
                IsActive: r.IsActive,
                LastSessionDate: r.LastSessionDate,
                NextSessionDate: r.NextSessionDate,
                TotalSessions: r.TotalSessions,
                TeachingTodosCount: r.TeachingTodosCount,
                PendingTodos: r.PendingTodos,
                CancelledSessionsLast30Days: r.CancelledSessionsLast30Days,
                NearestObjectiveDeadline: nearestObjectiveDeadline,
                LastHomeworkStatus: lastHomeworkStatus
            );
        }).ToList();
    }

}
