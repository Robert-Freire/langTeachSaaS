# Task #226: Fix WarmUp Generation — Icebreaker, Not Vocabulary Drill

## Problem

`LessonPlanUserPrompt` in `PromptService.cs` (line 212-217) gives Claude no per-section guidance.
Claude defaults to vocabulary drills for warmUp because that's a safe, generic activity.
Teacher QA confirmed 5/5 personas generated vocabulary drills instead of icebreakers.

## Root Cause

```csharp
"Each section should be detailed enough for the teacher to follow..."
```

No description of what each section type is or what it must/must not contain.

## Fix

Add per-section description to `LessonPlanUserPrompt`:

- **warmUp**: Conversational icebreaker (discussion question, opinion prompt, anecdote starter). 2-5 min. No right/wrong answers. NEVER a vocabulary list, grammar drill, or fill-in-blank exercise.
- **presentation**: Introduce new language (vocabulary, grammar, structure). Examples in context.
- **practice**: Controlled exercises targeting the new language. Can include fill-in-blank, matching, etc.
- **production**: Free/communicative activity where student uses new language independently.
- **wrapUp**: Brief review and homework preview.

## Files to Change

- `backend/LangTeach.Api/AI/PromptService.cs` — update `LessonPlanUserPrompt`
- `backend/LangTeach.Api.Tests/AI/PromptServiceIntegrationTests.cs` — add/update test for warmUp constraint

## Acceptance Criteria

1. WarmUp prompt explicitly specifies conversational/icebreaker format
2. WarmUp prompt explicitly prohibits vocabulary lists, grammar drills, and fill-in-blank
3. Teacher QA re-run confirms WarmUp is no longer a vocabulary drill for at least 3 personas

## No frontend/backend API changes required (prompt engineering only)
