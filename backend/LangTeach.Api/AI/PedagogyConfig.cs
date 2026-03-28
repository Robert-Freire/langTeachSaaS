namespace LangTeach.Api.AI;

// Exercise catalog (exercise-types.json)
public record ExerciseCatalog(ExerciseTypeEntry[] ExerciseTypes);

public record ExerciseTypeEntry(string Id, string Category);

// CEFR level rules (cefr-levels/*.json)
// A1-B2 use vocabularyPerLesson (numeric); C1-C2 use vocabularyApproach (string).
// Both fields are nullable — deserialization picks up whichever is present.
public record CefrLevelRules(
    string Level,
    string[] GrammarInScope,
    string[] GrammarOutOfScope,
    string[] AppropriateExerciseTypes,
    InappropriateExerciseEntry[] InappropriateExerciseTypes,
    VocabularyPerLesson? VocabularyPerLesson,
    string? VocabularyApproach,
    string InstructionLanguage,
    string MetalanguageLevel,
    string ErrorCorrection,
    string ScaffoldingDefault
);

public record InappropriateExerciseEntry(string Id, string Reason);

public record VocabularyPerLesson(VocabularyRange Productive, VocabularyRange Receptive);

public record VocabularyRange(int Min, int Max);

// L1 influence (l1-influence.json)
public record L1InfluenceFile(
    Dictionary<string, LanguageFamily> LanguageFamilies,
    Dictionary<string, SpecificLanguage> SpecificLanguages
);

public record LanguageFamily(
    string[] Languages,
    string[] Strengths,
    string[] Weaknesses,
    LanguageFamilyAdjustments Adjustments
);

public record LanguageFamilyAdjustments(
    string[] IncreaseEmphasis,
    string[] DecreaseEmphasis,
    string[] AdditionalExerciseTypes,
    string[] TemplatePreference,
    string Notes
);

public record SpecificLanguage(
    string? Family,
    string[] FalseFriends,
    string[] PositiveTransfer,
    string AdditionalNotes
);

// Template overrides (template-overrides.json)
public record TemplateOverridesFile(List<TemplateOverrideEntry> Templates);

public record TemplateOverrideEntry(
    string Id,
    string Name,
    Dictionary<string, SectionOverride> Sections,
    Dictionary<string, string> LevelVariations,
    TemplateRestriction[] Restrictions
);

public record TemplateRestriction(string Type, string Value, string Reason);

public record SectionOverride(
    bool Required,
    string? OverrideGuidance,
    string[] PriorityExerciseTypes,
    int? MinExerciseVarietyOverride,
    string? Notes
);

// Course rules (course-rules.json)
public record CourseRulesFile(
    CourseVarietyRules VarietyRules,
    Dictionary<string, Dictionary<string, SkillRange>> SkillDistribution,
    GrammarProgression GrammarProgression
);

public record CourseVarietyRules(
    PracticeTypeCombinationRule PracticeTypeCombination,
    ProductionTypeAlternationRule ProductionTypeAlternation,
    WarmUpFormatRule WarmUpFormat,
    CompetencyCoverageRule CompetencyCoverage
);

public record PracticeTypeCombinationRule(int NoRepeatWithinSessions, string Description);
public record ProductionTypeAlternationRule(bool AlternateWrittenOral, string Description);
public record WarmUpFormatRule(int MaxConsecutiveRepeats, string Description);
public record CompetencyCoverageRule(int WindowSize, string[] RequiredCompetencies, string Description);
public record SkillRange(double Min, double Max);
public record GrammarProgression(
    string Model,
    RecyclingRule[] RecyclingRules,
    string[]? ValidRecyclingExamples = null,
    string[]? LazyRecyclingExamples = null
);
public record RecyclingRule(string Trigger, string Action);

// Style substitutions (style-substitutions.json)
public record StyleSubstitutionsFile(StyleSubstitution[] Substitutions);

public record StyleSubstitution(
    string[] Rejects,
    string Label,
    string[] SubstituteWith,
    string[] NeverSubstituteWith,
    string Rule
);
