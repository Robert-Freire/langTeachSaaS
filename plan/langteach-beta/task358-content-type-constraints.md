# Task 358 — Wire content type constraints into prompts

**Issue:** #358
**Branch:** worktree-task-t358-content-type-constraints
**Sprint:** sprint/pedagogical-quality

## Goal

Fix two structural gaps where the AI picks the wrong content type despite guidance text:
- Carmen R&C: Presentation generates grammar block instead of reading passage
- Ana Exam Prep: Production generates oral conversation instead of written exam tasks

## Approach

Two complementary changes to PromptService, both drawing from existing config data:

1. **validContentTypes** — read from section profiles (already loaded), emit in prompts so AI knows which types are valid for each section
2. **preferredContentType** — new optional field on template override section entries, emit as a directive in prompts for templates with strong opinions

No new JSON files. No new service. Reuses existing `SectionProfileService.GetAllowedContentTypes()`.

## Changes

### 1. PedagogyConfig.cs — add `PreferredContentType` to `SectionOverride`

```csharp
public record SectionOverride(
    bool Required,
    string? OverrideGuidance,
    string[] PriorityExerciseTypes,
    int? MinExerciseVarietyOverride,
    string? Notes,
    string? Scope = null,
    string? PreferredContentType = null   // NEW
);
```

### 2. PedagogyConfigService — expose getter + startup validation

New method:
```csharp
public string? GetPreferredContentType(string sectionName, string templateName)
```
Returns `PreferredContentType` from the template override section entry, or null.

Add to `ValidateCrossLayerRefs()`: for each template section with `preferredContentType`, verify it appears in `SectionProfileService.GetAllowedContentTypes(section, level)` for every CEFR level. Fail-fast on dangling references.

### 3. PromptService — LessonPlanUserPrompt section guidelines

After existing guidance line for each section, append:
```
  Valid content types: reading, grammar, vocabulary, freeText
  Preferred type: reading. Use this type unless there is a strong pedagogical reason not to.
```
- `validContentTypes` always appended (from `_sectionProfiles.GetAllowedContentTypes(sectionName, cefrLevel)`)
- `Preferred type:` line only when `GetPreferredContentType(sectionName, templateName)` returns non-null

### 4. PromptService — individual block prompts (reinforcement)

Each individual block prompt builder (ExercisesUserPrompt, ConversationUserPrompt, etc.) already receives `ctx` with `SectionType` and `TemplateName`. Add at the end of each builder:
- Valid content types from section profile
- Preferred type from template override (if present)

OR: add a shared helper `BuildContentTypeConstraintBlock(sectionType, cefrLevel, templateName)` called from each prompt builder to keep it DRY.

### 5. template-overrides.json — add `preferredContentType` to 3 section entries

```json
"reading-comprehension" > "presentation": { "preferredContentType": "reading" }
"exam-prep" > "production":              { "preferredContentType": "exercises" }
"exam-prep" > "practice":               { "preferredContentType": "exercises" }
```

### 6. Unit tests (PromptServiceTests.cs + PedagogyConfigServiceTests.cs)

- `preferredContentType` present in prompt when template has one
- `preferredContentType` absent from prompt when template has none
- Startup validation rejects dangling preferredContentType (type not in section profile)
- Startup validation accepts valid preferredContentType
- `validContentTypes` always present in section guidelines
- Individual block prompts include valid content types

## Acceptance criteria mapping

| AC | Covered by |
|----|-----------|
| `preferredContentType` accepted in template override section entries | PedagogyConfig.cs change |
| Startup validation: must be member of section profile contentTypes | ValidateCrossLayerRefs() addition |
| PromptService emits `validContentTypes` in LessonPlan section guidelines | PromptService change |
| PromptService emits `preferredContentType` in LessonPlan section guidelines (when present) | PromptService change |
| PromptService emits `validContentTypes` in individual block prompts | PromptService change |
| R&C template presentation updated with `preferredContentType: reading` | template-overrides.json |
| Exam Prep production updated with `preferredContentType: exercises` | template-overrides.json |
| Exam Prep practice updated with `preferredContentType: exercises` | template-overrides.json |
| Unit tests | PromptServiceTests + PedagogyConfigServiceTests |
| Teacher QA Carmen R&C: presentation = reading passage | manual QA run post-implementation |
| Teacher QA Ana Exam: production = written tasks with time/word limits | manual QA run post-implementation |

## Section profile update needed

`production.json` currently has `contentTypes: ["conversation"]` (A1-B1) and `["conversation", "reading"]` (B2+). Startup validation requires `preferredContentType` to be in the section's contentTypes. Since exam-prep targets B2.1 and written exam tasks (essay, formal letter) are structured production exercises, add `"exercises"` to production at B1, B2, C1, C2.

This is pedagogically sound: at B1+, a formal letter or essay IS an exercise with rubric/format requirements, not open conversation.

`data/section-profiles/production.json` — add "exercises" to B1, B2.1, B2.2, C1, C2 contentTypes arrays.

## Step 4 revised (individual block prompts)

The issue AC says to emit validContentTypes in individual block prompts as "reinforcement." This is appropriate framing: when the AI is already generating (e.g.) an exercises block for the Production section, the reinforcement says "valid types for this section are [exercises, conversation]; you have been asked to generate exercises which is the preferred type for this template." This confirms the selection is correct. Add a shared helper `BuildContentTypeContextBlock(sectionType, cefrLevel, templateName)` called from block prompt builders that have access to sectionType.

## Files to change

- `backend/LangTeach.Api/AI/PedagogyConfig.cs` — add field to SectionOverride record
- `backend/LangTeach.Api/Services/PedagogyConfigService.cs` — getter + validation
- `backend/LangTeach.Api/Services/IPedagogyConfigService.cs` — add GetPreferredContentType to interface
- `backend/LangTeach.Api/AI/PromptService.cs` — emit in LessonPlan + block prompts
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` — new tests
- `backend/LangTeach.Api.Tests/Services/PedagogyConfigServiceTests.cs` — new tests
- `data/pedagogy/template-overrides.json` — 3 entries
- `data/section-profiles/production.json` — add "exercises" to B1+ contentTypes

## Out of scope

- Frontend dropdown defaulting to preferredContentType
- `preferredContentType` on section profiles
- `requiredContentType` (too rigid)
- Exam Prep WarmUp briefing fix (that is issue #380, already done)
