using LangTeach.Api.Data;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class DifficultyTrendService : IDifficultyTrendService
{
    private readonly AppDbContext _db;
    private readonly ILogger<DifficultyTrendService> _logger;

    public DifficultyTrendService(AppDbContext db, ILogger<DifficultyTrendService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task RecomputeAsync(Guid teacherId, Guid studentId, CancellationToken ct = default)
    {
        var student = await _db.Students
            .FirstOrDefaultAsync(s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted, ct);

        if (student is null)
            return;

        var difficulties = JsonStorageHelper.DeserializeList<DifficultyDto>(student.Difficulties);
        if (difficulties.Count == 0)
            return;

        // Load all non-deleted, non-cancelled session logs ordered chronologically.
        // Nulls (no date) sort before dated entries; among dated, ascending.
        var sessionLogs = await _db.SessionLogs
            .Where(sl => sl.StudentId == studentId && sl.TeacherId == teacherId && !sl.IsDeleted && !sl.IsCancelled)
            .OrderBy(sl => sl.SessionDate.HasValue)
            .ThenBy(sl => sl.SessionDate)
            .ToListAsync(ct);

        // Parse the mentioned pairs from each session log (list of (competency, subcategory) pairs).
        var sessionMentions = sessionLogs
            .Select(sl => ParsePairs(sl.MentionedDifficultyPairs))
            .ToList();

        var updated = difficulties.Select(d =>
        {
            var key = (d.Competency.ToLowerInvariant(), d.Subcategory.ToLowerInvariant());
            var appearedInSession = sessionMentions
                .Select(mentions => mentions.Contains(key))
                .ToList();

            var trend = ComputeTrend(d.Status, appearedInSession);
            return d with { Trend = trend };
        }).ToList();

        student.Difficulties = JsonStorageHelper.Serialize(updated);
        student.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Recomputed difficulty trends for Student {StudentId}", studentId);
    }

    private static string ComputeTrend(string status, List<bool> appearedInSession)
    {
        if (appearedInSession.Count == 0)
            return "stable";

        // improving: status = Covered AND pair did NOT appear in last 2 confirmed session logs
        if (string.Equals(status, "Covered", StringComparison.OrdinalIgnoreCase))
        {
            var last2 = appearedInSession.TakeLast(2).ToList();
            if (last2.All(appeared => !appeared))
                return "improving";
            return "stable";
        }

        // worsening: pair appeared in 3 or more consecutive sessions from the end
        var consecutiveFromEnd = CountTrailingTrue(appearedInSession);
        if (consecutiveFromEnd >= 3)
            return "worsening";

        return "stable";
    }

    private static int CountTrailingTrue(List<bool> list)
    {
        int count = 0;
        for (int i = list.Count - 1; i >= 0; i--)
        {
            if (!list[i]) break;
            count++;
        }
        return count;
    }

    private static HashSet<(string, string)> ParsePairs(string json)
    {
        try
        {
            var pairs = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(json);
            if (pairs is null) return [];

            var result = new HashSet<(string, string)>();
            foreach (var el in pairs)
            {
                var competency = el.TryGetProperty("Competency", out var cp)
                    ? cp.GetString() ?? ""
                    : el.TryGetProperty("competency", out var cpl) ? cpl.GetString() ?? "" : "";
                var subcategory = el.TryGetProperty("Subcategory", out var sc)
                    ? sc.GetString() ?? ""
                    : el.TryGetProperty("subcategory", out var scl) ? scl.GetString() ?? "" : "";
                result.Add((competency.ToLowerInvariant(), subcategory.ToLowerInvariant()));
            }
            return result;
        }
        catch
        {
            return [];
        }
    }
}
