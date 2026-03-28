using LangTeach.Api.AI;

namespace LangTeach.Api.Services;

public interface IPedagogyConfigService
{
    /// <summary>
    /// Returns valid exercise type IDs for the given section, level, optional template, and optional native language.
    /// Composition: CEFR appropriate ∩ section valid, minus forbidden (with pattern expansion),
    /// re-ordered by template priorities, plus L1 additional types, re-filtered for forbidden.
    /// When sectionValid is null (no filter defined), cefrTypes are used as the base.
    /// </summary>
    string[] GetValidExerciseTypes(string section, string level, string? templateId = null, string? nativeLang = null);

    /// <summary>
    /// Returns the expanded forbidden exercise type IDs for a section+level.
    /// Patterns (e.g. "GR-*") are expanded against the exercise type catalog.
    /// </summary>
    string[] GetForbiddenExerciseTypeIds(string section, string level);

    /// <summary>
    /// Returns in-scope and out-of-scope grammar lists for the CEFR level.
    /// Returns empty arrays if the level is not found.
    /// </summary>
    GrammarScope GetGrammarScope(string level);

    /// <summary>
    /// Returns vocabulary guidance for the level.
    /// Numeric (ProductiveMin/Max, ReceptiveMin/Max) for A1-B2.
    /// String approach (Approach) for C1-C2.
    /// </summary>
    VocabularyGuidance GetVocabularyGuidance(string level);

    /// <summary>
    /// Returns L1 adjustments for the native language, combining family adjustments with
    /// language-specific notes. Returns null if the language is not found.
    /// </summary>
    L1Adjustments? GetL1Adjustments(string nativeLang);

    /// <summary>
    /// Returns the template override entry for the given template ID. Returns null if not found.
    /// </summary>
    TemplateOverrideEntry? GetTemplateOverride(string templateId);

    /// <summary>
    /// Returns the full course rules configuration (variety rules, skill distribution, grammar progression).
    /// </summary>
    CourseRulesFile GetCourseRules();

    /// <summary>
    /// Returns substitution entries whose Rejects list contains any of the given type IDs.
    /// </summary>
    StyleSubstitution[] GetStyleSubstitutions(string[] rejectedTypes);

    /// <summary>
    /// Returns the template override entry whose Name matches the display name (case-insensitive).
    /// Use when TemplateName from the DB is a display name (e.g. "Reading &amp; Comprehension"), not an ID.
    /// Returns null if not found.
    /// </summary>
    TemplateOverrideEntry? GetTemplateOverrideByName(string name);

    /// <summary>
    /// Returns the display name for an exercise type ID. Returns the ID itself if not found.
    /// </summary>
    string GetExerciseTypeName(string id);
}
