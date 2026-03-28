# Task 325: Integrate PedagogyConfigService into PromptService

## Issue
#325 — Integrate PedagogyConfigService into PromptService (replace hardcoded rules)

## Context

`PromptService.cs` currently:
- Uses `ISectionProfileService` for section guidance strings and content type filtering
- Hardcodes Reading & Comprehension and Exam Prep template blocks as if/else string literals (lines 309-329)
- Has no knowledge of grammar scope, vocabulary targets, exercise type constraints, or L1 adjustments from the pedagogy JSON layers built in tasks #319-#324

This task wires `IPedagogyConfigService` into `PromptService` so prompt composition becomes data-driven.

## Key codebase observations

**Template name vs ID mismatch**: `ctx.TemplateName` is set to `template?.Name` from the DB (e.g., "Reading & Comprehension"). `GetTemplateOverride(string templateId)` expects an ID like "reading-comprehension". Need a `GetTemplateOverrideByName(string name)` lookup.

**ExerciseTypeEntry name**: `PedagogyConfig.cs` has `ExerciseTypeEntry(string Id, string Category)` but the JSON has a `name` field. Need to add `Name` to the record so exercise types can be described by name in prompts.

**SectionProfileService relationship**: Keep both services. `ISectionProfileService.GetGuidance()` provides narrative guidance strings embedded in section descriptions. `IPedagogyConfigService` provides exercise types, grammar scope, vocabulary, L1, templates. Additive, no refactoring.

**Section coherence rules static string** (from `plan/pedagogy-specification/pedagogy-config-architecture.md` Additional Layers section):
```
SECTION COHERENCE RULES (mandatory, never omit):
1. The THEME of Warm Up must relate to the THEME of Presentation (same field, not identical).
2. Practice MUST use EXCLUSIVELY content from Presentation. No new grammar or vocabulary.
3. Production MUST be achievable with the language practiced in Practice.
4. Wrap Up MUST refer to lesson content, not external topics.
5. Linguistic level must NOT increase between sections. If Presentation is A2, Practice cannot demand B1.
```
This is always injected in `LessonPlanUserPrompt`, never configurable.

**`Program.cs`**: `IPedagogyConfigService` already registered from #324. No change needed.

**Difficulty integration** (from spec): append to practice/production/wrapup only when `ctx.StudentWeaknesses` is non-empty. Cap: max 1-2 weakness-targeted items per lesson. Note: `BuildSystemPrompt` already handles `StudentDifficulties` (the structured `DifficultyDto[]`). This AC targets `StudentWeaknesses` (string[]).

## Files to Modify

### 1. `backend/LangTeach.Api/AI/PedagogyConfig.cs`

Add `Name` field to `ExerciseTypeEntry`:
```csharp
public record ExerciseTypeEntry(string Id, string Name, string Category);
```
No other changes.

### 2. `backend/LangTeach.Api/Services/IPedagogyConfigService.cs`

Add two methods:

```csharp
/// Returns the template override entry whose Name matches (case-insensitive display name lookup).
/// Returns null if not found. Use when TemplateName from the DB is a display name, not an ID.
TemplateOverrideEntry? GetTemplateOverrideByName(string name);

/// Returns the display name for an exercise type ID. Returns the ID itself if not found.
string GetExerciseTypeName(string id);
```

### 3. `backend/LangTeach.Api/Services/PedagogyConfigService.cs`

After loading the catalog in constructor, build name dict:
```csharp
private readonly Dictionary<string, string> _exerciseNames; // id (ci) -> name
```

```csharp
// After _catalogIds is built:
_exerciseNames = catalog.ExerciseTypes.ToDictionary(
    e => e.Id,
    e => e.Name,
    StringComparer.OrdinalIgnoreCase);
```

Implement new interface methods:
```csharp
public TemplateOverrideEntry? GetTemplateOverrideByName(string name) =>
    _templates.Values.FirstOrDefault(t => string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase));

public string GetExerciseTypeName(string id) =>
    _exerciseNames.TryGetValue(id, out var name) ? name : id;
```

### 4. `backend/LangTeach.Api/AI/PromptService.cs`

**Constructor**: Add `IPedagogyConfigService` injection alongside existing `ISectionProfileService`.

```csharp
private readonly IPedagogyConfigService _pedagogy;

public PromptService(ISectionProfileService profiles, IPedagogyConfigService pedagogy)
{
    _profiles = profiles;
    _pedagogy = pedagogy;
}
```

**New private helpers**:

