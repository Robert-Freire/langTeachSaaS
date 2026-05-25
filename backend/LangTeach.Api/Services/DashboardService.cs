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
        // Groups #1326: NextSession DTO currently assumes a student target.
        // Group sessions are excluded from this card until #1330 ships the group-session UI.
        var next = await _db.SessionLogs
            .Where(sl => sl.TeacherId == teacherId
                      && sl.StudentId != null
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
            lastSessionTopicTags = JsonStorageHelper.DeserializeList<TopicTagEntry>(lastPast.TopicTags)
                .Select(t => t.Tag).Where(t => !string.IsNullOrEmpty(t)).ToList();
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
            StudentId: next.StudentId!.Value,
            StudentName: next.Student!.Name,
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
        // Groups #1326: TodaySessionDto assumes a student target. Group sessions excluded until #1330.
        var sessions = await _db.SessionLogs
            .Where(sl => sl.TeacherId == teacherId
                      && sl.StudentId != null
                      && !sl.IsDeleted
                      && sl.SessionDate.HasValue
                      && sl.SessionDate.Value.Date == today)
            .Include(sl => sl.Student)
            .OrderBy(sl => sl.SessionDate)
            .ToListAsync(cancellationToken);

        return sessions.Select(sl => new TodaySessionDto(
            SessionLogId: sl.Id,
            StudentId: sl.StudentId!.Value,
            StudentName: sl.Student!.Name,
            StudentCefrLevel: sl.Student.CefrLevel,
            SessionDate: sl.SessionDate!.Value,
            PlannedContent: sl.PlannedContent,
            Status: sl.Status.ToString()
        )).ToList();
    }

    private async Task<List<UpcomingSessionDto>> GetUpcomingThisWeekAsync(Guid teacherId, DateTime today, CancellationToken cancellationToken)
    {
        var endOfWeek = today.AddDays(7);

        // Groups #1326: UpcomingSessionDto assumes a student target. Group sessions excluded until #1330.
        var sessions = await _db.SessionLogs
            .Where(sl => sl.TeacherId == teacherId
                      && sl.StudentId != null
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
            StudentId: sl.StudentId!.Value,
            StudentName: sl.Student!.Name,
            StudentCefrLevel: sl.Student.CefrLevel,
            SessionDate: sl.SessionDate!.Value,
            PlannedContent: sl.PlannedContent
        )).ToList();
    }

    public async Task<SessionsListDto> GetSessionsListAsync(Guid teacherId, Guid? studentId, CancellationToken cancellationToken = default)
    {
        var recentCutoff = DateTime.UtcNow.Date.AddDays(-7);

        // Groups #1326: SessionListItemDto assumes a student target. Filter to student sessions only.
        // Group sessions are surfaced via the group route (#1330) and a future Groups sessions list.
        IQueryable<SessionLog> baseQuery = _db.SessionLogs
            .Where(sl => sl.TeacherId == teacherId
                      && sl.StudentId != null
                      && !sl.IsDeleted
                      && sl.SessionDate.HasValue
                      && sl.Student != null && !sl.Student.IsDeleted)
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
            sl.StudentId!.Value,
            sl.Student!.Name,
            sl.Student.CefrLevel,
            sl.SessionDate!.Value,
            sl.PlannedContent,
            sl.IsCancelled ? "Cancelled" : sl.Status.ToString());

    private async Task<List<ActiveStudentDto>> GetActiveStudentsAsync(Guid teacherId, DateTime now, CancellationToken cancellationToken)
    {
        var cutoff30Days = now.AddDays(-30);
        var todayDateOnly = DateOnly.FromDateTime(now);

        // Phase 1a: student rows (todos + metadata).
        var studentRows = await _db.Students
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
                    // Projection matches TeachingTodoDtoProjection.Compiled -- keep in sync.
                    .Select(f => new TeachingTodoDto(
                        f.Id.ToString(), f.Text, f.CreatedAt,
                        f.SourceSessionLogId != null ? f.SourceSessionLogId.ToString() : null,
                        f.Status,
                        f.CoveredInSessionLogId != null ? f.CoveredInSessionLogId.ToString() : null,
                        f.DueDate))
                    .ToList(),
            })
            .ToListAsync(cancellationToken);

        // Phase 1b: group memberships for all active students in one batch.
        // Used below to implement BelongsToStudent without repeating the subquery 5x.
        // Materialize first (EF Core cannot translate ToDictionaryAsync with ToHashSet selector).
        var studentIds = studentRows.Select(r => r.Id).ToList();
        var deletedGroupIds = await _db.Groups
            .Where(g => g.IsDeleted)
            .Select(g => g.Id)
            .ToListAsync(cancellationToken);
        var deletedGroupIdSet = deletedGroupIds.ToHashSet();
        var membershipRows = await _db.StudentGroups
            .Where(sg => studentIds.Contains(sg.StudentId))
            .Select(sg => new { sg.StudentId, sg.GroupId })
            .ToListAsync(cancellationToken);
        var groupIdsByStudent = membershipRows
            .Where(sg => !deletedGroupIdSet.Contains(sg.GroupId))
            .GroupBy(sg => sg.StudentId)
            .ToDictionary(g => g.Key, g => g.Select(x => (Guid?)x.GroupId).ToHashSet());

        // Phase 1c: all non-deleted sessions for this teacher (scoped by teacher, not per-student).
        // In-memory aggregation below uses BelongsToStudent (defined once) instead of the previous
        // 5x inline correlated subquery. Acceptable trade-off: loads ~N rows per teacher vs N*5 SQL
        // round-trips with correlated subqueries per student.
        var sessions = await _db.SessionLogs
            .Where(sl => sl.TeacherId == teacherId && !sl.IsDeleted && sl.SessionDate.HasValue)
            .Select(sl => new { sl.StudentId, sl.GroupId, sl.SessionDate, sl.IsCancelled, sl.PreviousHomeworkStatus })
            .ToListAsync(cancellationToken);

        bool BelongsToStudent(Guid studentId, Guid? groupId)
        {
            if (groupId == null) return false;
            return groupIdsByStudent.TryGetValue(studentId, out var groups) && groups.Contains(groupId);
        }

        return studentRows.Select(r =>
        {
            var objectives = JsonStorageHelper.DeserializeList<ShortTermObjectiveDto>(r.ShortTermObjectives);
            var nearestDeadline = objectives
                .Where(o => o.TargetDate.HasValue && o.TargetDate.Value > todayDateOnly)
                .Select(o => o.TargetDate!.Value.ToDateTime(TimeOnly.MinValue))
                .DefaultIfEmpty()
                .Min();
            DateTime? nearestObjectiveDeadline = nearestDeadline == DateTime.MinValue ? null : nearestDeadline;

            var studentSessions = sessions.Where(sl =>
                sl.StudentId == r.Id || BelongsToStudent(r.Id, sl.GroupId));

            var lastSessionDate = studentSessions
                .Where(sl => sl.SessionDate!.Value < now)
                .Select(sl => (DateTime?)sl.SessionDate!.Value)
                .DefaultIfEmpty(null)
                .Max();

            var nextSessionDate = studentSessions
                .Where(sl => !sl.IsCancelled && sl.SessionDate!.Value > now)
                .Select(sl => (DateTime?)sl.SessionDate!.Value)
                .DefaultIfEmpty(null)
                .Min();

            var totalSessions = studentSessions.Count();

            var cancelledLast30 = studentSessions
                .Count(sl => sl.IsCancelled
                          && sl.SessionDate!.Value >= cutoff30Days
                          && sl.SessionDate!.Value <= now);

            var lastHomeworkStatusRaw = studentSessions
                .Where(sl => sl.SessionDate!.Value < now && sl.PreviousHomeworkStatus != HomeworkStatus.NotApplicable)
                .OrderByDescending(sl => sl.SessionDate)
                .Select(sl => (int?)sl.PreviousHomeworkStatus)
                .FirstOrDefault();

            string? lastHomeworkStatus = lastHomeworkStatusRaw.HasValue
                ? ((HomeworkStatus)lastHomeworkStatusRaw.Value).ToString()
                : null;

            return new ActiveStudentDto(
                StudentId: r.Id,
                Name: r.Name,
                CefrLevel: r.CefrLevel,
                NativeLanguages: JsonStorageHelper.DeserializeList<string>(r.NativeLanguages),
                IsActive: r.IsActive,
                LastSessionDate: lastSessionDate,
                NextSessionDate: nextSessionDate,
                TotalSessions: totalSessions,
                TeachingTodosCount: r.TeachingTodosCount,
                PendingTodos: r.PendingTodos,
                CancelledSessionsLast30Days: cancelledLast30,
                NearestObjectiveDeadline: nearestObjectiveDeadline,
                LastHomeworkStatus: lastHomeworkStatus
            );
        }).ToList();
    }

}
