namespace LangTeach.Api.DTOs;

/// <summary>
/// Grammar quality warning computed at response time from AI-generated content.
/// Not stored in the database; re-evaluated each time the content block is returned.
/// </summary>
public record GrammarWarning(string RuleId, string Correction, string Severity, string MatchedText);
