# Task 423 - Verify and fix PedagogyConfigService: null-guard, glob, camelCase, C1-C2 shape

## Issue
[#423](https://github.com/Robert-Freire/langTeachSaaS/issues/423)

## Status
All four potential silent failures are **already fixed** in the service code. Three of four ACs have existing unit tests. One gap remains for AC #2 (NeverSubstituteWith glob constraint must appear in PromptService output).

## Analysis

### AC 1: persian.family null-guard - CONFIRMED FIXED
`PedagogyConfigService.ResolveLang` at line 458: `if (specific.Family is not null && ...)` is the null-guard. **Test already exists**: `GetL1Adjustments_Persian_DoesNotThrowAndReturnsSpecificNotes` (line 242 in PedagogyConfigServiceTests.cs).

### AC 2: neverSubstituteWith glob pattern - CONFIRMED FIXED, test gap
`ExpandForbiddenTypes` handles trailing-wildcard globs for forbidden exercise types. For `NeverSubstituteWith`, the design is intentional: the raw glob pattern is preserved and passed verbatim to the AI prompt (PromptService.cs line 1262-1263: `sb.AppendLine($"  Never substitute with: {string.Join(", ", sub.NeverSubstituteWith)}.")`). The AI interprets "EE-*" as a glob. **Test exists in PedagogyConfigServiceTests**: `GetAllStyleSubstitutions_RolePlay_NeverSubstituteWithPreservesGlobPattern` (line 269) confirms the raw pattern is preserved. **Gap**: no PromptService-level test verifies the "Never substitute with: EE-*." line appears in the built prompt.

### AC 3: warmUp/wrapUp camelCase normalization - CONFIRMED FIXED
`NormalizeSection` (line 611) maps "warmup" -> "warmUp" and "wrapup" -> "wrapUp". The `_templates` dictionary uses a case-insensitive `Sections` dictionary. **Test already exists**: `GetValidExerciseTypes_WarmUp_B1_ConversationTemplate_LowercaseKeyFindsWarmUpSection` (line 255).

### AC 4: C1-C2 vocabularyApproach shape - CONFIRMED FIXED
`GetVocabularyGuidance` checks `rule.VocabularyApproach` first (C1-C2 path), then falls back to `VocabularyPerLesson` (A1-B2). **Tests already exist**: `GetVocabularyGuidance_UpperLevels_ReturnsApproachString` and `GetVocabularyGuidance_LowerLevels_ReturnsNumericFields` (lines 134-154).

### AC 5: All 536+ existing backend tests continue to pass
Verified by running the test suite.

## Implementation Plan

Only one new test needs to be added:

### PromptServiceTests.cs - Add NeverSubstituteWith glob test
In `PromptServiceTests.cs`, add a test that verifies when teacher notes trigger a substitution, the prompt output contains the "Never substitute with: EE-*." constraint:

```
CurriculumUserPrompt_InjectsNeverSubstituteWithGlobPattern_WhenRolePlayRejected
```

- Build a `CurriculumContext` with `teacherNotes` containing "role-play"
- Call `BuildCurriculumPrompt`
- Assert prompt contains "Never substitute with" and "EE-*"

No changes to service code are needed. The task is purely confirmatory with one missing test.

## Files to touch
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` - Add 1 test
