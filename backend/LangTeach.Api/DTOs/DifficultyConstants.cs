namespace LangTeach.Api.DTOs;

public static class DifficultyConstants
{
    public static readonly HashSet<string> ValidCompetencies =
        new(StringComparer.OrdinalIgnoreCase) { "Grammar", "Vocabulary", "Pronunciation", "Fluency", "Discourse" };

    public static readonly HashSet<string> ValidSeverities =
        new(StringComparer.OrdinalIgnoreCase) { "low", "medium", "high" };
}
