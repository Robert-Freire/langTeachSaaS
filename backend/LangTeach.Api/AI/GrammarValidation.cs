namespace LangTeach.Api.AI;

// Deserialization models for grammar-validation-rules.json

public record GrammarValidationRulesFile(string Version, GrammarValidationRule[] Rules);

public record GrammarValidationRule(
    string Id,
    string TargetLanguage,
    string Category,
    string Pattern,
    string Correction,
    string Severity,
    GrammarValidationContextRelevance? ContextRelevance = null);

public record GrammarValidationContextRelevance(string[] GrammarFocusPatterns);

/// <summary>
/// Output DTO — computed at response time, not stored in DB.
/// </summary>
public record GrammarWarning(string RuleId, string Correction, string Severity, string MatchedText);
