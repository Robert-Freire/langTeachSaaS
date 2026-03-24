namespace LangTeach.Api.DTOs;

/// <summary>
/// Shared mapping from CEFR skill codes to English skill names.
/// CE=reading, CO=listening, EE=writing, EO=speaking.
/// </summary>
public static class CefrSkillCodes
{
    public static string ToSkillName(string code) => code.ToUpperInvariant() switch
    {
        "CE" => "reading",
        "CO" => "listening",
        "EE" => "writing",
        "EO" => "speaking",
        _ => code  // pass unknown codes through unchanged
    };
}

public record CurriculumTemplateSummary(
    string Level,
    string CefrLevel,
    int UnitCount,
    IReadOnlyList<string> SampleGrammar
);

public record CurriculumTemplateData(
    string Level,
    string CefrLevel,
    IReadOnlyList<CurriculumTemplateUnit> Units
);

public record CurriculumTemplateUnit(
    int UnitNumber,
    string Title,
    string OverallGoal,
    IReadOnlyList<string> Grammar,
    IReadOnlyList<string> VocabularyThemes,
    IReadOnlyList<string> CommunicativeFunctions,
    IReadOnlyList<string> CompetencyFocus
);
