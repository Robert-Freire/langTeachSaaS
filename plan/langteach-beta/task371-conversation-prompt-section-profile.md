# Task 371 - Strengthen WarmUp/WrapUp Conversation Prompts

## Problem

`ConversationUserPrompt` uses only `GetGuidance()` and `GetScopeConstraint()` from section profiles.
Five fields are ignored: Duration, InteractionPattern, Scaffolding, ForbiddenExerciseTypes, LevelSpecificNotes.
The scope constraint is also appended AFTER the JSON schema, making it a weak signal.

Root violations (Teacher QA 2026-03-29):
- WarmUp (CQ-2): generates multi-scenario full conversations instead of a 3-5 min icebreaker
- WrapUp (CQ-3): introduces new vocabulary/situations instead of reviewing lesson content

## Fix

### 1. Add `GetInteractionPattern` to `ISectionProfileService`

New method: `string GetInteractionPattern(string sectionType, string cefrLevel)`

### 2. Implement in `SectionProfileService`

Read from `SectionLevelProfile.InteractionPattern`.

### 3. Update `ConversationUserPrompt` in `PromptService`

New prompt structure for WarmUp and WrapUp:

```
[SCOPE CONSTRAINT] ← moved before JSON schema
[no new material constraint - WrapUp only]
Duration: X-Y minutes.
Interaction pattern: Z.
Do not generate activities that:
- [forbidden reason 1]
- [forbidden reason 2]
- ...
Generate [description] for a {level} level lesson on "{topic}". Return JSON:
{...JSON schema...}
[GUIDANCE]
```

Changes per section:
- **WarmUp**: scope constraint first, then duration + interaction pattern + forbidden reasons (up to 5 deduplicated), then main instruction + JSON + guidance
- **WrapUp**: same, plus explicit "IMPORTANT: Review only content from this lesson. Do not introduce new vocabulary, grammar structures, or situations."

### 4. Unit tests

Add to `PromptServiceTests.cs`:
- `ConversationUserPrompt_WarmUp_B1_ScopeConstraintAppearsBeforeJsonSchema`
- `ConversationUserPrompt_WarmUp_B1_ContainsDuration` (3-5 minutes from warmup.json B1)
- `ConversationUserPrompt_WarmUp_B1_ContainsInteractionPattern` ("student-led")
- `ConversationUserPrompt_WarmUp_B1_ContainsForbiddenReasons` (e.g., "Grammar drills")
- `ConversationUserPrompt_WrapUp_B1_ScopeConstraintAppearsBeforeJsonSchema`
- `ConversationUserPrompt_WrapUp_B1_ContainsNoNewMaterialConstraint`
- `ConversationUserPrompt_WrapUp_B1_ContainsDuration` (2-4 minutes from wrapup.json B1)
- `ConversationUserPrompt_WrapUp_B1_ContainsInteractionPattern` ("student-led")

## Files to change

- `backend/LangTeach.Api/Services/ISectionProfileService.cs` - add `GetInteractionPattern`
- `backend/LangTeach.Api/Services/SectionProfileService.cs` - implement it
- `backend/LangTeach.Api/AI/PromptService.cs` - update `ConversationUserPrompt`
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` - add 8 new tests

## Out of scope

- Other content type prompts (exercises, grammar, etc.)
- Schema changes
- New WrapUp content types
