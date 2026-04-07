# Task 586 — Weakness Taxonomy for Conditional Block Injection

## Issue
#586 — feat: weakness taxonomy for conditional block injection (grammatical/lexical/orthographic)

## Scope Decision (Approved)
**Backend + AI only.** The API surface (`StudentDto.Weaknesses` as `List<string>`) remains unchanged.
The typed discrimination is an internal backend concept. A companion frontend issue will add the type
picker to the student form in a later task.

## Context
Currently `StudentWeaknesses` is `string[]` in `GenerationContext`. Three section profiles
(`practice.json`, `production.json`, `wrapup.json`) hold a flat `weaknessTargetingGuidance` string.
`BuildWeaknessTargetingForSection` applies the same guidance regardless of weakness category,
relying on model judgment for the coherence gate. This task formalizes the distinction with a typed
internal structure while keeping the external API unchanged.

## Data Model Design

### Internal `StudentWeakness` record (new, in `IPromptService.cs`)
```csharp
public record StudentWeakness(string Description, string WeaknessType = "grammatical");
```
Valid values: `"grammatical"`, `"lexical"`, `"orthographic"`.

This is used only inside `PromptService` and `GenerationContext` / `CurriculumContext`.
All weaknesses arriving from the existing `string[]` API are mapped to `StudentWeakness` with
`WeaknessType = "grammatical"` until the frontend type picker is implemented (companion issue).

### GenerationContext / CurriculumContext
`StudentWeaknesses` changes type from `string[]?` to `StudentWeakness[]?` in both records in
`IPromptService.cs`. All callers (`GenerateController`, `CourseService`) deserialize the JSON string
column to `string[]` as before, then map each string to `new StudentWeakness(s)` (defaults to
`"grammatical"`).

### SectionProfile
`WeaknessTargetingGuidance` changes from `string?` to `Dictionary<string, string>?` (keyed by
weakness type). JSON shape in section profiles changes to:
```json
"weaknessTargetingGuidance": {
  "grammatical": "MANDATORY ...",
  "lexical": "Include 1 exercise only if ...",
  "orthographic": "Include 1 exercise only if ..."
}
```

### API DTOs — NO CHANGE
`StudentDto`, `CreateStudentRequest`, `UpdateStudentRequest` keep `Weaknesses` as `List<string>`.
`Student.Weaknesses` JSON column format unchanged (`["foo","bar"]`).
No EF migration needed.

## Files to Change

### Backend models (internal)
| File | Change |
|------|--------|
| `backend/LangTeach.Api/AI/IPromptService.cs` | Add `StudentWeakness` record; change `StudentWeaknesses` type in `GenerationContext` and `CurriculumContext` |
| `backend/LangTeach.Api/AI/SectionProfile.cs` | Change `WeaknessTargetingGuidance` from `string?` to `Dictionary<string,string>?` |

### Services / Controllers
| File | Change |
|------|--------|
| `backend/LangTeach.Api/Controllers/GenerateController.cs` | Map `student.Weaknesses` (`List<string>`) to `StudentWeakness[]` (all default to `"grammatical"`) when building `GenerationContext` |
| `backend/LangTeach.Api/Services/CourseService.cs` | Same mapping change |
| `backend/LangTeach.Api/Services/IPedagogyConfigService.cs` | Update `GetWeaknessTargetingGuidance` signature: `(string sectionType, string weaknessType)` |
| `backend/LangTeach.Api/Services/PedagogyConfigService.cs` | Delegate updated signature to `SectionProfileService` |
| `backend/LangTeach.Api/Services/ISectionProfileService.cs` | Update `GetWeaknessTargetingGuidance` signature to match |
| `backend/LangTeach.Api/Services/SectionProfileService.cs` | Look up `WeaknessTargetingGuidance[weaknessType]`; fall back to `"grammatical"` key if not found |
| `backend/LangTeach.Api/Services/StudentService.cs` | No change needed (still serializes/deserializes `List<string>`) |
| `backend/LangTeach.Api/AI/PromptService.cs` | Update `SanitizeWeaknesses` to return `StudentWeakness[]`; update `BuildWeaknessTargetingForSection` to group by type; update lesson plan profile block to group by type |

### Config files
| File | Change |
|------|--------|
| `data/section-profiles/practice.json` | Replace flat string with typed object |
| `data/section-profiles/production.json` | Replace flat string with typed object |
| `data/section-profiles/wrapup.json` | Replace flat string with typed object |

### Tests
| File | Change |
|------|--------|
| `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` | Update existing weakness tests (type now `StudentWeakness[]`); add per-type routing and fallback tests |
| `backend/LangTeach.Api.Tests/Services/PedagogyConfigServiceTests.cs` | Update `GetWeaknessTargetingGuidance` call sites (now two args) |

## Detailed Logic Changes

