# Task 260 — Objective flow: curriculum entry learning targets feed into lesson generation prompt

**Issue:** #260
**Sprint:** Student-Aware Curriculum
**Priority:** P1:must
**Labels:** area:backend, area:ai

## Problem

When a teacher generates a lesson from a curriculum entry, the AI does not receive the entry's learning targets. The flow has two steps:

1. `CoursesController.GenerateLessonFromEntry()` — creates a Lesson record with `lesson.Objectives` set from the entry's `GrammarFocus`, `Competencies`, and `CompetencyFocus`
2. `GenerateController.Stream()` — builds `GenerationContext` from the lesson and calls Claude, but **ignores `lesson.Objectives`**

The `Objectives` string is stored but never injected into the prompt. Result: the AI generates a generic lesson without knowing what grammar/skills the session was planned to practice.

## Current state

- `lesson.Objectives` already exists (string, populated by step 1 as "Grammar: X. Competencies: Y. Skill focus: Z.")
- `GenerationContext` has no field for curriculum objectives
- `GenerateController.Stream()` loads the full `lesson` entity but doesn't use `lesson.Objectives`
- `PromptService.BuildLessonPlanPrompt()` has no pedagogical constraints section

Note: `CurriculumEntry.ContextDescription` does not exist (issue #257 did not add it). `PersonalizedContext` is deferred.

## Dependencies (both done)

- #255: `CurriculumEntry` fields added (GrammarFocus, Competencies, CompetencyFocus)
- #257: personalized context — partially done; ContextDescription field was not added to CurriculumEntry, so PersonalizedContext is deferred from this task

## What changes

### 1. Add `CurriculumObjectives` to `GenerationContext` (IPromptService.cs)

Add one optional field at the end of the record:

```csharp
public string? CurriculumObjectives { get; init; }
```

### 2. Improve objectives string in `CoursesController.GenerateLessonFromEntry()` (CoursesController.cs)

Expand the objectives to be more descriptive for the AI:

```csharp
var parts = new List<string>();
if (!string.IsNullOrEmpty(entry.GrammarFocus))
    parts.Add($"Grammar: {entry.GrammarFocus}");
if (!string.IsNullOrEmpty(entry.Competencies))
    parts.Add($"Communicative skills: {entry.Competencies}");
if (!string.IsNullOrEmpty(entry.CompetencyFocus))
    parts.Add($"CEFR skill focus: {entry.CompetencyFocus}");
var objectives = string.Join(". ", parts);
```

### 3. Pass `CurriculumObjectives` in `GenerateController` — both construction sites (GenerateController.cs)

There are two `GenerationContext` construction sites:
- `Stream()` method (line ~150) — used by the streaming endpoint
- private `Generate()` method (line ~296) — used by the non-streaming endpoint

Both must add:

```csharp
CurriculumObjectives: !string.IsNullOrEmpty(lesson.Objectives) ? lesson.Objectives : null
```

### 4. Inject pedagogical constraints in `PromptService.BuildLessonPlanPrompt()` (PromptService.cs)

When `ctx.CurriculumObjectives` is not null, append to the user prompt:

```
--- PEDAGOGICAL CONSTRAINTS (mandatory) ---
This lesson MUST practice the following planned learning targets:
{ctx.CurriculumObjectives}
All activities and examples must be designed to address these targets.
```

Standalone lessons (`CurriculumObjectives == null`): no section added, prompt unchanged.

### 5. Backend warning for fewer than 5 sections (GenerateController.cs)

Per AC: "Backend logs warning if generated lesson plan has fewer than 5 sections."

The save hook is in the private `Generate()` method at line ~356, after `_db.SaveChangesAsync(ct)`. For `ContentBlockType.LessonPlan` blocks, parse `response.Content` with `JsonDocument` and count top-level sections. If fewer than 5, log a warning:

```csharp
if (blockType == ContentBlockType.LessonPlan)
{
    try
    {
        using var doc = JsonDocument.Parse(response.Content);
        var sectionCount = doc.RootElement.GetArrayLength(); // or property count depending on schema
        if (sectionCount < 5)
            _logger.LogWarning("Generated lesson plan has only {Count} sections (expected >= 5). LessonId={LessonId}", sectionCount, lesson.Id);
    }
    catch { /* malformed JSON — Claude streaming save handles this separately */ }
}
```

**Note:** The streaming `Stream()` method saves incrementally and does not have a clean post-save hook. Apply the warning only in `Generate()` for now.

### 6. Unit tests

**PromptServiceTests.cs:**
- `BuildLessonPlanPrompt_IncludesPedagogicalConstraints_WhenCurriculumObjectivesPresent` — verify the constraints section appears
- `BuildLessonPlanPrompt_NoConstraintsSection_WhenCurriculumObjectivesNull` — verify standalone lessons are unchanged

**CoursesControllerTemplateTests.cs (or GenerateControllerTests.cs if it exists):**
- Verify `GenerateLessonFromEntry` sets `lesson.Objectives` with grammar, competencies, skill focus
- Standalone lesson generation: `CurriculumObjectives` null in context (regression test)

## Acceptance criteria mapping

| AC | Approach |
|----|----------|
| Lesson from entry receives full learning targets in prompt | CurriculumObjectives passed from lesson.Objectives in GenerateController |
| Personalized context flows into prompt | Deferred (CurriculumEntry.ContextDescription not yet added) |
| Generated lesson has Objectives field populated | Already working; improved string format |
| Backend warns if lesson plan has fewer than 5 sections | Warning log in content block save path (AC to be located during impl) |
| Unit test: GenerationContext includes curriculum targets | New test verifying lesson.Objectives flows to context |
| Unit test: prompt contains pedagogical constraints | New PromptServiceTests test |
| Standalone lessons still work | Regression test; null path unchanged |

## Files to change

- `backend/LangTeach.Api/AI/IPromptService.cs` — add `CurriculumObjectives` to GenerationContext
- `backend/LangTeach.Api/AI/PromptService.cs` — add pedagogical constraints section to BuildLessonPlanPrompt
- `backend/LangTeach.Api/Controllers/GenerateController.cs` — pass CurriculumObjectives from lesson
- `backend/LangTeach.Api/Controllers/CoursesController.cs` — improve objectives string construction
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` — 2 new tests
- `backend/LangTeach.Api.Tests/Controllers/CoursesControllerTemplateTests.cs` — verify objectives on lesson creation

## Out of scope

- `CurriculumEntry.ContextDescription` / PersonalizedContext (field doesn't exist; deferred)
- Vocabulary themes from template units (TemplateUnitRef lookup; deferred to #261 or later)
- Frontend display of objectives (that is #261, which depends on this)
- No DB migration needed (Lesson.Objectives already exists)
