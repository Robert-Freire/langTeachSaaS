using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using LangTeach.Api.AI;
using LangTeach.Api.Data.Models;

namespace LangTeach.Api.Services;

public class PedagogyConfigService : IPedagogyConfigService
{
    private readonly ILogger<PedagogyConfigService> _log;
    private readonly ISectionProfileService _sectionProfileService;

    private readonly HashSet<string> _catalogIds;
    private readonly HashSet<string> _availableIds; // types with available: true (working UI renderer)
    private readonly Dictionary<string, string> _exerciseNames; // id (ci) -> display name
    private readonly Dictionary<string, CefrLevelRules> _cefrRules;
    private readonly L1InfluenceFile _l1;
    private readonly Dictionary<string, TemplateOverrideEntry> _templates;
    private readonly CourseRulesFile _courseRules;
    private readonly StyleSubstitution[] _substitutions;
    // Outer key: scope value ("brief"); inner key: content type kebab ("conversation"); value: constraint text
    private readonly Dictionary<string, Dictionary<string, string>> _scopeConstraints;
    private readonly PracticeStagesFile _practiceStages;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
    };

    public PedagogyConfigService(
        ILogger<PedagogyConfigService> logger,
        ISectionProfileService sectionProfileService)
    {
        _log = logger;
        _sectionProfileService = sectionProfileService;

        var assembly = Assembly.GetExecutingAssembly();

        // Load exercise type catalog (must be first — other validation depends on it)
        var catalog = LoadJson<ExerciseCatalog>(assembly, "LangTeach.Api.Pedagogy.exercise-types.json");
        _catalogIds = catalog.ExerciseTypes.Select(e => e.Id).ToHashSet(StringComparer.OrdinalIgnoreCase);
        _availableIds = catalog.ExerciseTypes
            .Where(e => e.Available)
            .Select(e => e.Id)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        _exerciseNames = catalog.ExerciseTypes.ToDictionary(
            e => e.Id,
            e => e.Name,
            StringComparer.OrdinalIgnoreCase);
        _log.LogInformation("PedagogyConfigService: loaded exercise catalog with {Count} types ({Available} available)",
            _catalogIds.Count, _availableIds.Count);

        // Load CEFR level rules
        _cefrRules = new Dictionary<string, CefrLevelRules>(StringComparer.OrdinalIgnoreCase);
        const string cefrPrefix = "LangTeach.Api.Pedagogy.CefrLevels.";
        foreach (var name in assembly.GetManifestResourceNames()
            .Where(n => n.StartsWith(cefrPrefix, StringComparison.Ordinal) && n.EndsWith(".json", StringComparison.Ordinal)))
        {
            using var stream = assembly.GetManifestResourceStream(name)
                ?? throw new InvalidOperationException($"PedagogyConfigService: could not open resource stream '{name}'");
            var rule = JsonSerializer.Deserialize<CefrLevelRules>(stream, JsonOpts)
                ?? throw new InvalidOperationException($"PedagogyConfigService: deserialized null for resource '{name}'");
            _cefrRules[rule.Level] = rule;
            _log.LogDebug("PedagogyConfigService: loaded CEFR rules for level '{Level}'", rule.Level);
        }

        // Load L1 influence
        _l1 = LoadJson<L1InfluenceFile>(assembly, "LangTeach.Api.Pedagogy.l1-influence.json");

        // Load template overrides — rebuild Sections dictionaries as case-insensitive so that
        // callers using "warmup" (SectionProfileService convention) match JSON keys "warmUp"/"wrapUp"
        var templatesFile = LoadJson<TemplateOverridesFile>(assembly, "LangTeach.Api.Pedagogy.template-overrides.json");
        _templates = templatesFile.Templates.ToDictionary(
            t => t.Id,
            t => new TemplateOverrideEntry(
                t.Id,
                t.Name,
                new Dictionary<string, SectionOverride>(t.Sections, StringComparer.OrdinalIgnoreCase),
                t.LevelVariations,
                t.Restrictions),
            StringComparer.OrdinalIgnoreCase);

        // Load course rules
        _courseRules = LoadJson<CourseRulesFile>(assembly, "LangTeach.Api.Pedagogy.course-rules.json");

        // Load style substitutions
        var subsFile = LoadJson<StyleSubstitutionsFile>(assembly, "LangTeach.Api.Pedagogy.style-substitutions.json");
        _substitutions = subsFile.Substitutions;

        // Load scope constraints
        var scopeFile = LoadJson<ScopeConstraintsFile>(assembly, "LangTeach.Api.Pedagogy.scope-constraints.json");
        _scopeConstraints = scopeFile.Scopes
            .ToDictionary(
                kv => kv.Key,
                kv => new Dictionary<string, string>(kv.Value, StringComparer.OrdinalIgnoreCase),
                StringComparer.OrdinalIgnoreCase);

        // Load practice stages — rebuild CefrStageRequirements with case-insensitive comparer
        var practiceStagesRaw = LoadJson<PracticeStagesFile>(assembly, "LangTeach.Api.Pedagogy.practice-stages.json");
        _practiceStages = practiceStagesRaw with
        {
            CefrStageRequirements = new Dictionary<string, CefrStageRequirement>(
                practiceStagesRaw.CefrStageRequirements,
                StringComparer.OrdinalIgnoreCase)
        };
        _log.LogInformation("PedagogyConfigService: loaded {StageCount} practice stages across {LevelCount} CEFR levels",
            _practiceStages.Stages.Length, _practiceStages.CefrStageRequirements.Count);

        // Validate cross-layer references — fail fast on dangling IDs
        ValidateCrossLayerRefs();

        _log.LogInformation(
            "PedagogyConfigService: ready. Levels={LevelCount}, Templates={TemplateCount}, CatalogTypes={CatalogCount}",
            _cefrRules.Count, _templates.Count, _catalogIds.Count);
    }

    // --- Interface implementation ---

    public string[] GetValidExerciseTypes(string section, string level, string? templateId = null, string? nativeLang = null)
    {
        var normalLevel = NormalizeLevel(level);

        // Step 1: CEFR appropriate types for the level
        string[] cefrTypes = _cefrRules.TryGetValue(normalLevel, out var cefrRule)
            ? cefrRule.AppropriateExerciseTypes
            : [];
        _log.LogDebug("PedagogyConfigService: CEFR {Level} appropriateExerciseTypes={Count}", normalLevel, cefrTypes.Length);

        // Step 2: Section valid types — null means no section filter, use cefrTypes directly
        var sectionValid = _sectionProfileService.GetRawValidExerciseTypes(section, level);
        string[] sectionTypes = sectionValid ?? cefrTypes;
        _log.LogDebug("PedagogyConfigService: Section '{Section}' {Level} validExerciseTypes={Count} nullFilter={IsNull}",
            section, level, sectionTypes.Length, sectionValid is null);

        // Step 3: Intersect CEFR ∩ section
        var cefrSet = cefrTypes.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var base_ = sectionTypes.Where(t => cefrSet.Contains(t)).ToList();
        _log.LogDebug("PedagogyConfigService: After intersection={Count}", base_.Count);

        // Steps 4-5: Expand forbidden patterns and subtract
        var rawForbidden = _sectionProfileService.GetRawForbiddenExerciseTypes(section, level);
        var forbidden = ExpandForbiddenTypes(rawForbidden);
        base_ = base_.Where(t => !forbidden.Contains(t)).ToList();
        _log.LogDebug("PedagogyConfigService: After forbidden filter={Count} (forbidden={ForbiddenCount})", base_.Count, forbidden.Count);

        // Step 6: Template priority re-order (does NOT add new types, only re-orders)
        if (templateId is not null && _templates.TryGetValue(templateId, out var tmpl))
        {
            var normalSection = NormalizeSection(section);
            if (tmpl.Sections.TryGetValue(normalSection, out var secOverride))
            {
                var prioritySet = secOverride.PriorityExerciseTypes.ToHashSet(StringComparer.OrdinalIgnoreCase);
                var priorityFirst = base_.Where(t => prioritySet.Contains(t)).ToList();
                var rest = base_.Where(t => !prioritySet.Contains(t)).ToList();
                base_ = [.. priorityFirst, .. rest];
                _log.LogDebug("PedagogyConfigService: Template '{Template}' re-ordered with {PriorityCount} priority types first",
                    templateId, priorityFirst.Count);
            }
        }

        // Step 7: Add L1 additional types (order-stable dedup via seen-set)
        if (nativeLang is not null)
        {
            var (familyAdj, _) = ResolveLang(NormalizeLang(nativeLang));
            if (familyAdj is not null && familyAdj.AdditionalExerciseTypes.Length > 0)
            {
                var seen = base_.ToHashSet(StringComparer.OrdinalIgnoreCase);
                foreach (var id in familyAdj.AdditionalExerciseTypes)
                {
                    if (seen.Add(id))
                        base_.Add(id);
                }
                _log.LogDebug("PedagogyConfigService: L1 '{Lang}' added {Count} types", nativeLang, familyAdj.AdditionalExerciseTypes.Length);
            }
        }

        // Step 8: RE-FILTER forbidden — critical: L1 additions must not bypass section forbidden rules
        base_ = base_.Where(t => !forbidden.Contains(t)).ToList();
        _log.LogDebug("PedagogyConfigService: After re-filter forbidden={Count}", base_.Count);

        // Step 9: Filter to available types only (must have a working UI renderer)
        base_ = base_.Where(t => _availableIds.Contains(t)).ToList();
        _log.LogDebug("PedagogyConfigService: Final after available filter={Count}", base_.Count);

        return base_.ToArray();
    }

    public string[] GetForbiddenExerciseTypeIds(string section, string level)
    {
        var raw = _sectionProfileService.GetRawForbiddenExerciseTypes(section, level);
        return [.. ExpandForbiddenTypes(raw)];
    }

    public GrammarScope GetGrammarScope(string level)
    {
        var normalLevel = NormalizeLevel(level);
        if (!_cefrRules.TryGetValue(normalLevel, out var rule))
            return new GrammarScope([], []);
        return new GrammarScope(rule.GrammarInScope, rule.GrammarOutOfScope);
    }

    public GuidedWritingGuidance GetGuidedWritingGuidance(string level)
    {
        var normalLevel = NormalizeLevel(level);
        if (_cefrRules.TryGetValue(normalLevel, out var rule) && rule.GuidedWriting is { } gw)
            return new GuidedWritingGuidance(
                gw.WordCountMin, gw.WordCountMax,
                gw.SentenceCountMin, gw.SentenceCountMax,
                gw.Structures, gw.Complexity, gw.SituationGuidance);

        // Safe defaults for levels without config
        return new GuidedWritingGuidance(80, 130, 6, 10,
            "compound and complex sentences",
            "Clear, structured writing appropriate to the level.",
            "Relevant, contextual topics");
    }

    public VocabularyGuidance GetVocabularyGuidance(string level)
    {
        var normalLevel = NormalizeLevel(level);
        if (!_cefrRules.TryGetValue(normalLevel, out var rule))
            return new VocabularyGuidance(null, null, null, null, null);

        // C1-C2: vocabularyApproach is a string description
        if (rule.VocabularyApproach is not null)
            return new VocabularyGuidance(null, null, null, null, rule.VocabularyApproach);

        // A1-B2: vocabularyPerLesson has numeric productive/receptive ranges
        if (rule.VocabularyPerLesson is not null)
            return new VocabularyGuidance(
                rule.VocabularyPerLesson.Productive.Min,
                rule.VocabularyPerLesson.Productive.Max,
                rule.VocabularyPerLesson.Receptive.Min,
                rule.VocabularyPerLesson.Receptive.Max,
                null);

        return new VocabularyGuidance(null, null, null, null, null);
    }

    public L1Adjustments? GetL1Adjustments(string nativeLang)
    {
        var (familyAdj, specific) = ResolveLang(NormalizeLang(nativeLang));
        if (familyAdj is null && specific is null)
            return null;

        var notes = string.Join(" ", new[]
        {
            familyAdj?.Notes,
            specific?.AdditionalNotes
        }.Where(s => !string.IsNullOrWhiteSpace(s)));

        return new L1Adjustments(
            AdditionalExerciseTypes: familyAdj?.AdditionalExerciseTypes ?? [],
            IncreaseEmphasis: familyAdj?.IncreaseEmphasis ?? [],
            DecreaseEmphasis: familyAdj?.DecreaseEmphasis ?? [],
            Notes: notes
        );
    }

    public TargetLanguageGrammarConstraint[] GetGrammarConstraints(string targetLanguage)
    {
        var key = NormalizeLang(targetLanguage);
        if (_l1.SpecificLanguages.TryGetValue(key, out var specific)
            && specific.GrammarConstraints is { Length: > 0 } constraints)
            return constraints;
        return [];
    }

    public ContrastiveNoteResult? GetContrastivePattern(string nativeLang, string grammarTopic, string level)
    {
        if (string.IsNullOrWhiteSpace(nativeLang)
            || string.IsNullOrWhiteSpace(grammarTopic)
            || string.IsNullOrWhiteSpace(level))
            return null;

        var key = NormalizeLang(nativeLang);
        var normalizedLevel = NormalizeLevel(level);
        var (_, specific) = ResolveLang(key);

        // If the specific language has explicitly defined ContrastivePatterns (even as an empty array),
        // use only those and do NOT fall back to family patterns. This allows specific languages to
        // opt out of family-level patterns (e.g., Portuguese has positive transfer on ser/estar).
        // If ContrastivePatterns is null, fall back to family patterns.
        // Pattern is a substring keyword (topic "ser-estar distinction" matches pattern "ser-estar").
        ContrastivePattern[] patterns;
        if (specific?.ContrastivePatterns is not null)
            patterns = specific.ContrastivePatterns;
        else
            patterns = ResolveFamilyContrastivePatterns(key, specific);

        foreach (var p in patterns)
        {
            var topicMatch = grammarTopic.Contains(p.Pattern, StringComparison.OrdinalIgnoreCase);
            var levelMatch = p.CefrRelevance.Contains(normalizedLevel, StringComparer.OrdinalIgnoreCase);
            if (topicMatch && levelMatch)
                return new ContrastiveNoteResult(p.L1Behavior, p.TargetContrast, nativeLang);
        }

        return null;
    }

    private ContrastivePattern[] ResolveFamilyContrastivePatterns(string lang, SpecificLanguage? specific)
    {
        LanguageFamily? fam = null;
        if (specific?.Family is not null)
            _l1.LanguageFamilies.TryGetValue(specific.Family, out fam);
        // If family lookup failed (typo/data drift) or no specific language, fall back to scanning
        if (fam is null)
            foreach (var (_, f) in _l1.LanguageFamilies)
                if (f.Languages.Contains(lang, StringComparer.OrdinalIgnoreCase)) { fam = f; break; }
        return fam?.ContrastivePatterns ?? [];
    }

    public TemplateOverrideEntry? GetTemplateOverride(string templateId) =>
        _templates.TryGetValue(templateId, out var t) ? t : null;

    public CourseRulesFile GetCourseRules() => _courseRules;

    public string[] GetSectionCoherenceRules()
    {
        var rules = _courseRules.SectionCoherenceRules ?? [];
        if (rules.Length == 0)
            _log.LogWarning("PedagogyConfigService: sectionCoherenceRules is missing or empty in course-rules.json");
        return rules;
    }

    public string? GetWeaknessTargetingGuidance(string sectionType) =>
        _sectionProfileService.GetWeaknessTargetingGuidance(sectionType);

    public StyleSubstitution[] GetStyleSubstitutions(string[] rejectedTypes)
    {
        var rejectedSet = rejectedTypes.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return _substitutions
            .Where(s => s.Rejects.Any(r => rejectedSet.Contains(r)))
            .ToArray();
    }

    public StyleSubstitution[] GetAllStyleSubstitutions() => _substitutions;

    // Linear scan is intentional: ~6 templates total, called once per lesson generation.
    public TemplateOverrideEntry? GetTemplateOverrideByName(string name) =>
        _templates.Values.FirstOrDefault(t => string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase));

    public string GetExerciseTypeName(string id) =>
        _exerciseNames.TryGetValue(id, out var name) ? name : id;

    public string GetResolvedScope(string section, string level, string? templateName)
    {
        // Template override scope wins
        if (!string.IsNullOrEmpty(templateName))
        {
            var tmplEntry = GetTemplateOverrideByName(templateName);
            if (tmplEntry is not null)
            {
                var normalSection = NormalizeSection(section);
                if (tmplEntry.Sections.TryGetValue(normalSection, out var secOverride)
                    && secOverride.Scope is not null)
                    return secOverride.Scope;
            }
        }

        // Section profile scope
        var profileScope = _sectionProfileService.GetScope(section, level);
        return profileScope ?? "full";
    }

    public string? GetScopeConstraint(string section, string level, string? templateName, string contentType)
    {
        var scope = GetResolvedScope(section, level, templateName);
        if (scope == "full") return null;

        if (_scopeConstraints.TryGetValue(scope, out var byType)
            && byType.TryGetValue(contentType, out var constraint))
            return constraint;

        _log.LogDebug("PedagogyConfigService: no scope constraint for ({Scope}, {ContentType})", scope, contentType);
        return null;
    }

    public string? GetPreferredContentType(string section, string? templateName)
    {
        if (string.IsNullOrEmpty(templateName))
            return null;

        var tmplEntry = GetTemplateOverrideByName(templateName);
        if (tmplEntry is null)
            return null;

        var normalSection = NormalizeSection(section);
        return tmplEntry.Sections.TryGetValue(normalSection, out var secOverride)
            ? secOverride.PreferredContentType
            : null;
    }

    public IReadOnlyList<string>? GetRequiredSectionNames(string templateName)
    {
        var tmplEntry = GetTemplateOverrideByName(templateName);
        if (tmplEntry is null)
            return null;

        return SectionKeys.CanonicalOrder
            .Where(s => tmplEntry.Sections.TryGetValue(s, out var sec) && sec.Required)
            .ToList();
    }

    public CefrStageRequirement? GetPracticeStageRequirements(string level)
    {
        var normalLevel = NormalizeLevel(level);
        return _practiceStages.CefrStageRequirements.TryGetValue(normalLevel, out var req) ? req : null;
    }

    public IReadOnlyList<PracticeStageDefinition> GetPracticeStageDefinitions()
        => _practiceStages.Stages;

    public NoticingTaskGuidance? GetNoticingTaskGuidance(string level)
    {
        var normalLevel = NormalizeLevel(level);
        if (!_cefrRules.TryGetValue(normalLevel, out var rule) || rule.NoticingTask is not { } nt)
            return null;
        return new NoticingTaskGuidance(
            nt.TargetCategories, nt.QuestionComplexity, nt.Scaffolding, nt.Guidance);
    }

    // --- Private helpers ---

    private static T LoadJson<T>(Assembly assembly, string resourceName)
    {
        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"PedagogyConfigService: embedded resource '{resourceName}' not found.");
        return JsonSerializer.Deserialize<T>(stream, JsonOpts)
            ?? throw new InvalidOperationException($"PedagogyConfigService: failed to deserialize '{resourceName}'.");
    }

    private HashSet<string> ExpandForbiddenTypes(ForbiddenExerciseType[] raw)
    {
        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var entry in raw)
        {
            if (entry.Id is not null)
            {
                result.Add(entry.Id);
            }
            else if (entry.Pattern is not null)
            {
                // Trailing-wildcard glob: "GR-*" matches all catalog IDs starting with "GR-"
                var prefix = entry.Pattern.TrimEnd('*');
                foreach (var id in _catalogIds.Where(id => id.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)))
                    result.Add(id);
            }
        }
        return result;
    }

    private (LanguageFamilyAdjustments? FamilyAdj, SpecificLanguage? Specific) ResolveLang(string lang)
    {
        // Check specificLanguages first; if found and has a family, return family adjustments + specific data
        if (_l1.SpecificLanguages.TryGetValue(lang, out var specific))
        {
            LanguageFamilyAdjustments? familyAdj = null;
            if (specific.Family is not null && _l1.LanguageFamilies.TryGetValue(specific.Family, out var fam))
                familyAdj = fam.Adjustments;
            return (familyAdj, specific);
        }

        // Scan language families to find which family lists this language
        foreach (var (_, family) in _l1.LanguageFamilies)
        {
            if (family.Languages.Contains(lang, StringComparer.OrdinalIgnoreCase))
                return (family.Adjustments, null);
        }

        return (null, null);
    }

    private void ValidateCrossLayerRefs()
    {
        var errors = new List<string>();

        foreach (var (lvl, rule) in _cefrRules)
        {
            foreach (var id in rule.AppropriateExerciseTypes)
            {
                if (!_catalogIds.Contains(id))
                    errors.Add($"CEFR {lvl} appropriateExerciseTypes: unknown ID '{id}'");
            }
            foreach (var entry in rule.InappropriateExerciseTypes)
            {
                if (!_catalogIds.Contains(entry.Id))
                    errors.Add($"CEFR {lvl} inappropriateExerciseTypes: unknown ID '{entry.Id}'");
            }
        }

        foreach (var (family, fam) in _l1.LanguageFamilies)
        {
            foreach (var id in fam.Adjustments.AdditionalExerciseTypes
                .Concat(fam.Adjustments.IncreaseEmphasis)
                .Concat(fam.Adjustments.DecreaseEmphasis)
                .Where(id => !string.IsNullOrEmpty(id)))
            {
                if (!_catalogIds.Contains(id))
                    errors.Add($"L1 family '{family}' references unknown ID '{id}'");
            }
        }

        foreach (var (tId, tmpl) in _templates)
        {
            foreach (var (secName, sec) in tmpl.Sections)
            {
                foreach (var id in sec.PriorityExerciseTypes)
                {
                    if (!_catalogIds.Contains(id))
                        errors.Add($"Template '{tId}' section '{secName}' priorityExerciseTypes: unknown ID '{id}'");
                }
            }
        }

        // Validate style substitutions — skip entries containing wildcards (they are exclusion patterns)
        foreach (var sub in _substitutions)
        {
            foreach (var id in sub.Rejects.Concat(sub.SubstituteWith).Where(id => !id.Contains('*')))
            {
                if (!_catalogIds.Contains(id))
                    errors.Add($"StyleSubstitution '{sub.Label}': unknown ID '{id}'");
            }
        }

        // Validate scope-constraints.json: every content type key must be a valid ContentBlockType
        var knownScopes = _scopeConstraints.Keys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var (scopeName, byType) in _scopeConstraints)
        {
            foreach (var contentTypeKey in byType.Keys)
            {
                if (!ContentBlockTypeExtensions.TryFromKebabCase(contentTypeKey, out _))
                    errors.Add($"scope-constraints.json scope '{scopeName}': unknown content type key '{contentTypeKey}'");
            }
        }

        // Validate section profile scope values against the same known scopes set
        foreach (var scopeValue in _sectionProfileService.GetAllScopeValues())
        {
            if (scopeValue != "full" && !knownScopes.Contains(scopeValue))
                errors.Add($"Section profile contains unknown scope value '{scopeValue}' (not in scope-constraints.json and not 'full')");
        }

        // Validate template override scope values and preferredContentType
        foreach (var (tId, tmpl) in _templates)
        {
            foreach (var (secName, sec) in tmpl.Sections)
            {
                if (sec.Scope is not null && sec.Scope != "full" && !knownScopes.Contains(sec.Scope))
                    errors.Add($"Template '{tId}' section '{secName}': unknown scope value '{sec.Scope}'");

                if (sec.PreferredContentType is not null)
                {
                    // Must be a known content type
                    if (!ContentBlockTypeExtensions.TryFromKebabCase(sec.PreferredContentType, out _))
                        errors.Add($"Template '{tId}' section '{secName}': preferredContentType '{sec.PreferredContentType}' is not a known content type");
                    else
                    {
                        // Must appear in section profile contentTypes for every applicable CEFR level.
                        // Use the template's levelVariations keys as the applicable set when non-empty;
                        // otherwise validate against all known levels.
                        var applicableLevels = tmpl.LevelVariations.Count > 0
                            ? tmpl.LevelVariations.Keys.ToArray()
                            : new[] { "A1", "A2", "B1", "B2", "C1", "C2" };
                        var normalSection = NormalizeSection(secName);
                        foreach (var lvl in applicableLevels)
                        {
                            var allowed = _sectionProfileService.GetAllowedContentTypes(normalSection, lvl);
                            if (allowed.Length > 0 && !allowed.Contains(sec.PreferredContentType, StringComparer.OrdinalIgnoreCase))
                                errors.Add($"Template '{tId}' section '{secName}': preferredContentType '{sec.PreferredContentType}' not in section profile contentTypes for level {lvl} (allowed: {string.Join(", ", allowed)})");
                        }
                    }
                }
            }
        }

        // Validate practice stages: stage IDs in cefrStageRequirements must exist in stages array,
        // and every active stage must have an itemsPerStage entry
        var stageIds = _practiceStages.Stages.Select(s => s.Id).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var (lvl, req) in _practiceStages.CefrStageRequirements)
        {
            foreach (var stageId in req.Stages.Concat(req.OptionalStages ?? []))
            {
                if (!stageIds.Contains(stageId))
                    errors.Add($"practice-stages.json cefrStageRequirements[{lvl}]: unknown stage id '{stageId}'");
            }
            foreach (var stageId in req.Stages)
            {
                if (!req.ItemsPerStage.ContainsKey(stageId))
                    errors.Add($"practice-stages.json cefrStageRequirements[{lvl}]: active stage '{stageId}' has no itemsPerStage entry");
            }
        }
        // Validate stage allowedExerciseCategories reference catalog IDs
        foreach (var stage in _practiceStages.Stages)
        {
            foreach (var id in stage.AllowedExerciseCategories)
            {
                if (!_catalogIds.Contains(id))
                    errors.Add($"practice-stages.json stage '{stage.Id}' allowedExerciseCategories: unknown ID '{id}'");
            }
        }

        if (errors.Count > 0)
            throw new InvalidOperationException(
                $"PedagogyConfigService startup validation failed:{Environment.NewLine}{string.Join(Environment.NewLine, errors)}");
    }

    private static string NormalizeLevel(string cefrLevel) =>
        CefrLevelNormalizer.Normalize(cefrLevel);

    private static string NormalizeSection(string section) => section.ToLowerInvariant() switch
    {
        "warmup" => "warmUp",
        "wrapup" => "wrapUp",
        _ => section,
    };

    private static string NormalizeLang(string lang) => lang.Trim().ToLowerInvariant();
}
