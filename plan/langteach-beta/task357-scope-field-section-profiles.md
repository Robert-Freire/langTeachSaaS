# Task #357: Add scope field to section profiles for generation length control

## Goal

Add a `scope` field (`"brief"` | `"full"`, default `"full"`) to section profiles and template overrides. Create `scope-constraints.json` that maps (scope, contentType) to a structural constraint text. Wire scope resolution into PromptService so WarmUp and WrapUp stop overproducing 3-scenario conversation blocks.

## Root cause (from #351-unfixed-structural-gaps.md)

The additive model (#351) made guidance strings correct and specific, but the conversation schema has no structural brevity concept. `ConversationUserPrompt` already has hardcoded "exactly 1 brief scenario" text but it gets ignored because the phrase arrays are unconstrained. Moving this to config-driven scope constraints (with explicit schema limits) gives the AI a structural anchor.

## Files changed

### New files
- `data/pedagogy/scope-constraints.json`

### Modified files
1. `backend/LangTeach.Api/AI/SectionProfile.cs` - add `Scope` to `SectionLevelProfile`
2. `backend/LangTeach.Api/AI/PedagogyConfig.cs` - add `Scope` to `SectionOverride`, add `ScopeConstraintsFile` record
3. `backend/LangTeach.Api/Services/ISectionProfileService.cs` - add `GetScope`
4. `backend/LangTeach.Api/Services/SectionProfileService.cs` - implement `GetScope`
5. `backend/LangTeach.Api/Services/IPedagogyConfigService.cs` - add `GetScopeConstraint` and `GetResolvedScope`
6. `backend/LangTeach.Api/Services/PedagogyConfigService.cs` - load scope-constraints.json, implement methods, add validation
7. `backend/LangTeach.Api/AI/PromptService.cs` - use scope constraints in all block prompts and LessonPlan
8. `data/section-profiles/warmup.json` - add `"scope": "brief"` at all 6 levels
9. `data/section-profiles/wrapup.json` - add `"scope": "brief"` at all 6 levels
10. `backend/LangTeach.Api/LangTeach.Api.csproj` - add scope-constraints.json embedded resource
11. `backend/LangTeach.Api.Tests/Services/SectionProfileServiceTests.cs` - GetScope tests
12. `backend/LangTeach.Api.Tests/Services/PedagogyConfigServiceTests.cs` - scope resolution and validation tests
13. `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` - scope constraint emission tests

## Detailed implementation

### Step 1: scope-constraints.json

Location: `data/pedagogy/scope-constraints.json`

Keys use kebab-case from `ContentBlockTypeExtensions.ToKebabCase()` (consistent with
startup validation which calls `TryFromKebabCase`).

```json
{
  "brief": {
    "conversation": "Generate exactly 1 scenario. Each role (roleAPhrases, roleBPhrases) must have 2-3 phrases maximum. Total interaction should fit within 2-3 minutes of class time.",
    "exercises": "Generate 2-3 exercises maximum across all formats.",
    "vocabulary": "5-8 items maximum.",
    "grammar": "Brief explanation only: 2-3 paragraphs, focus on the single key rule.",
    "reading": "Short text (100-150 words) with 2-3 comprehension questions.",
    "free-text": "2-3 short paragraphs maximum.",
    "homework": "1-2 tasks maximum."
  }
}
```

`"full"` scope has no entry (no constraint emitted, current behavior).

### Step 2: Data model changes

**SectionProfile.cs** - add `Scope` to `SectionLevelProfile`:
```csharp
public record SectionLevelProfile(
    string[] ContentTypes,
    string Guidance,
    DurationRange? Duration,
    string[] Competencies,
    string Scaffolding,
    string InteractionPattern,
    string[]? ValidExerciseTypes = null,
    ForbiddenExerciseType[]? ForbiddenExerciseTypes = null,
    LevelSpecificNote[]? LevelSpecificNotes = null,
    int? MinExerciseVariety = null,
    string? Scope = null   // "brief" | "full" | null (null = default "full")
);
```

**PedagogyConfig.cs** - add `Scope` to `SectionOverride` and add `ScopeConstraintsFile`:
```csharp
public record SectionOverride(
    bool Required,
    string? OverrideGuidance,
    string[] PriorityExerciseTypes,
    int? MinExerciseVarietyOverride,
    string? Notes,
    string? Scope = null   // optional; overrides section profile scope when set
);

// New record for scope-constraints.json
// Outer key: scope value (e.g., "brief")
// Inner key: content type kebab string (e.g., "conversation", "free-text")
// Value: constraint text to append to the prompt
public record ScopeConstraintsFile(Dictionary<string, Dictionary<string, string>> Scopes);
```

### Step 3: ISectionProfileService + SectionProfileService

**ISectionProfileService.cs** - new method:
```csharp
/// <summary>
/// Returns the scope value for a section at the given CEFR level.
/// Returns null if not specified in the section profile (caller should default to "full").
/// </summary>
string? GetScope(string sectionType, string cefrLevel);
```

**SectionProfileService.cs** - implementation:
```csharp
public string? GetScope(string sectionType, string cefrLevel)
{
    var profile = GetProfile(sectionType);
    if (profile is null) return null;
    var level = NormalizeLevel(cefrLevel);
    if (profile.Levels.TryGetValue(level, out var lp))
        return lp.Scope;
    return null;
}
```

SectionProfileService constructor adds validation: for each loaded level, if `Scope` is not null,
it must be `"brief"` or `"full"`. Log a warning for invalid values (non-fatal, do not throw, to match
the "non-fatal warning" spec for missing scope-constraints.json entries).

Actually, invalid scope values ARE fatal per AC: "unrecognized values rejected at startup."
Throw `InvalidOperationException` for unknown scope values, just like PedagogyConfigService does for unknown exercise IDs.

### Step 4: IPedagogyConfigService + PedagogyConfigService

**IPedagogyConfigService.cs** - two new methods:
```csharp
/// <summary>
/// Resolves the scope for a section/level/template combination.
/// Resolution: template override scope > section profile scope > "full".
/// Returns "brief" or "full". Never returns null.
/// </summary>
string GetResolvedScope(string section, string level, string? templateId);

/// <summary>
/// Returns the scope constraint text for the given section, level, template, and content type.
/// Resolves scope first (template override > section profile > "full"), then looks up constraint.
/// Returns null when scope is "full" or no constraint is defined for (scope, contentType).
/// </summary>
string? GetScopeConstraint(string section, string level, string? templateId, string contentType);
```

**PedagogyConfigService.cs** changes:

a) Load scope-constraints.json in constructor (after templates, before validation):
```csharp
var scopeFile = LoadJson<ScopeConstraintsFile>(assembly, "LangTeach.Api.Pedagogy.scope-constraints.json");
_scopeConstraints = scopeFile.Scopes;
```