### `SanitizeWeaknesses`
```csharp
private static StudentWeakness[] SanitizeWeaknesses(GenerationContext ctx) =>
    ctx.StudentWeaknesses
        ?.Where(w => InputSanitizer.Sanitize(w.Description).Length > 0)
        .Take(2)
        .Select(w => w with { Description = InputSanitizer.Sanitize(w.Description).Length > 120
            ? InputSanitizer.Sanitize(w.Description)[..120]
            : InputSanitizer.Sanitize(w.Description) })
        .ToArray() ?? [];
```

### `BuildWeaknessTargetingForSection`
```
weaknesses = SanitizeWeaknesses(ctx)
if empty → return ""
Group by WeaknessType.
For each group:
  guidance = GetWeaknessTargetingGuidance(sectionType, weaknessType)
  if null → skip this group
  weaknessText = join group descriptions with "; "
  append "STUDENT WEAKNESS TARGETING:\n" + "Documented weaknesses: {text}\n" + guidance.Replace("{weaknesses}", weaknessText)
Return combined string.
```

### Lesson Plan STUDENT ERROR PROFILE
```
Group weaknesses by type.
For each type group present (grammatical first, then lexical, orthographic):
  Print "{Type} weaknesses:" header, then numbered list of descriptions.
Design instruction follows (same as today).
Per-section guidance block:
  For each section with guidance, for each weakness type group:
    append label + per-type guidance string.
```

### Fallback rule in `SectionProfileService`
```csharp
public string? GetWeaknessTargetingGuidance(string sectionType, string weaknessType)
{
    var profile = GetProfile(sectionType);
    if (profile?.WeaknessTargetingGuidance is null) return null;
    var key = weaknessType is "grammatical" or "lexical" or "orthographic" ? weaknessType : "grammatical";
    return profile.WeaknessTargetingGuidance.GetValueOrDefault(key)
        ?? profile.WeaknessTargetingGuidance.GetValueOrDefault("grammatical");
}
```

## Section Profile Guidance Text

### practice.json
```json
"weaknessTargetingGuidance": {
  "grammatical": "MANDATORY — include at least 1 exercise, using a format appropriate to the lesson's CEFR level, that directly targets this student's documented grammatical weakness: {weaknesses}. Keep it brief (3-4 items). This exercise is in addition to the main lesson exercises, not a replacement.",
  "lexical": "Include 1 exercise only if the lesson topic creates a natural vocabulary context for: {weaknesses}. Otherwise omit.",
  "orthographic": "Include 1 exercise only if the lesson involves written production and the orthographic weakness is relevant to the written output: {weaknesses}. Otherwise omit."
}
```

### production.json
```json
"weaknessTargetingGuidance": {
  "grammatical": "Create a context where the grammatical weakness arises naturally: {weaknesses}.",
  "lexical": "Create a context where these lexical areas arise naturally — only if the weakness area is compatible with this lesson's linguistic content; do not import unrelated structures: {weaknesses}.",
  "orthographic": "Include written production opportunities that surface the orthographic weakness only if written output is a central component of this section: {weaknesses}."
}
```

### wrapup.json
```json
"weaknessTargetingGuidance": {
  "grammatical": "Ask the student to rate their confidence with each grammatical area (1-3 scale) and identify one specific difficulty that remains: {weaknesses}.",
  "lexical": "Ask the student to rate their confidence with each lexical area (1-3 scale) and identify one specific difficulty that remains: {weaknesses}.",
  "orthographic": "Ask the student to rate their confidence with each orthographic area (1-3 scale) and identify one specific difficulty that remains: {weaknesses}."
}
```

## Unit Tests to Add

1. `BuildWeaknessTargeting_GrammaticalWeakness_UsesGrammaticalGuidance`
2. `BuildWeaknessTargeting_LexicalWeakness_UsesLexicalGuidance`
3. `BuildWeaknessTargeting_OrthographicWeakness_UsesOrthographicGuidance`
4. `BuildWeaknessTargeting_UnknownType_FallsBackToGrammatical`
5. `LessonPlanPrompt_WeaknessesGroupedByType_InProfile`

## Acceptance Criteria Coverage
- [x] `weaknessType` field on internal `StudentWeakness` record (grammatical/lexical/orthographic); default = grammatical
- [x] `practice.json` `weaknessTargetingGuidance` replaced with typed object; flat string removed
- [x] All other section profiles with `weaknessTargetingGuidance` updated to typed structure
- [x] `BuildWeaknessTargetingForSection` selects per-type guidance; falls back to grammatical
- [x] `LessonPlanUserPrompt` STUDENT ERROR PROFILE groups weaknesses by type
- [x] Unit tests: each type routes correctly; fallback for unknown type
- [x] API surface unchanged (companion issue for frontend type picker)
- [x] `prior-findings.md` update done post-merge per issue instructions
