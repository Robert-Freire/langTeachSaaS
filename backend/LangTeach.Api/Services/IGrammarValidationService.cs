using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IGrammarValidationService
{
    /// <summary>
    /// Validates generated content against known grammar error patterns for the given target language.
    /// Returns one warning per matched rule, with optional severity elevation when the lesson grammar
    /// focus matches the rule's contextRelevance.grammarFocusPatterns.
    /// Returns an empty array when no violations are found or the language has no rules.
    /// </summary>
    GrammarWarning[] Validate(string content, string targetLanguage, string? grammarFocus);
}