b) Add `_scopeConstraints` field: `Dictionary<string, Dictionary<string, string>>`

c) Implement `GetResolvedScope`:
```csharp
public string GetResolvedScope(string section, string level, string? templateId)
{
    // Template override takes precedence
    if (templateId is not null)
    {
        var normalSection = NormalizeSection(section);
        if (_templates.TryGetValue(templateId, out var tmpl)
            && tmpl.Sections.TryGetValue(normalSection, out var secOverride)
            && secOverride.Scope is not null)
            return secOverride.Scope;
    }

    // Section profile default
    var profileScope = _sectionProfileService.GetScope(section, level);
    return profileScope ?? "full";
}
```

d) Implement `GetScopeConstraint`:
```csharp
public string? GetScopeConstraint(string section, string level, string? templateId, string contentType)
{
    var scope = GetResolvedScope(section, level, templateId);
    if (scope == "full") return null;

    if (_scopeConstraints.TryGetValue(scope, out var byType)
        && byType.TryGetValue(contentType, out var constraint))
        return constraint;

    _log.LogDebug("PedagogyConfigService: no scope constraint for ({Scope}, {ContentType})", scope, contentType);
    return null;
}
```

e) Add scope validation in `ValidateCrossLayerRefs` (called in constructor after all data is loaded):
```csharp
// Validate scope-constraints.json content type keys
var knownScopes = _scopeConstraints.Keys.ToHashSet(StringComparer.OrdinalIgnoreCase);
foreach (var (scopeName, byType) in _scopeConstraints)
{
    foreach (var contentTypeKey in byType.Keys)
    {
        if (!ContentBlockTypeExtensions.TryFromKebabCase(contentTypeKey, out _))
            errors.Add($"scope-constraints.json scope '{scopeName}': unknown content type key '{contentTypeKey}'");
    }
}

// Validate template override scope values
foreach (var (tId, tmpl) in _templates)
{
    foreach (var (secName, sec) in tmpl.Sections)
    {
        if (sec.Scope is not null && sec.Scope != "full" && !knownScopes.Contains(sec.Scope))
            errors.Add($"Template '{tId}' section '{secName}': unknown scope value '{sec.Scope}'");
    }
}
```

Note: section profile scope values are validated in SectionProfileService (it owns those records).
Non-fatal warning (rule 3 from issue spec) for sections with a scope but no matching contentType entry is logged at `Debug` level in `GetScopeConstraint` - no startup validation needed for that case.

### Step 5: config file updates

**warmup.json**: add `"scope": "brief"` to each of the 6 level entries (A1-C2). Example:
```json
"A1": {
  "contentTypes": ["conversation"],
  "guidance": "...",
  "duration": { "min": 2, "max": 3 },
  "scope": "brief",   // <-- new
  ...
}
```

