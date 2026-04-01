# Task 342: Move Pedagogical Rules from PromptService to Config

## Problem
Two pedagogical rule sets are hardcoded in C# constants/strings in `PromptService.cs`:

1. `SectionCoherenceRules` constant (lines 144-152): 5 rules about how sections relate
2. Weakness targeting block (lines 962-977): section-specific instructions for Practice/Production/WrapUp when student weaknesses are present

Both are pedagogical guidance from Isaac's spec, not engineering decisions. They should live in config files.

## Acceptance Criteria (from issue)
- [ ] Section coherence rules moved to `data/pedagogy/course-rules.json` (new field: `sectionCoherenceRules: string[]`)
- [ ] PromptService reads coherence rules from config instead of the C# constant
- [ ] Weakness targeting guidance moved to each section profile JSON (new field: `weaknessTargetingGuidance`)
- [ ] PromptService reads and injects weakness targeting from section profiles when weaknesses are present
- [ ] Hardcoded C# constants/strings deleted
- [ ] Backend unit tests verify rules are read from config
- [ ] Existing e2e tests still pass
- [ ] Data model changes reviewed by Sophy

## Approach

### 1. Section Coherence Rules

**Data change** — add `sectionCoherenceRules: string[]` to `data/pedagogy/course-rules.json`:
```json
"sectionCoherenceRules": [
  "The THEME of Warm Up must relate to the THEME of Presentation (same field, not identical).",
  "Practice MUST use EXCLUSIVELY content from Presentation. No new grammar or vocabulary.",
  "Production MUST be achievable with the language practiced in Practice.",
  "Wrap Up MUST refer to lesson content, not external topics.",
  "Linguistic level must NOT increase between sections. If Presentation is A2, Practice cannot demand B1."
]
```

**Model change** — `CourseRulesFile` record gets a new optional field:
```csharp
public record CourseRulesFile(
    CourseVarietyRules VarietyRules,
    Dictionary<string, Dictionary<string, SkillRange>> SkillDistribution,
    GrammarProgression GrammarProgression,
    string[]? SectionCoherenceRules = null
);
```

**Service change** — Add to `IPedagogyConfigService`:
```csharp
string[] GetSectionCoherenceRules();
```

Implementation in `PedagogyConfigService` returns `_courseRules.SectionCoherenceRules ?? []`.

**PromptService change** — Replace:
```csharp
private const string SectionCoherenceRules = ...
...
baseInstruction += "\n\n" + SectionCoherenceRules;
```
With:
```csharp
var coherenceRules = _pedagogy.GetSectionCoherenceRules();
if (coherenceRules.Length > 0)
{
    baseInstruction += "\n\nSECTION COHERENCE RULES (mandatory, never omit):\n" +
        string.Join("\n", coherenceRules.Select((r, i) => $"{i + 1}. {r}"));
}
```

### 2. Weakness Targeting Guidance

The current hardcoded block:
```csharp
$"Practice: include at least 1 exercise targeting: {weaknessText}\n" +
$"Production: create a context where these areas arise naturally.\n" +
$"WrapUp: invite the student to reflect on progress with these topics."
```

The guidance is section-specific but NOT level-specific. It belongs at the section profile top level (not inside each CEFR level entry).

**Model change** — Add optional field to `SectionProfile`:
```csharp
public record SectionProfile(
    string SectionType,
    Dictionary<string, SectionLevelProfile> Levels,
    string? WeaknessTargetingGuidance = null
);
```

The template may contain `{weaknesses}` as a placeholder for the weakness list (only Practice needs this).

**Data changes** — Add field to 3 section profiles:
- `data/section-profiles/practice.json`: `"weaknessTargetingGuidance": "include at least 1 exercise targeting: {weaknesses}"`
- `data/section-profiles/production.json`: `"weaknessTargetingGuidance": "create a context where these areas arise naturally."`
- `data/section-profiles/wrapup.json`: `"weaknessTargetingGuidance": "invite the student to reflect on progress with these topics."`
- `warmup.json` and `presentation.json`: no change (field absent = null = no targeting guidance)

**Service change** — Add to `ISectionProfileService`:
```csharp
string? GetWeaknessTargetingGuidance(string sectionType);
```

Implementation in `SectionProfileService`: return `GetProfile(sectionType)?.WeaknessTargetingGuidance`.

Add to `IPedagogyConfigService`:
```csharp
string? GetWeaknessTargetingGuidance(string sectionType);
```

Implementation in `PedagogyConfigService`: delegates to `_sectionProfileService.GetWeaknessTargetingGuidance(sectionType)`.

**PromptService change** — Replace hardcoded weakness block (lines 969-977):
```csharp
if (weaknesses.Length > 0)
{
    var weaknessText = string.Join("; ", weaknesses);
    var sb = new StringBuilder("\n\nDECLARED WEAKNESSES (max 1-2 targeted exercises per lesson):\n");
    foreach (var section in SectionKeys.CanonicalOrder)
    {
        var guidance = _pedagogy.GetWeaknessTargetingGuidance(section);
        if (!string.IsNullOrEmpty(guidance))
        {
            var label = char.ToUpper(section[0]) + section[1..];
            sb.AppendLine($"{label}: {guidance.Replace("{weaknesses}", weaknessText, StringComparison.Ordinal)}");
        }
    }
    baseInstruction += sb.ToString().TrimEnd();
}
```

This produces the same prompt output as before, but reads from config.

## Files Changed
1. `data/pedagogy/course-rules.json` — add `sectionCoherenceRules` array
2. `data/section-profiles/practice.json` — add `weaknessTargetingGuidance`
3. `data/section-profiles/production.json` — add `weaknessTargetingGuidance`
4. `data/section-profiles/wrapup.json` — add `weaknessTargetingGuidance`
5. `backend/LangTeach.Api/AI/PedagogyConfig.cs` — update `CourseRulesFile` record
6. `backend/LangTeach.Api/AI/SectionProfile.cs` — add `WeaknessTargetingGuidance` to `SectionProfile`
7. `backend/LangTeach.Api/Services/IPedagogyConfigService.cs` — add 2 methods
8. `backend/LangTeach.Api/Services/ISectionProfileService.cs` — add 1 method
9. `backend/LangTeach.Api/Services/PedagogyConfigService.cs` — implement new methods
10. `backend/LangTeach.Api/Services/SectionProfileService.cs` — implement new method
11. `backend/LangTeach.Api/AI/PromptService.cs` — delete constant and hardcoded block, read from config

## Tests
- `PedagogyConfigServiceTests.cs`: add tests for `GetSectionCoherenceRules` (returns 5 rules, not empty) and `GetWeaknessTargetingGuidance` (practice has placeholder, production/wrapup have text, warmup/presentation null)
- `PromptServiceTests.cs`: add/update tests verifying:
  - Lesson plan prompt includes coherence rules from config (verify text from config appears)
  - When weaknesses present: prompt contains weakness text from config templates
  - When no weaknesses: no weakness block injected

## Sophy Review
Required per acceptance criteria. Launch after implementation, before PR.

## E2E
No frontend changes. Existing e2e tests cover the prompt pipeline; no new e2e tests needed.
The generated prompt text is semantically identical, just sourced from config.
