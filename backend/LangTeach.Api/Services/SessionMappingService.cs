using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public class SessionMappingService : ISessionMappingService
{
    private static readonly string[] TwoSessionLabels = ["Foundation", "Extended Practice"];
    private static readonly string[] ThreeSessionLabels = ["Introduction", "Practice", "Production"];

    public SessionMappingResult Compute(IReadOnlyList<CurriculumTemplateUnit> units, int sessionCount)
    {
        ArgumentNullException.ThrowIfNull(units);
        if (sessionCount < 1) throw new ArgumentOutOfRangeException(nameof(sessionCount), "Must be >= 1.");
        if (units.Count == 0) throw new ArgumentException("Units list must not be empty.", nameof(units));

        if (sessionCount == units.Count)
            return BuildExact(units);

        if (sessionCount < units.Count)
            return BuildCompress(units, sessionCount);

        return BuildExpand(units, sessionCount);
    }

    private static SessionMappingResult BuildExact(IReadOnlyList<CurriculumTemplateUnit> units)
    {
        var sessions = units.Select((u, i) => new SessionMappingEntry(
            SessionIndex: i + 1,
            UnitRef: u.Title,
            SubFocus: u.Title,
            Rationale: "1 session per template unit (exact match).",
            GrammarFocus: u.Grammar.Count > 0 ? string.Join(", ", u.Grammar) : null
        )).ToList();

        return new SessionMappingResult("exact", units.Count, units.Count, sessions, []);
    }

    private static SessionMappingResult BuildCompress(IReadOnlyList<CurriculumTemplateUnit> units, int sessionCount)
    {
        var covered = units.Take(sessionCount).ToList();
        var excluded = units.Skip(sessionCount).Select(u => u.Title).ToList();

        var sessions = covered.Select((u, i) => new SessionMappingEntry(
            SessionIndex: i + 1,
            UnitRef: u.Title,
            SubFocus: u.Title,
            Rationale: $"Course covers units 1–{sessionCount} of {units.Count}. Not included: {string.Join(", ", excluded)}.",
            GrammarFocus: u.Grammar.Count > 0 ? string.Join(", ", u.Grammar) : null
        )).ToList();

        return new SessionMappingResult("compress", sessionCount, units.Count, sessions, excluded);
    }

    private static SessionMappingResult BuildExpand(IReadOnlyList<CurriculumTemplateUnit> units, int sessionCount)
    {
        int unitCount = units.Count;
        int basePerUnit = sessionCount / unitCount;
        int extra = sessionCount % unitCount;

        var sessions = new List<SessionMappingEntry>(sessionCount);
        int sessionIndex = 1;

        for (int i = 0; i < unitCount; i++)
        {
            var unit = units[i];
            int sessionsForUnit = basePerUnit + (i < extra ? 1 : 0);
            int startSession = sessionIndex;
            int endSession = sessionIndex + sessionsForUnit - 1;

            var grammarText = unit.Grammar.Count > 0 ? string.Join(", ", unit.Grammar.Take(3)) : null;
            var rationale = grammarText is not null
                ? $"Unit spans sessions {startSession}–{endSession} to allow extended practice of {grammarText}."
                : $"Unit spans sessions {startSession}–{endSession} for extended practice.";

            var subFocusLabels = GetSubFocusLabels(sessionsForUnit);

            for (int s = 0; s < sessionsForUnit; s++)
            {
                sessions.Add(new SessionMappingEntry(
                    SessionIndex: sessionIndex,
                    UnitRef: unit.Title,
                    SubFocus: sessionsForUnit == 1 ? unit.Title : $"{unit.Title}: {subFocusLabels[s]}",
                    Rationale: rationale,
                    GrammarFocus: unit.Grammar.Count > 0 ? string.Join(", ", unit.Grammar) : null
                ));
                sessionIndex++;
            }
        }

        return new SessionMappingResult("expand", sessionCount, unitCount, sessions, []);
    }

    private static string[] GetSubFocusLabels(int count) =>
        count switch
        {
            1 => [],
            2 => TwoSessionLabels,
            3 => ThreeSessionLabels,
            _ => BuildExtendedLabels(count)
        };

    private static string[] BuildExtendedLabels(int count)
    {
        var labels = new string[count];
        labels[0] = "Introduction";
        labels[count - 1] = "Production";
        for (int i = 1; i < count - 1; i++)
            labels[i] = count - 2 == 1 ? "Practice" : $"Practice {i}";
        return labels;
    }
}
