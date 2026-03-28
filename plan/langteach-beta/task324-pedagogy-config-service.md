# Task 324: Build PedagogyConfigService

## Issue
#324 — Build IPedagogyConfigService / PedagogyConfigService (load, validate, compose pedagogy JSON layers)

## Context

SectionProfileService is the reference singleton pattern: loads section-profiles/*.json as embedded resources, validates on startup, exposed via ISectionProfileService.

PedagogyConfigService follows the same pattern but loads pedagogy/* JSON files and composes them into exercise type lists for prompt generation.

### Key observations from codebase exploration

**Already embedded:** `data/pedagogy/exercise-types.json` (as `LangTeach.Api.Pedagogy.exercise-types.json`)

**Not yet embedded:** cefr-levels/*.json, l1-influence.json, template-overrides.json, course-rules.json, style-substitutions.json

**C1/C2 vocabulary:** Uses `vocabularyApproach: "string"` instead of `vocabularyPerLesson: { productive: {min,max}, receptive: {min,max} }` — the field NAME changes, not just the type. The deserialization model must handle both fields independently.

**Pattern expansion:** WarmUp forbiddenExerciseTypes uses `GR-*`, `EE-*`, `CO-*` patterns (null id + pattern field). These must be expanded against the exercise catalog to get concrete IDs.

**Composition algorithm (GetValidExerciseTypes):**
1. `cefrTypes = cefr[level].appropriateExerciseTypes`
2. `sectionTypes = section[section][level].validExerciseTypes` (may be null — fallback to cefrTypes)
3. `base = intersect(cefrTypes, sectionTypes)`
4. `forbidden = expand_patterns(section[section][level].forbiddenExerciseTypes)` → concrete ID list
5. `base = base - forbidden`
6. If templateId: re-order base putting `template[templateId][section].priorityExerciseTypes` first (don't add new types)
7. If nativeLang: `l1Extra = resolve(nativeLang).additionalExerciseTypes`; `base = base + l1Extra`
8. **RE-FILTER:** `base = base - forbidden` (L1 additions must not bypass section forbidden rules)
9. Return base (deduplicated, order preserved)

**L1 lookup strategy:**
1. Try `specificLanguages[lang]` → get `family` (if non-null) → return family adjustments + language-specific notes
2. If not in specificLanguages: scan `languageFamilies` to find which family has `lang` in its `languages[]` → return that family's adjustments
3. Return null if not found anywhere

**Critical test case from issue:** CO-06 added by Mandarin (sinitic-japonic family `additionalExerciseTypes: ["CO-06"]`) must be removed in re-filter step when section=WarmUp because WarmUp forbids `CO-*`.

## Files to Create

### 1. `backend/LangTeach.Api/AI/PedagogyConfig.cs`
C# records for all pedagogy JSON data models.

```csharp
// Exercise catalog (exercise-types.json)
record ExerciseCatalog(ExerciseTypeEntry[] ExerciseTypes);
record ExerciseTypeEntry(string Id, string Name, string Category, ...);

// CEFR level rules (cefr-levels/*.json)
// NOTE: A1-B2 use vocabularyPerLesson (numeric), C1-C2 use vocabularyApproach (string)
// Both fields declared nullable; deserialization picks up whichever is present
record CefrLevelRules(
    string Level,
    string[] GrammarInScope,
    string[] GrammarOutOfScope,
    string[] AppropriateExerciseTypes,
    InappropriateExerciseEntry[] InappropriateExerciseTypes,
    VocabularyPerLesson? VocabularyPerLesson,    // A1-B2 only
    string? VocabularyApproach,                  // C1-C2 only
    string InstructionLanguage,
    string MetalanguageLevel,
    string ErrorCorrection,
    string ScaffoldingDefault
);
record InappropriateExerciseEntry(string Id, string Reason);
record VocabularyPerLesson(VocabularyRange Productive, VocabularyRange Receptive);
record VocabularyRange(int Min, int Max);

// Output DTOs (returned by service methods)
record GrammarScope(string[] InScope, string[] OutOfScope);
record VocabularyGuidance(
    int? ProductiveMin, int? ProductiveMax,
    int? ReceptiveMin, int? ReceptiveMax,
    string? Approach  // set for C1/C2
);
record L1Adjustments(
    string[] AdditionalExerciseTypes,
    string[] IncreaseEmphasis,
    string[] DecreaseEmphasis,
    string Notes
);

// L1 influence (l1-influence.json)
record L1InfluenceFile(
    Dictionary<string, LanguageFamily> LanguageFamilies,
    Dictionary<string, SpecificLanguage> SpecificLanguages
);
record LanguageFamily(string[] Languages, string[] Strengths, string[] Weaknesses, LanguageFamilyAdjustments Adjustments);
record LanguageFamilyAdjustments(
    string[] IncreaseEmphasis, string[] DecreaseEmphasis,
    string[] AdditionalExerciseTypes, string[] TemplatePreference, string Notes
);
record SpecificLanguage(string? Family, string[] FalseFriends, string[] PositiveTransfer, string AdditionalNotes);

// Template overrides (template-overrides.json)
record TemplateOverridesFile(List<TemplateOverrideEntry> Templates);
record TemplateOverrideEntry(string Id, string Name, Dictionary<string, SectionOverride> Sections, Dictionary<string, string> LevelVariations, string[] Restrictions);
record SectionOverride(bool Required, string? OverrideGuidance, string[] PriorityExerciseTypes, int? MinExerciseVarietyOverride, string? Notes);

// Course rules (course-rules.json) — keep as JsonDocument or simple record
record CourseRulesFile(
    VarietyRules VarietyRules,
    Dictionary<string, Dictionary<string, SkillDistributionEntry>> SkillDistribution,
    GrammarProgression GrammarProgression
);
// ... sub-records as needed for VarietyRules, SkillDistributionEntry, GrammarProgression

// Style substitutions (style-substitutions.json)
record StyleSubstitutionsFile(StyleSubstitution[] Substitutions);
record StyleSubstitution(string[] Rejects, string Label, string[] SubstituteWith, string[] NeverSubstituteWith, string Rule);
```

### 2. `backend/LangTeach.Api/Services/IPedagogyConfigService.cs`

```csharp
public interface IPedagogyConfigService
{
    /// Full composition: CEFR ∩ section, minus forbidden, ordered by template priority, plus L1, re-filtered
    string[] GetValidExerciseTypes(string section, string level, string? templateId = null, string? nativeLang = null);

    /// Returns expanded forbidden exercise type IDs for a section+level (patterns expanded against catalog)
    string[] GetForbiddenExerciseTypeIds(string section, string level);

    /// Returns in-scope and out-of-scope grammar lists for the CEFR level
    GrammarScope GetGrammarScope(string level);

    /// Returns vocabulary guidance — numeric for A1-B2, approach string for C1-C2
    VocabularyGuidance GetVocabularyGuidance(string level);

    /// Returns L1 adjustments for the native language (null if language not found)
    L1Adjustments? GetL1Adjustments(string nativeLang);

    /// Returns template override entry (null if templateId not found)
    TemplateOverrideEntry? GetTemplateOverride(string templateId);

    /// Returns the full course rules configuration
    CourseRulesFile GetCourseRules();

    /// Returns substitution entries whose Rejects list contains any of the given type IDs
    StyleSubstitution[] GetStyleSubstitutions(string[] rejectedTypes);
}
```

### 3. `backend/LangTeach.Api/Services/PedagogyConfigService.cs`

Singleton. Constructor injects `ILogger<PedagogyConfigService>` and `ISectionProfileService`.

**Constructor loading order:**
1. Load exercise-types.json → build `_catalogIds` HashSet<string>
2. Load cefr-levels/*.json → `_cefrRules` Dictionary<string, CefrLevelRules> (key=uppercase level)
3. Load l1-influence.json → `_l1`
4. Load template-overrides.json → `_templates` Dictionary<string, TemplateOverrideEntry>
5. Load course-rules.json → `_courseRules`
6. Load style-substitutions.json → `_substitutions`
7. **Validate cross-layer refs** — see below
8. Log startup summary at Information level

**Startup validation** (throws InvalidOperationException on failure):
- All IDs in cefr[level].appropriateExerciseTypes exist in catalog
- All IDs in l1.languageFamilies[*].adjustments.additionalExerciseTypes/increaseEmphasis/decreaseEmphasis exist in catalog
- All IDs in templates[*].sections[*].priorityExerciseTypes exist in catalog
- All non-wildcard IDs in style-substitutions rejects/substituteWith exist in catalog
- Section profile validation: ISectionProfileService is not asked to validate (done by SectionProfileService itself)

**Private helpers:**
- `LoadJson<T>(string resourceName)` — open embedded stream, deserialize, throw on null
- `ExpandForbiddenPattern(string pattern)` — e.g. "GR-*" → all catalog IDs starting with "GR-"
- `ExpandForbiddenTypes(ForbiddenExerciseType[] raw)` → string[] of concrete IDs
- `NormalizeLevel(string level)` — same logic as SectionProfileService (prefix match to A1-C2)
- `NormalizeLang(string lang)` — lowercase, trim
- `ResolveLang(string lang)` → (LanguageFamilyAdjustments? familyAdj, SpecificLanguage? specific)

**Resource name constants:**
- Catalog: `"LangTeach.Api.Pedagogy.exercise-types.json"`
- CEFR prefix: `"LangTeach.Api.Pedagogy.CefrLevels."` (scan all matching)
- L1: `"LangTeach.Api.Pedagogy.l1-influence.json"`
- Templates: `"LangTeach.Api.Pedagogy.template-overrides.json"`
- CourseRules: `"LangTeach.Api.Pedagogy.course-rules.json"`
- Substitutions: `"LangTeach.Api.Pedagogy.style-substitutions.json"`

### 4. `backend/LangTeach.Api.Tests/Services/PedagogyConfigServiceTests.cs`

10+ tests using `NullLogger` and a real `SectionProfileService` (same as SectionProfileServiceTests pattern):

```csharp
private readonly SectionProfileService _sps = new(NullLogger<SectionProfileService>.Instance);
private readonly PedagogyConfigService _sut;

public PedagogyConfigServiceTests()
{
    _sut = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, _sps);
}
```

**Tests:**
1. `ServiceLoads_WithoutThrowing` — constructor completes (smoke test)
2. `GetValidExerciseTypes_Baseline_WarmUp_A1_ReturnsSectionIntersection` — result is subset of A1 appropriateExerciseTypes AND warmup A1 validExerciseTypes
3. `GetValidExerciseTypes_GrammarFocus_Practice_A1_DoesNotReturnForbiddenTypes` — no GR-* types that are in forbidden; wait warmup forbidden is GR-*, but for practice it's different. Actually for practice, warmup forbidden is irrelevant. Let me use: WarmUp A1 should not contain any GR-xx types (GR-* pattern forbidden)
4. `GetValidExerciseTypes_L1Mandarin_WarmUp_CO06_IsBlocked` — Mandarin adds CO-06 via L1, but WarmUp forbids CO-*, so CO-06 must NOT be in result
5. `GetValidExerciseTypes_GrammarFocusTemplate_Practice_HasPriorityFirst` — GR-01 (priority type) appears before non-priority types in result
6. `GetForbiddenExerciseTypeIds_WarmUp_A1_ExpandsAllGRPattern` — result contains all GR-xx IDs (e.g. GR-01 through GR-10)
7. `GetGrammarScope_A1_ReturnsInScopeAndOutOfScope` — InScope and OutOfScope both non-empty
8. `GetVocabularyGuidance_A1_ReturnsNumericFields` — ProductiveMin/Max non-null, Approach null
9. `GetVocabularyGuidance_C1_ReturnsApproachString` — Approach non-null, ProductiveMin null
10. `GetL1Adjustments_Mandarin_ReturnsCO06InAdditionalTypes` — additionalExerciseTypes contains "CO-06"
11. `GetL1Adjustments_UnknownLanguage_ReturnsNull` — returns null for unknown language
12. `GetStyleSubstitutions_RolePlay_ReturnsSubstitutesForEO01` — Rejects contains EO-01, returns substitution with EO-04/EO-08
13. `GetTemplateOverride_GrammarFocus_ReturnsPracticeMinVarietyOf3` — sections["practice"].MinExerciseVarietyOverride == 3
14. `CrossLayerValidation_AllReferencedIdsExistInCatalog` — iterates all referenced IDs in cefr rules and verifies they're in catalog (documents the integrity check)

## Files to Modify

### `backend/LangTeach.Api/LangTeach.Api.csproj`

Add EmbeddedResource entries after the existing pedagogy entry:

```xml
<EmbeddedResource Include="..\..\data\pedagogy\cefr-levels\*.json"
                  Link="Pedagogy\CefrLevels\%(Filename)%(Extension)" />
<EmbeddedResource Include="..\..\data\pedagogy\l1-influence.json"
                  Link="Pedagogy\l1-influence.json" />
<EmbeddedResource Include="..\..\data\pedagogy\template-overrides.json"
                  Link="Pedagogy\template-overrides.json" />
<EmbeddedResource Include="..\..\data\pedagogy\course-rules.json"
                  Link="Pedagogy\course-rules.json" />
<EmbeddedResource Include="..\..\data\pedagogy\style-substitutions.json"
                  Link="Pedagogy\style-substitutions.json" />
```

### `backend/LangTeach.Api/Services/ISectionProfileService.cs`

Add method to expose raw forbidden exercise types (needed by PedagogyConfigService for composition and pattern expansion):

```csharp
/// Returns the raw ForbiddenExerciseType entries for a section at the given CEFR level.
/// Used by PedagogyConfigService to expand patterns and compute forbidden IDs.
ForbiddenExerciseType[] GetRawForbiddenExerciseTypes(string sectionType, string cefrLevel);
```

### `backend/LangTeach.Api/Services/SectionProfileService.cs`

Implement `GetRawForbiddenExerciseTypes`:

```csharp
public ForbiddenExerciseType[] GetRawForbiddenExerciseTypes(string sectionType, string cefrLevel)
{
    var profile = GetProfile(sectionType);
    if (profile is null) return [];
    var level = NormalizeLevel(cefrLevel);
    if (profile.Levels.TryGetValue(level, out var lp))
        return lp.ForbiddenExerciseTypes ?? [];
    return [];
}
```

### `backend/LangTeach.Api/Program.cs`

After `ISectionProfileService` registration line 123:

```csharp
builder.Services.AddSingleton<IPedagogyConfigService, PedagogyConfigService>();
```

In eager-resolve section (after line 161):

```csharp
_ = app.Services.GetRequiredService<IPedagogyConfigService>();
```

## Implementation Notes

- JSON deserialization options: same `JsonSerializerOptions` as SectionProfileService (camelCase, case-insensitive, AllowReadingFromString)
- `GetValidExerciseTypes` deduplicated result: use `Distinct(StringComparer.OrdinalIgnoreCase)` before returning
- Pattern expansion: GR-* means prefix="GR-"; scan catalogIds where `id.StartsWith("GR-", OrdinalIgnoreCase)`
- NeverSubstituteWith in style-substitutions uses wildcard ("EE-*") — don't validate these against catalog (they're exclusion patterns, not references)
- CourseRulesFile deserialization: the JSON has nested objects (varietyRules, skillDistribution, grammarProgression); use concrete records for the fields used in tests, skip or use JsonElement for the rest
- `GetStyleSubstitutions(string[] rejectedTypes)`: filter substitutions where any element of `substitution.Rejects` is in `rejectedTypes` (case-insensitive)
- Debug logging: log each composition step in GetValidExerciseTypes (cefrTypes count, sectionTypes count, after intersection, after forbidden filter, after L1 merge, final count)

## Test Strategy

Tests instantiate real services against real embedded JSON (same approach as SectionProfileServiceTests). No mocking needed — the service is deterministic, fast, and in-process. Integration with real data is the right level here.

The "dangling reference fails startup" AC is satisfied by:
1. The constructor throwing `InvalidOperationException` when a bad ID is detected (production behavior)
2. Test 14 (`CrossLayerValidation_AllReferencedIdsExistInCatalog`) — asserts that the real data passes its own validation rules

## Out of Scope

- Wiring `IPedagogyConfigService` into `IPromptService` / `PromptService` — this is the next task after #324
- e2e tests — no user-visible behavior changes in this task, backend service only
- No new HTTP endpoints — pure service layer
