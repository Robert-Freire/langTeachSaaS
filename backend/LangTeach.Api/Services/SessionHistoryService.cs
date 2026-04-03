using System.Text.Json;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class SessionHistoryService : ISessionHistoryService
{
    private readonly AppDbContext _db;

    public SessionHistoryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<SessionHistoryContext?> BuildContextAsync(
        Guid teacherId,
        Guid studentId,
        DateTime generationDate,
        CancellationToken ct = default)
    {
        var sessions = await _db.SessionLogs
            .Where(sl => sl.TeacherId == teacherId && sl.StudentId == studentId && !sl.IsDeleted)
            .OrderByDescending(sl => sl.SessionDate)
            .Take(5)
            .ToListAsync(ct);

        if (sessions.Count == 0)
            return null;

        var daysSince = Math.Max(0, (generationDate.Date - sessions[0].SessionDate.Date).Days);

        var recentSessions = sessions
            .Take(3)
            .Select(s => new SessionSummaryEntry(s.SessionDate, s.PlannedContent, s.ActualContent))
            .ToList();

        var coveredTopics = AggregateTopicTags(sessions);

        var skillLevelOverrides = await LoadSkillLevelOverridesAsync(teacherId, studentId, ct);

        return new SessionHistoryContext(
            RecentSessions: recentSessions,
            DaysSinceLastSession: daysSince,
            OpenActionItems: sessions[0].NextSessionTopics,
            PendingHomework: sessions[0].HomeworkAssigned,
            LastHomeworkStatus: sessions[0].PreviousHomeworkStatus,
            CoveredTopics: coveredTopics,
            SkillLevelOverrides: skillLevelOverrides
        );
    }

    private static IReadOnlyList<CoveredTopicEntry> AggregateTopicTags(List<SessionLog> sessions)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var result = new List<CoveredTopicEntry>();

        foreach (var session in sessions)
        {
            if (string.IsNullOrWhiteSpace(session.TopicTags) || session.TopicTags == "[]")
                continue;

            try
            {
                var tags = JsonSerializer.Deserialize<List<TopicTagEntry>>(session.TopicTags,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (tags is null) continue;

                foreach (var tag in tags)
                {
                    if (string.IsNullOrWhiteSpace(tag.Tag)) continue;
                    if (!seen.Add(tag.Tag.Trim())) continue;
                    result.Add(new CoveredTopicEntry(tag.Tag.Trim(), tag.Category));
                }
            }
            catch (JsonException)
            {
                // malformed TopicTags — skip silently
            }
        }

        return result;
    }

    private async Task<IReadOnlyDictionary<string, string>> LoadSkillLevelOverridesAsync(
        Guid teacherId, Guid studentId, CancellationToken ct)
    {
        var overridesJson = await _db.Students
            .Where(s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted)
            .Select(s => s.SkillLevelOverrides)
            .FirstOrDefaultAsync(ct);

        if (string.IsNullOrWhiteSpace(overridesJson) || overridesJson == "{}")
            return new Dictionary<string, string>();

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(overridesJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? new Dictionary<string, string>();
        }
        catch (JsonException)
        {
            return new Dictionary<string, string>();
        }
    }

    private sealed record TopicTagEntry(string Tag, string? Category);
}
