# Task 422: Prompt Consistency Pass

## Issue
[#422 Prompt consistency pass](https://github.com/Robert-Freire/langTeachSaaS/issues/422)

## Summary
11 prompt quality cleanups across PromptService.cs, template-overrides.json, section-profiles/practice.json, and content-schemas/exercises.json.

## Changes

### 1. Remove duplicate JSON-only instruction from CurriculumSystemPrompt (AC1)
- File: `backend/LangTeach.Api/AI/PromptService.cs`
- Remove line: `sb.AppendLine("You output ONLY valid JSON arrays with no markdown, no prose, no code fences.");` (~line 1140) from `CurriculumSystemPrompt`
- `CurriculumUserPrompt` already ends with "Output ONLY the JSON array. No markdown, no explanation."

### 2. Convert restriction reason fields to positive framing (AC2)
- File: `data/pedagogy/template-overrides.json`
- Restrictions are rendered via `r.Reason` in `LessonPlanUserPrompt`
- Replace reason strings with positive-framed equivalents:
  - reading-comprehension LUD: "Focus on text processing and comprehension skills. Written and analytical exercises only."
  - writing-skills EO: "Use written tasks only. Oral exercises are not part of this template."
  - exam-prep LUD: "Use exam-format written tasks only. Ludic activities are not part of this template."

### 3. Replace soft negative in culture-society:practice guidance (AC3)
- File: `data/pedagogy/template-overrides.json`
- `culture-society:practice:overrideGuidance` currently ends with "Avoid purely mechanical grammar drills."
- Replace with positive: "Cultural comprehension and analysis tasks. Compare cultural practices, analyse a cultural text, or explore a societal theme. Use communicative and analytical activities."

### 4. Add BuildTemplateGuidanceBlock to all missing prompt builders (AC4)
- File: `backend/LangTeach.Api/AI/PromptService.cs`
- Currently only called in: ExercisesUserPrompt, FreeTextUserPrompt, NoticingTaskUserPrompt
- Add to: GrammarUserPrompt, VocabularyUserPrompt, ReadingUserPrompt, HomeworkUserPrompt, GuidedWritingUserPrompt, ErrorCorrectionUserPrompt, BuildSectionConversationPrompt (and general ConversationUserPrompt branch)
- Pattern: same as existing callers - append if non-empty

### 5. Rephrase grammar-focus warmUp to remove "or discovery" (AC5)
- File: `data/pedagogy/template-overrides.json`
- `grammar-focus:warmUp:overrideGuidance` currently ends "This is activation, not practice or discovery."
- Change to: "This is activation, not practice."

### 6. Remove sourcePassage CRITICAL; add schema + backend validation (AC6)
- File: `backend/LangTeach.Api/AI/PromptService.cs` - remove CRITICAL instruction (~line 627)
- File: `data/content-schemas/exercises.json` - add `"sourcePassage"` to trueFalse `required` array; add `"minLength": 1`
- File: `backend/LangTeach.Api/Controllers/LessonContentBlocksController.cs` - in `Save`, when blockType == "exercises", parse JSON and validate trueFalse items have non-empty sourcePassage; return 400 on violation

### 7. Remove tautological grammar scope CRITICAL wrapper (AC7)
- File: `backend/LangTeach.Api/AI/PromptService.cs`
- Remove lines (~648-650): `prompt += "\nCRITICAL: Practice exercises MUST only use the grammar structures listed in the GRAMMAR SCOPE above..."` from `ExercisesUserPrompt`
- The GRAMMAR SCOPE block is self-authoritative

### 8. Consolidate CEFR level constraint for roleAPhrases/roleBPhrases (AC8)
- File: `backend/LangTeach.Api/AI/PromptService.cs`
- Remove line (~737): `sb.AppendLine($"CRITICAL: All roleAPhrases and roleBPhrases must use only {level}-appropriate grammar structures...")` from `BuildSectionConversationPrompt`
- System prompt already establishes level context; inline prompt already says "using {level}-appropriate language"

### 9. Move gap instruction from system prompt to LessonPlanUserPrompt (AC9)
- File: `backend/LangTeach.Api/AI/PromptService.cs`
- In `BuildSystemPrompt`: remove `gapInstruction` computation and its inclusion in the "Time since last session" line. Emit only `$"Time since last session: {sh.DaysSinceLastSession} days."`
- In `LessonPlanUserPrompt`: after SESSION HISTORY is populated in ctx, add gap instruction logic based on `ctx.SessionHistory?.DaysSinceLastSession`

### 10. Remove practice/A1 redundant negative (AC10)
- File: `data/section-profiles/practice.json`
- A1 guidance: remove trailing ". Do not include sentence transformation or error correction tasks." - already excluded by validExerciseTypes

### 11. Deduplicate practice/B1 partial redundancy (AC11)
- File: `data/section-profiles/practice.json`
- B1 guidance: remove "do not rely on just one type" parenthetical - already enforced by minExerciseVariety: 2

## Tests (AC4, AC6 + existing AC1, AC7, AC8 pass)
All new tests in `PromptServiceTests.cs`:
- `CurriculumSystemPrompt_DoesNotContainJsonOnlyInstruction`
- `GrammarPrompt_IncludesTemplateGuidance_WhenTemplateAndSectionMatch`
- `VocabularyPrompt_IncludesTemplateGuidance_WhenTemplateAndSectionMatch`
- `ReadingPrompt_IncludesTemplateGuidance_WhenTemplateAndSectionMatch`
- `HomeworkPrompt_IncludesTemplateGuidance_WhenTemplateAndSectionMatch`
- `GuidedWritingPrompt_IncludesTemplateGuidance_WhenTemplateAndSectionMatch`
- `ErrorCorrectionPrompt_IncludesTemplateGuidance_WhenTemplateAndSectionMatch`
- `ConversationPrompt_IncludesTemplateGuidance_WhenTemplateAndSectionMatch`
- `ExercisesPrompt_DoesNotContainSourcePassageCritical`
- `ExercisesPrompt_DoesNotContainGrammarScopeCritical`
- `ConversationPrompt_DoesNotContainRolePhraseCritical`
- `GapInstruction_AppearsInLessonPlanPrompt_NotInOtherPrompts`

## Files modified
- `backend/LangTeach.Api/AI/PromptService.cs`
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs`
- `backend/LangTeach.Api/Controllers/LessonContentBlocksController.cs`
- `data/pedagogy/template-overrides.json`
- `data/section-profiles/practice.json`
- `data/content-schemas/exercises.json`
