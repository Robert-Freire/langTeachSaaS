namespace LangTeach.Api.AI;

/// <summary>
/// Output DTO for GetGrammarScope — contains in-scope and out-of-scope grammar lists for a CEFR level.
/// Not a JSON deserialization model; constructed by PedagogyConfigService from CefrLevelRules data.
/// </summary>
public record GrammarScope(string[] InScope, string[] OutOfScope);

/// <summary>
/// Output DTO for GetVocabularyGuidance.
/// A1-B2: ProductiveMin/Max and ReceptiveMin/Max are set (numeric vocabulary targets).
/// C1-C2: Approach is set (qualitative description); numeric fields are null.
/// </summary>
public record VocabularyGuidance(
    int? ProductiveMin,
    int? ProductiveMax,
    int? ReceptiveMin,
    int? ReceptiveMax,
    string? Approach
);

/// <summary>
/// Output DTO for GetGuidedWritingGuidance — CEFR-specific writing parameters.
/// Not a JSON deserialization model; constructed by PedagogyConfigService from CefrLevelRules data.
/// </summary>
public record GuidedWritingGuidance(
    int WordCountMin,
    int WordCountMax,
    int SentenceCountMin,
    int SentenceCountMax,
    string Structures,
    string Complexity,
    string SituationGuidance
);

/// <summary>
/// Output DTO for GetL1Adjustments — combines family-level adjustments and language-specific notes.
/// Not a JSON deserialization model; composed from L1InfluenceFile data.
/// </summary>
public record L1Adjustments(
    string[] AdditionalExerciseTypes,
    string[] IncreaseEmphasis,
    string[] DecreaseEmphasis,
    string Notes
);
