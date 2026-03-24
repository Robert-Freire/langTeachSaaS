# Task #267: CEFR-Appropriate Exercise Selection Per Level

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/267

## Scope
Prompt engineering only. No new content types, renderers, or schema changes.

## What changes

### 1. `PromptService.cs` - `ExercisesUserPrompt`

Currently: returns a fixed instruction with no level-specific guidance.
After: appends a CEFR-band-specific paragraph based on the level.

Helper: private static `CefrLevelBand(string cefrLevel)` returning `"beginner"`, `"intermediate"`, or `"advanced"` mapped from A1/A2, B1/B2, C1/C2 respectively. Unknown levels default to intermediate.

Level-specific additions appended to the exercises user prompt:
- **A1/A2**: "For fill-in-blank items, always provide a word bank (list the options in the hint field). Do not include sentence transformation or error correction tasks — these are too cognitively demanding at this level. Prefer matching and categorization items."
- **B1/B2**: "Include at least 2 different exercise formats (e.g. fill-in-blank AND multiple-choice AND matching — do not rely on just one type). Include error correction or transformation items where the exercise formats support it."
- **C1/C2**: "Minimize purely mechanical items (basic fill-in-blank, simple matching). Prefer exercises that require inference, nuance, register awareness, or pragmatic appropriateness. Make exercises meaningful, not rote."

### 2. `PromptService.cs` - `LessonPlanUserPrompt`

Add a level-specific hint inside the practice section guideline (appended after the base instruction, before template-specific blocks):

- **A1/A2**: "For the practice section at this level, prefer matching and categorization. If fill-in-blank is used, include a word bank."
- **B1/B2**: "For the practice section at this level, use at least 2 different activity formats. Avoid relying on a single exercise type."
- **C1/C2**: "For the practice section at this level, minimize mechanical drills. Favour activities requiring nuance, register, or inference."

### 3. `PromptServiceTests.cs` - new tests

Three new tests under a "CEFR-level exercise guidance" section:

- `ExercisesPrompt_A1_RequiresWordBankForFillInBlank`: A1 ctx → user prompt contains "word bank"
- `ExercisesPrompt_B1_RequiresAtLeastTwoFormats`: B1 ctx → user prompt contains "at least 2 different exercise formats"
- `ExercisesPrompt_C1_MinimizesMechanicalDrills`: C1 ctx → user prompt contains "Minimize" (mechanical drills guidance)

And optionally for lesson plan:
- `LessonPlanPrompt_A1_MentionsWordBankInPractice`
- `LessonPlanPrompt_B1_RequiresVarietyInPractice`
- `LessonPlanPrompt_C1_MinimizesMechanicalInPractice`

## Files to change
- `backend/LangTeach.Api/AI/PromptService.cs`
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs`

## Not changing
- IPromptService.cs (interface unchanged)
- GenerationContext (no new fields)
- Exercise JSON schema (unchanged)
- Any frontend files
- Any controller files