**wrapup.json**: same pattern at all 6 levels.

No changes to practice.json, presentation.json, production.json (they default to "full").

**template-overrides.json**: no data changes. The `scope` field in `SectionOverride` is optional and
wirable for future use; no existing template entries need it yet.

### Step 6: PromptService changes

**ConversationUserPrompt**: remove hardcoded "Include exactly 1 brief scenario..." text. Replace with
config-driven scope constraint lookup:

```csharp
private string ConversationUserPrompt(GenerationContext ctx)
{
    var topic = Sanitize(ctx.Topic);
    var level = Sanitize(ctx.CefrLevel);
    var section = ctx.SectionType;

    if (string.Equals(section, "WarmUp", StringComparison.OrdinalIgnoreCase))
    {
        var guidance = _profiles.GetGuidance("warmup", level);
        var constraint = _pedagogy.GetScopeConstraint("warmup", level, TemplateName(ctx), "conversation");
        var prompt = $$"""
        Generate a warm-up icebreaker conversation activity for a {{level}} level lesson on "{{topic}}". Return JSON:
        {"scenarios":[{"setup":"","roleA":"Teacher","roleB":"Student","roleAPhrases":[""],"roleBPhrases":[""]}]}
        {{guidance}}
        """;
        if (!string.IsNullOrEmpty(constraint))
            prompt += "\n" + constraint;
        return prompt;
    }

    if (string.Equals(section, "WrapUp", StringComparison.OrdinalIgnoreCase))
    {
        var guidance = _profiles.GetGuidance("wrapup", level);
        var constraint = _pedagogy.GetScopeConstraint("wrapup", level, TemplateName(ctx), "conversation");
        var prompt = $$"""
        Generate a wrap-up reflection conversation for a {{level}} level lesson on "{{topic}}". Return JSON:
        {"scenarios":[{"setup":"","roleA":"Teacher","roleB":"Student","roleAPhrases":[""],"roleBPhrases":[""]}]}
        {{guidance}}
        """;
        if (!string.IsNullOrEmpty(constraint))
            prompt += "\n" + constraint;
        return prompt;
    }

    return $$"""
    Generate conversation scenarios for the lesson on "{{topic}}". Return JSON:
    {"scenarios":[{"setup":"","roleA":"","roleB":"","roleAPhrases":[""],"roleBPhrases":[""]}]}
    Include 2-3 scenarios using {{level}}-appropriate language.
    """;
}
```

Where `TemplateName(ctx)` is a helper:
```csharp
private string? TemplateName(GenerationContext ctx) =>
    string.IsNullOrEmpty(ctx.TemplateName) ? null : ctx.TemplateName;
```

Actually `ctx.TemplateName` is already nullable (string?). But PedagogyConfigService looks up by
template name, not ID. Need to resolve via `GetTemplateOverrideByName` first, or pass the name
and let PedagogyConfigService handle it.

Looking at existing code: `_pedagogy.GetTemplateOverrideByName(templateName)` is called in LessonPlanUserPrompt.
The `GetResolvedScope`/`GetScopeConstraint` methods should accept a template NAME (not ID) to be consistent.
PedagogyConfigService internally resolves name to ID, just like existing code does for `GetTemplateOverride`.

Actually, looking at PedagogyConfigService, templates are keyed by ID but `GetTemplateOverrideByName` does
case-insensitive name matching. For simplicity, `GetScopeConstraint` will take `string? templateId` and
individual block prompts need to resolve the template name to ID first.

Alternatively: change the signature to accept `string? templateName` and do internal resolution.
This is cleaner since PromptService doesn't have the ID (it only has the display name from GenerationContext).

**Decision:** `GetResolvedScope` and `GetScopeConstraint` accept `string? templateName` (display name),
resolved internally via `GetTemplateOverrideByName`. This matches the pattern already used in LessonPlanUserPrompt.

**Other individual block prompts**: VocabularyUserPrompt, GrammarUserPrompt, ExercisesUserPrompt, ReadingUserPrompt, HomeworkUserPrompt, FreeTextUserPrompt. Each gets scope constraint appended. The section type must come from `ctx.SectionType` (which may be null for non-section-specific calls - in which case scope defaults to "full" and constraint is null).

For each prompt method that has a `ctx.SectionType`:
```csharp
var constraint = _pedagogy.GetScopeConstraint(ctx.SectionType ?? "", ctx.CefrLevel, ctx.TemplateName, "vocabulary"); // etc.
if (!string.IsNullOrEmpty(constraint))
    prompt += "\n" + constraint;
```

**LessonPlanUserPrompt**: In the section guidelines loop, append scope label when scope is "brief":
```csharp
var scope = _pedagogy.GetResolvedScope(sectionName, cefrLevel, templateName);
var scopeLabel = scope == "brief" ? ", scope: brief" : "";
var durationStr = duration != null ? $" ({duration.Min}-{duration.Max} min{scopeLabel})" :
                  (scope == "brief" ? " (scope: brief)" : "");
sbSections.AppendLine($"- {sectionName}{durationStr}: {baseGuidance}");
```

