using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IGrammarValidationService
{
    /// <summary>
    /// Validates content against known grammar error patterns for the given target language and CEFR level.
    /// Rules with a non-null <c>levels</c> array only fire when <paramref name="cefrLevel"/> appears in that array.
    /// Returns one warning per matched rule, with optional severity elevation when the lesson grammar
    /// focus matches the rule's contextRelevance.grammarFocusPatterns.
    /// Returns an empty array when no violations are found or the language has no applicable rules.
    /// </summary>
    GrammarWarning[] Validate(string content, string targetLanguage, string? cefrLevel, string? grammarFocus);
}
