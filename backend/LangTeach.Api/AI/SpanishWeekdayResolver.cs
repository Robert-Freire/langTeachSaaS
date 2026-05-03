using System.Text;
using System.Text.RegularExpressions;

namespace LangTeach.Api.AI;

public static class SpanishWeekdayResolver
{
    private static readonly Dictionary<string, DayOfWeek> WeekdayMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["lunes"]     = DayOfWeek.Monday,
        ["martes"]    = DayOfWeek.Tuesday,
        ["miércoles"] = DayOfWeek.Wednesday,
        ["miercoles"] = DayOfWeek.Wednesday,
        ["jueves"]    = DayOfWeek.Thursday,
        ["viernes"]   = DayOfWeek.Friday,
        ["sábado"]    = DayOfWeek.Saturday,
        ["sabado"]    = DayOfWeek.Saturday,
        ["domingo"]   = DayOfWeek.Sunday,
    };

    private const string DayAlts = @"lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo";

    // Alternation order: most-specific first so "el lunes pasado" is caught by pattern 2
    // before the bare "el lunes" in pattern 3.
    private static readonly Regex PhrasesRegex = new(
        @"\b(?:" +
        // Pattern 1 — pre-modifier: "el pasado lunes", "el próximo lunes"
        $@"el\s+(?<premod>pasado|pr[oó]ximo)\s+(?<day1>{DayAlts})" +
        @"|" +
        // Pattern 2 — post-modifier: "(el) lunes pasado", "(el) lunes que viene", "(el) lunes próximo"
        $@"(?:el\s+)?(?<day2>{DayAlts})\s+(?<postmod>pasado|que\s+viene|pr[oó]ximo)" +
        @"|" +
        // Pattern 3 — bare unqualified: "el lunes" (direction resolved per field context by the model)
        $@"el\s+(?<day3>{DayAlts})" +
        @")\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// Scans <paramref name="text"/> for Spanish weekday phrases, resolves each to an
    /// absolute date relative to <paramref name="referenceDate"/>, and returns a facts
    /// block for injection into the AI prompt. Returns null when no weekday phrases are found.
    ///
    /// Explicitly modified phrases ("pasado", "próximo", "que viene") produce a single
    /// directed date. Bare unqualified phrases ("el lunes") produce both the next and
    /// previous occurrence so the model can pick the correct direction per field context
    /// (newSessionDate = future, sessionDate = past) without computing arithmetic itself.
    /// </summary>
    public static string? BuildWeekdayFactsBlock(string text, DateOnly referenceDate)
    {
        var matches = PhrasesRegex.Matches(text);
        if (matches.Count == 0) return null;

        var seenDirected = new HashSet<(DayOfWeek, bool)>();
        var seenAmbiguous = new HashSet<DayOfWeek>();
        var lines = new List<string>();

        foreach (Match match in matches)
        {
            if (match.Groups["premod"].Success)
            {
                var dayName = match.Groups["day1"].Value;
                if (!WeekdayMap.TryGetValue(dayName, out var targetDay)) continue;
                var isPast = string.Equals(match.Groups["premod"].Value, "pasado", StringComparison.OrdinalIgnoreCase);
                if (!seenDirected.Add((targetDay, isPast))) continue;
                var date = isPast ? PreviousWeekday(referenceDate, targetDay) : NextWeekday(referenceDate, targetDay);
                lines.Add($"- \"{match.Value.Trim()}\" → {date:yyyy-MM-dd}");
            }
            else if (match.Groups["postmod"].Success)
            {
                var dayName = match.Groups["day2"].Value;
                if (!WeekdayMap.TryGetValue(dayName, out var targetDay)) continue;
                var isPast = string.Equals(match.Groups["postmod"].Value, "pasado", StringComparison.OrdinalIgnoreCase);
                if (!seenDirected.Add((targetDay, isPast))) continue;
                var date = isPast ? PreviousWeekday(referenceDate, targetDay) : NextWeekday(referenceDate, targetDay);
                lines.Add($"- \"{match.Value.Trim()}\" → {date:yyyy-MM-dd}");
            }
            else
            {
                // Bare phrase — provide both occurrences; the model resolves direction from field context.
                var dayName = match.Groups["day3"].Value;
                if (!WeekdayMap.TryGetValue(dayName, out var targetDay)) continue;
                if (!seenAmbiguous.Add(targetDay)) continue;
                var next = NextWeekday(referenceDate, targetDay);
                var prev = PreviousWeekday(referenceDate, targetDay);
                lines.Add($"- \"{match.Value.Trim()}\": next = {next:yyyy-MM-dd}, previous = {prev:yyyy-MM-dd}");
            }
        }

        if (lines.Count == 0) return null;

        var sb = new StringBuilder();
        sb.AppendLine("Pre-resolved date references (use these values instead of computing calendar arithmetic):");
        foreach (var line in lines)
            sb.AppendLine(line);
        return sb.ToString().TrimEnd();
    }

    private static DateOnly NextWeekday(DateOnly from, DayOfWeek target)
    {
        int daysAhead = (int)target - (int)from.DayOfWeek;
        if (daysAhead <= 0) daysAhead += 7;
        return from.AddDays(daysAhead);
    }

    private static DateOnly PreviousWeekday(DateOnly from, DayOfWeek target)
    {
        int daysBack = (int)from.DayOfWeek - (int)target;
        if (daysBack <= 0) daysBack += 7;
        return from.AddDays(-daysBack);
    }
}
