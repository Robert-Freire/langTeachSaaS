using System.Collections.Frozen;

namespace LangTeach.Api.DTOs;

public static class DifficultyConstants
{
    public static readonly FrozenSet<string> ValidCompetencies =
        new[] { "Grammar", "Vocabulary", "Pronunciation", "Fluency", "Discourse" }
            .ToFrozenSet(StringComparer.OrdinalIgnoreCase);

    public static readonly FrozenSet<string> ValidSeverities =
        new[] { "low", "medium", "high" }
            .ToFrozenSet(StringComparer.OrdinalIgnoreCase);
}