This produces: `- warmUp (2-3 min, scope: brief): [guidance]`

### Step 7: csproj update

Add to embedded resources:
```xml
<EmbeddedResource Include="..\..\data\pedagogy\scope-constraints.json"
                  Link="Pedagogy\scope-constraints.json" />
```

### Step 8: Unit tests

**SectionProfileServiceTests.cs** (add to existing file):
- `GetScope_WarmUp_ReturnsBreif` - warmup A1 returns "brief"
- `GetScope_Production_ReturnsNull` - production B1 returns null (no scope set)
- `GetScope_UnknownSection_ReturnsNull` - unknown section returns null

**PedagogyConfigServiceTests.cs** (add to existing file):
- `GetResolvedScope_NoOverride_ReturnsProfileScope` - warmup A1 returns "brief" from section profile
- `GetResolvedScope_TemplateOverrideWins_ReturnsFull` - when a template override sets scope: "full", returns "full" even if section profile says "brief"
- `GetResolvedScope_NoScopeAnywhere_ReturnsFull` - practice B1 with no template returns "full"
- `GetScopeConstraint_BriefConversation_ReturnsConstraintText` - returns "Generate exactly 1 scenario..."
- `GetScopeConstraint_FullScope_ReturnsNull` - practice production returns null
- `GetScopeConstraint_UnknownContentType_ReturnsNull` - missing key returns null (no throw)
- Startup validation tests: invalid scope value in template override throws, invalid content type key in scope-constraints.json throws

**PromptServiceTests.cs** (add to existing file):
- `ConversationUserPrompt_WarmUp_IncludesScopeConstraint` - prompt contains "exactly 1 scenario" for warmup
- `ConversationUserPrompt_WrapUp_IncludesScopeConstraint` - prompt contains scope constraint for wrapup
- `ConversationUserPrompt_WarmUp_NoHardcodedBriefText` - ensure old hardcoded text is gone (replaced by config-driven text)
- `ConversationUserPrompt_Practice_NoScopeConstraint` - practice section gets no constraint appended
- `LessonPlanUserPrompt_WarmUp_HasScopeLabelInHeader` - "warmUp" line includes "scope: brief"
- `LessonPlanUserPrompt_Practice_NoScopeLabel` - practice line has no scope label

## Acceptance criteria mapping

| AC | Implementation |
|----|----------------|
| `scope` field in section profiles (optional, brief/full), unrecognized values rejected at startup | SectionLevelProfile.Scope + SectionProfileService validation in constructor |
| `scope` field in template override sections (optional) | SectionOverride.Scope |
| scope-constraints.json created with brief constraints for all 7 content types | Step 1 |
| Scope resolution: template override > section profile > "full" | GetResolvedScope in PedagogyConfigService |
| PromptService emits scope constraint in individual block prompts | Step 6, all Build*Prompt methods |
| PromptService emits scope label in LessonPlan section guidelines | Step 6, LessonPlanUserPrompt |
| Hardcoded "exactly 1 brief scenario" replaced by config-driven scope constraint | ConversationUserPrompt refactor |
| WarmUp profile updated with scope: "brief" at all levels | warmup.json |
| WrapUp profile updated with scope: "brief" at all levels | wrapup.json |
| Startup validation: scope-constraints.json content type keys match valid block types | ValidateCrossLayerRefs |
| Unit tests for scope resolution, constraint emission, startup validation | Step 8 |
| Teacher QA: Ana A1 and Marco B1 WarmUp produces 1 scenario with 2-3 phrases | Manual run after PR merge |

## Out of scope (per issue)

- `preferredContentType` on template overrides (Gaps 1/2: wrong content type selection)
- Wiring `validContentTypes` from section profiles into the prompt
- `reflection` content type for WrapUp
- Level-specific scope constraints
- Scope values beyond "brief" / "full"

## Key design notes

- `ScopeConstraintsFile` uses `Dictionary<string, Dictionary<string, string>>` deserialized with
  `JsonNamingPolicy.CamelCase` - dictionary keys are used as-is (not transformed by the policy).
  JSON keys must match exactly (case-insensitive comparison used at lookup time).
- `SectionProfileService` throws on unrecognized scope values (fatal per AC: "unrecognized values rejected").
  Template override scope values are validated in `ValidateCrossLayerRefs` (also fatal).
- Missing (scope, contentType) entries in scope-constraints.json produce a `Debug` log only (non-fatal,
  per issue: "because new content types may not need scope constraints immediately").
- `GetScopeConstraint` accepts display name (not ID) for templateId param, resolved internally.