```csharp
private const string SectionCoherenceRules =
    "SECTION COHERENCE RULES (mandatory, never omit):\n" +
    "1. The THEME of Warm Up must relate to the THEME of Presentation (same field, not identical).\n" +
    "2. Practice MUST use EXCLUSIVELY content from Presentation. No new grammar or vocabulary.\n" +
    "3. Production MUST be achievable with the language practiced in Practice.\n" +
    "4. Wrap Up MUST refer to lesson content, not external topics.\n" +
    "5. Linguistic level must NOT increase between sections. If Presentation is A2, Practice cannot demand B1.";

private string BuildExerciseGuidanceBlock(string section, string level)
// Returns list of valid exercise type IDs with names (top 10), + forbidden IDs list
// Format: "EXERCISE GUIDANCE for {section} at {level}:\nAllowed: EO-01 (Closed role-play), ...\nForbidden: GR-01, GR-02, ..."

private string BuildGrammarScopeBlock(string level)
// Returns in-scope and out-of-scope grammar from CEFR level rules
// Format: "GRAMMAR SCOPE for {level}:\nIn scope: ...\nOut of scope: ..."

private string BuildVocabularyBlock(string level)
// Returns numeric targets (A1-B2) or approach string (C1-C2)
// Format: "VOCABULARY TARGET for {level}: 8-12 productive items, 18-25 receptive items" or
//         "VOCABULARY APPROACH: ..." for C1-C2

private string BuildL1Block(L1Adjustments adj, string nativeLang)
// Returns increase/decrease emphasis, additional types, notes
// Format: "L1 ADJUSTMENTS for {nativeLang} speakers:\nIncrease emphasis: ...\nDecrease emphasis: ...\nNotes: ..."

private string BuildTemplateOverrideBlock(TemplateOverrideEntry entry, string level)
// Returns per-section overrideGuidance from the template JSON, replacing the hardcoded if/else
// Iterates entry.Sections, emits sections with non-null overrideGuidance
// Also emits level variation if present for this level
```

**`LessonPlanUserPrompt` changes** (the biggest change):

1. After `baseInstruction` is built, replace the hardcoded R&C/Exam Prep if/else blocks:
   ```csharp
   // BEFORE: if (string.Equals(ctx.TemplateName, "Reading & Comprehension", ...)) { baseInstruction += "..." }
   // AFTER:
   var templateEntry = ctx.TemplateName is not null
       ? _pedagogy.GetTemplateOverrideByName(ctx.TemplateName)
       : null;
   if (templateEntry is not null)
       baseInstruction += BuildTemplateOverrideBlock(templateEntry, cefrLevel);
   ```

2. Append grammar scope block:
   ```csharp
   baseInstruction += "\n\n" + BuildGrammarScopeBlock(cefrLevel);
   ```

3. Append vocabulary constraints block:
   ```csharp
   baseInstruction += "\n\n" + BuildVocabularyBlock(cefrLevel);
   ```

4. Append L1 adjustments when native language known:
   ```csharp
   if (!string.IsNullOrEmpty(ctx.StudentNativeLanguage))
   {
       var l1 = _pedagogy.GetL1Adjustments(ctx.StudentNativeLanguage);
       if (l1 is not null)
           baseInstruction += "\n\n" + BuildL1Block(l1, ctx.StudentNativeLanguage);
   }
   ```

5. Append section coherence rules (always):
   ```csharp
   baseInstruction += "\n\n" + SectionCoherenceRules;
   ```

6. Append difficulty targeting when student has weaknesses:
   ```csharp
   if (ctx.StudentWeaknesses is { Length: > 0 })
   {
       var weaknessText = string.Join("; ", ctx.StudentWeaknesses.Take(2).Select(Sanitize));
       baseInstruction +=
           $"\n\nDECLARED WEAKNESSES (max 1-2 targeted exercises per lesson):\n" +
           $"Practice: include at least 1 exercise targeting: {weaknessText}\n" +
           $"Production: create a context where these areas arise naturally.\n" +
           $"WrapUp: invite student to reflect on progress with these topics.";
   }
   ```

**`ExercisesUserPrompt` changes**: Add exercise guidance block for practice section.
- Make non-static (needs `_pedagogy`)
- Append `BuildExerciseGuidanceBlock("practice", ctx.CefrLevel)` after existing guidance

**`VocabularyUserPrompt` changes**: Add vocabulary constraints.
- Make non-static (needs `_pedagogy`)
- Append `BuildVocabularyBlock(level)` to prompt

**`GrammarUserPrompt` changes**: Add grammar scope.
- Make non-static (needs `_pedagogy`)
- Append `BuildGrammarScopeBlock(cefrLevel)` to prompt

**`ReadingUserPrompt` changes**: Add vocabulary guidance (reading passages need level-appropriate vocabulary).
- Make non-static (needs `_pedagogy`)
- Append `BuildVocabularyBlock(level)` to clarify vocabulary expectations

