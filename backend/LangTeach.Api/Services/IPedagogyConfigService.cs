using System.Collections.Frozen;
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
    /// Returns the full receptive scope -- used by the correction pipeline.
    /// Returns empty arrays if the level is not found.
    /// </summary>
    GrammarScope GetGrammarScope(string level);

    /// <summary>
    /// Returns the active drill grammar scope for lesson generation.
    /// For levels that define grammarFocusTargets (currently B1), returns the focused active-drill targets.
    /// For other levels, falls back to the full grammarInScope.
    /// </summary>
    GrammarScope GetActiveGrammarScope(string level);

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
    /// Returns the section coherence rules from course-rules.json.
    /// These are the mandatory cross-section constraints injected into the lesson plan prompt.
    /// Returns an empty array if the field is absent from config (should not happen in production).
    /// </summary>
    string[] GetSectionCoherenceRules();

    /// <summary>
    /// Returns the valid difficulty competency names (e.g. Grammar, Vocabulary).
    /// Case-insensitive matching is built into the returned set.
    /// </summary>
    FrozenSet<string> GetValidDifficultyCompetencies();

    /// <summary>
    /// Returns the valid difficulty severity values (low, medium, high, critical).
    /// Case-insensitive matching is built into the returned set.
    /// </summary>
    FrozenSet<string> GetValidDifficultySeverities();

    /// <summary>
    /// Returns session gap policy buckets in order. Iterate from first to last;
    /// use the first bucket whose MaxDays >= daysSince, or the last bucket as fallback (MaxDays == null).
    /// </summary>
    IReadOnlyList<SessionGapBucket> GetSessionGapPolicy();

    /// <summary>
    /// Returns the weakness targeting guidance template for the given section, or null if none defined.
    /// The template may contain {weaknesses} as a placeholder for the student weakness list.
    /// Sections practice, production, and wrapUp have guidance; warmUp and presentation do not.
    /// </summary>
    string? GetWeaknessTargetingGuidance(string sectionType, string weaknessType);

    /// <summary>
    /// Returns the lesson-plan design instruction appended to the STUDENT ERROR PROFILE block
    /// when the student has documented weaknesses. Backed by course-rules.json.
    /// </summary>
    string GetLessonWeaknessProfileGuidance();

    /// <summary>
    /// Returns a contrastive note result for the given native language, grammar topic, and CEFR level.
    /// Looks up contrastive patterns for the native language (specific-language patterns take priority
    /// over family-level patterns). Matches the first pattern whose Pattern value is a case-insensitive
    /// substring of <paramref name="grammarTopic"/> and whose CefrRelevance includes <paramref name="level"/>.
    /// Returns null if the L1 is unknown, no patterns are defined, or none match the topic and level.
    /// </summary>
    ContrastiveNoteResult? GetContrastivePattern(string nativeLang, string grammarTopic, string level);

    PromptFragmentsConfig PromptFragments { get; }

    /// <summary>
    /// Returns the proposal field taxonomy (student fields, skill-level fields, session fields)
    /// shared between AssistantController and the frontend.
    /// </summary>
    ProposalFieldsConfig ProposalFields { get; }

    /// <summary>
    /// Returns the intent-trigger phrase lists used by reflection extraction
    /// (teaching-todo and teacher-followup detection cues for the Atelier prompt).
    /// </summary>
    IntentTriggersConfig IntentTriggers { get; }

    /// <summary>
    /// Returns the C/G/L/O correction category definitions, anti-pattern rules, and critical rules
    /// loaded from correction-categories.json. Used to build the system prompt dynamically.
    /// </summary>
    CorrectionCategoriesFile GetCorrectionCategories();

    /// <summary>
    /// Returns the CEFR-specific calibration cue for the level filter prompt, or null if not defined.
    /// </summary>
    string? GetCorrectionCalibrationCue(string level);

    /// <summary>
    /// Returns the next CEFR level in the standard progression (A1→A2→B1→B2→C1→C2), or null for C2.
    /// </summary>
    string? GetNextLevel(string cefrLevel);

    /// <summary>
    /// Returns the list of always-keep grammar topics loaded from always-keep-grammar-rules.json.
    /// G tags matching these topics pass through the level filter unconditionally.
    /// </summary>
    IReadOnlyList<AlwaysKeepGrammarTopic> GetAlwaysKeepTopics();
}
