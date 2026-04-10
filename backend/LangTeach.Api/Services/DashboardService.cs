using System.Text.Json;
using LangTeach.Api.Data;
using LangTeach.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;
    private readonly ILogger<DashboardService> _logger;

    private static readonly JsonSerializerOptions JsonOptions =
        new() { PropertyNameCaseInsensitive = true };

    public DashboardService(AppDbContext db, ILogger<DashboardService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<DashboardDto> GetAsync(Guid teacherId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;

        var nextSession = await GetNextSessionAsync(teacherId, now, cancellationToken);
        var todaySessions = await GetTodaySessionsAsync(teacherId, today, cancellationToken);
        var activeStudents = await GetActiveStudentsAsync(teacherId, now, cancellationToken);

        return new DashboardDto(nextSession, todaySessions, activeStudents);
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
            PreviousHomeworkStatus: next.PreviousHomeworkStatus.ToString()
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

    private async Task<List<ActiveStudentDto>> GetActiveStudentsAsync(Guid teacherId, DateTime now, CancellationToken cancellationToken)
    {
        var rows = await _db.Students
            .Where(s => s.TeacherId == teacherId && !s.IsDeleted && s.IsActive)
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.CefrLevel,
                s.NativeLanguages,
                s.IsActive,
                s.TeachingTodos,
                LastSessionDate = s.SessionLogs
                    .Where(sl => !sl.IsDeleted && sl.SessionDate.HasValue && sl.SessionDate.Value < now)
                    .Max(sl => (DateTime?)sl.SessionDate),
                NextSessionDate = s.SessionLogs
                    .Where(sl => !sl.IsDeleted && !sl.IsCancelled && sl.SessionDate.HasValue && sl.SessionDate.Value > now)
                    .Min(sl => (DateTime?)sl.SessionDate),
                TotalSessions = s.SessionLogs.Count(sl => !sl.IsDeleted)
            })
            .ToListAsync(cancellationToken);

        return rows.Select(r => new ActiveStudentDto(
            StudentId: r.Id,
            Name: r.Name,
            CefrLevel: r.CefrLevel,
            NativeLanguages: DeserializeStringList(r.NativeLanguages),
            IsActive: r.IsActive,
            LastSessionDate: r.LastSessionDate,
            NextSessionDate: r.NextSessionDate,
            TotalSessions: r.TotalSessions,
            TeachingTodosCount: CountJsonArray(r.TeachingTodos)
        )).ToList();
    }

    private List<string> DeserializeStringList(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json, JsonOptions) ?? [];
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize string list from JSON: {Json}", json);
            return [];
        }
    }

    private int CountJsonArray(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<JsonElement>>(json, JsonOptions)?.Count ?? 0;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to count JSON array: {Json}", json);
            return 0;
        }
    }
}