**`HomeworkUserPrompt` changes**: Add vocabulary guidance.
- Make non-static (needs `_pedagogy`)
- Append `BuildVocabularyBlock(level)` so homework vocabulary aligns with level targets

**`FreeTextUserPrompt` changes**: Add level vocabulary guidance.
- Make non-static (needs `_pedagogy`)
- Append `BuildVocabularyBlock(level)` to prompt

**`ConversationUserPrompt` changes**: No structural change. Already uses `ISectionProfileService.GetGuidance()` for section-specific guidance. This is correct and sufficient. Just make sure it works with instance access (already non-static).

### 5. `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs`

Update test setup to use real `PedagogyConfigService` (same pattern as `SectionProfileService`):
```csharp
private static readonly IPedagogyConfigService PedagogyService =
    new PedagogyConfigService(
        NullLogger<PedagogyConfigService>.Instance,
        ProfileService);

private readonly PromptService _sut = new(ProfileService, PedagogyService);
```

New test methods:

1. **`LessonPlanUserPrompt_ContainsSectionCoherenceRules`**: verify "SECTION COHERENCE RULES" in output
2. **`LessonPlanUserPrompt_InjectsTemplateOverride_WhenReadingComprehension`**: set `TemplateName = "Reading & Comprehension"`, verify template override guidance present and hardcoded strings gone (no literal "300-500 words" string from old code that would not come from the JSON now)
3. **`LessonPlanUserPrompt_InjectsTemplateOverride_WhenExamPrep`**: set `TemplateName = "Exam Prep"`, verify exam-prep override guidance present
4. **`LessonPlanUserPrompt_NoTemplateBlock_WhenTemplateNameNull`**: no template block injected
5. **`LessonPlanUserPrompt_ContainsGrammarScope`**: verify "GRAMMAR SCOPE" in output, in-scope items present
6. **`LessonPlanUserPrompt_InjectsL1Adjustments_WhenNativeLanguageKnown`**: set `StudentNativeLanguage = "Italian"` (Italian is listed in the romance family in l1-influence.json), verify "L1 ADJUSTMENTS" block
7. **`LessonPlanUserPrompt_NoL1Block_WhenNativeLanguageNull`**: no "L1 ADJUSTMENTS" block
8. **`LessonPlanUserPrompt_InjectsDifficultyTargeting_WhenWeaknessesPresent`**: set `StudentWeaknesses = ["articles"]`, verify weakness text in output
9. **`GrammarUserPrompt_ContainsGrammarScope`**: verify "GRAMMAR SCOPE" in output
10. **`VocabularyUserPrompt_ContainsVocabularyConstraints`**: verify vocabulary target block
11. **`ExercisesUserPrompt_ContainsExerciseGuidance`**: verify "EXERCISE GUIDANCE" block

**Update existing R&C and Exam Prep tests**: The existing tests (`ReadingComprehensionTemplate_*`, `ExamPrepTemplate_*`) assert for hardcoded strings like "READING & COMPREHENSION TEMPLATE REQUIREMENTS" and "300-500 words" which will no longer be present after the change. Update these tests to assert for content from the template-overrides.json data instead (or replace with the new snapshot tests below).

Snapshot tests (3 representative cases, just verify key content present):
12. **`Snapshot_A1GrammarFocus_LessonPlan`**: A1 level + Grammar Focus template, check: section coherence rules, grammar scope, vocabulary block, template guidance all present
13. **`Snapshot_B2ReadingComprehension_LessonPlan`**: B2 level + R&C template, check: reading template override, grammar scope (B2 structures), L1 adjustments if native lang
14. **`Snapshot_C1Conversation_LessonPlan`**: C1 level + Conversation template, check: section coherence, C1 vocabulary approach string

## Implementation order

1. `PedagogyConfig.cs` - add `Name` to `ExerciseTypeEntry`
2. `IPedagogyConfigService.cs` - add two methods
3. `PedagogyConfigService.cs` - implement new methods + `_exerciseNames`
4. `PromptService.cs` - add injection, helpers, update all prompt methods
5. `PromptServiceTests.cs` - update setup, add new tests
6. Run `dotnet test` to verify all existing + new tests pass

## SectionProfileService clarification (for the code)

Both services coexist in `PromptService`:
- `ISectionProfileService._profiles.GetGuidance(section, level)` → narrative strings embedded in section descriptions in `LessonPlanUserPrompt` (warmUp guidance line, practice hint, production guidance line). Keep as is.
- `IPedagogyConfigService._pedagogy.*` → exercise type lists, grammar scope, vocabulary targets, L1 adjustments, template overrides. All NEW injections.

No adapter pattern needed. No delegation chain change. The two interfaces are complementary, not overlapping.
