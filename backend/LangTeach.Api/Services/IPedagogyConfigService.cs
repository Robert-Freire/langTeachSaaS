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
    /// Returns all style substitution entries.
    /// </summary>
    StyleSubstitution[] GetAllStyleSubstitutions();

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

    /// <summary>
    /// Resolves the scope for a section/level/template combination.
    /// Resolution order: template override scope > section profile scope > "full".
    /// Returns "brief" or "full". Never returns null.
    /// <paramref name="templateName"/> is the display name (e.g. "Reading &amp; Comprehension"), resolved internally.
    /// </summary>
    string GetResolvedScope(string section, string level, string? templateName);

    /// <summary>
    /// Returns the scope constraint text for the given section, level, template, and content type.
    /// Resolves scope first, then looks up the constraint text in scope-constraints.json.
    /// Returns null when scope is "full" or no constraint is defined for the (scope, contentType) pair.
    /// <paramref name="contentType"/> must be a kebab-case ContentBlockType value (e.g. "conversation", "free-text").
    /// </summary>
    string? GetScopeConstraint(string section, string level, string? templateName, string contentType);

    /// <summary>
    /// Returns the preferred content type for a template section, or null if not specified.
    /// <paramref name="templateName"/> is the display name (e.g. "Exam Prep"), resolved internally.
    /// </summary>
    string? GetPreferredContentType(string section, string? templateName);
}
