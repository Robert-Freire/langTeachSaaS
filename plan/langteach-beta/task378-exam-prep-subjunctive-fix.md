# Task #378: Exam Prep — Fix Wrong Subjunctive Temporal Correlation

## Problem

`ExercisesUserPrompt()` in `PromptService.cs` lacks any constraint about grammar accuracy in generated MC answers.
The AI (generating Spanish content) produced: "No creo que el gobierno _____ tomar esa decisión" → `pudiera` (wrong) instead of `pueda` (correct). The explanation even reinforced the wrong rule.

## Root Cause

`ExercisesUserPrompt` builds a prompt that asks for exercises but gives no instruction about temporal correlation for the subjunctive. The AI defaults to a common learner error.

## Fix

**File:** `backend/LangTeach.Api/AI/PromptService.cs`
**Method:** `ExercisesUserPrompt()`

Add a language-gated block after `levelGuidance` that, when `ctx.Language` is `"Spanish"` (case-insensitive), appends an explicit temporal correlation rule:

```csharp
if (string.Equals(ctx.Language, "Spanish", StringComparison.OrdinalIgnoreCase))
{
    prompt += "\nGRAMMAR ACCURACY — SUBJUNCTIVE TEMPORAL CORRELATION (mandatory): " +
              "When generating exercises or answer choices that involve the subjunctive mood, " +
              "apply the correct temporal correlation rule: " +
              "present or future tense in the main clause → present subjunctive (e.g. 'pueda', 'haga'); " +
              "past or conditional tense in the main clause → imperfect subjunctive (e.g. 'pudiera', 'hiciera'). " +
              "Never mark an answer correct if it violates this rule.";
}
```

## Tests

Add 2 unit tests in `PromptServiceTests.cs`:
1. `ExercisesPrompt_Spanish_IncludesSubjunctiveTemporalCorrelationRule` — verifies the constraint appears in the prompt when language is Spanish
2. `ExercisesPrompt_NonSpanish_DoesNotIncludeSubjunctiveTemporalCorrelationRule` — verifies French/German do not include it

## Acceptance Criteria Check

- [x] Constraint added to exercises generation prompt
- [ ] Teacher QA Ana Exam B2 persona confirms fix (post-merge criterion per issue)
- [x] All backend tests pass
- [ ] prior-findings.md updated (post-merge per issue)

## Files Changed

- `backend/LangTeach.Api/AI/PromptService.cs` — add constraint block in `ExercisesUserPrompt`
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` — 2 new unit tests
