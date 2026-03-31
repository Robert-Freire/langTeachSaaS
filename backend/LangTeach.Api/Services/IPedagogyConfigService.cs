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
    /// Returns guided writing parameters (word counts, complexity, structure expectations) for the CEFR level.
    /// Falls back to safe defaults when the level config does not define guidedWriting.
    /// </summary>
    GuidedWritingGuidance GetGuidedWritingGuidance(string level);

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
    /// Returns grammar constraints for the given target language (e.g. "spanish").
    /// These are accuracy rules that must be enforced in generated exercises and grammar content.
    /// Returns an empty array if no constraints are defined for the language.
    /// </summary>
    TargetLanguageGrammarConstraint[] GetGrammarConstraints(string targetLanguage);

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

    /// <summary>
    /// Returns section names (e.g. "warmUp", "production") that have required:true
    /// for the template identified by display name (case-insensitive).
    /// Order: warmUp, presentation, practice, production, wrapUp.
    /// Returns null if the template name is not found.
    /// </summary>
    IReadOnlyList<string>? GetRequiredSectionNames(string templateName);

    /// <summary>
    /// Returns practice stage requirements for the CEFR level (active stages, item counts per stage).
    /// Returns null if the level is not found in the config.
    /// </summary>
    CefrStageRequirement? GetPracticeStageRequirements(string level);

    /// <summary>
    /// Returns noticing task guidance for the CEFR level (target categories, question complexity, scaffolding).
    /// Returns null if the level does not define a noticingTask section.
    /// </summary>
    NoticingTaskGuidance? GetNoticingTaskGuidance(string level);

    /// <summary>
    /// Returns all practice stage definitions (id, names, descriptions, allowed exercise categories).
    /// </summary>
    IReadOnlyList<PracticeStageDefinition> GetPracticeStageDefinitions();

    /// <summary>
    /// Returns a contrastive note result for the given native language, grammar topic, and CEFR level.
    /// Looks up contrastive patterns for the native language (specific-language patterns take priority
    /// over family-level patterns). Matches the first pattern whose Pattern value is a case-insensitive
    /// substring of <paramref name="grammarTopic"/> and whose CefrRelevance includes <paramref name="level"/>.
    /// Returns null if the L1 is unknown, no patterns are defined, or none match the topic and level.
    /// </summary>
    ContrastiveNoteResult? GetContrastivePattern(string nativeLang, string grammarTopic, string level);
}
