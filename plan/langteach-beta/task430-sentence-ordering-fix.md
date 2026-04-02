# Task 430 — Fix: Sentence Ordering Exercises Generate Grammatically Incorrect Assembled Sentences

## Problem

The `sentenceOrdering` prompt in `ExercisesUserPrompt` has two gaps:

1. **No grammatical correctness constraint**: The prompt describes the mechanics (fragments + correctOrder indices) but never tells Claude that the assembled sentence MUST be grammatically correct. Claude can generate fragments that, when joined in correctOrder, produce a malformed sentence.
2. **No CEFR grammar scope in exercises**: `ExercisesUserPrompt` includes `GetGrammarConstraints` (language-level rules) but NOT `BuildGrammarScopeBlock` (CEFR in-scope / out-of-scope grammar). This allows level overreach: B1.1 exercises can contain imperfect subjunctive, a B1.2+ structure.

## Root Cause

`ExercisesUserPrompt` (PromptService.cs ~line 517) omits:
- An explicit "assembled result must be grammatically correct" instruction for `sentenceOrdering`
- `BuildGrammarScopeBlock(level)` — used in grammar prompts but not exercises

## Changeset

### 1. `backend/LangTeach.Api/AI/PromptService.cs` — `ExercisesUserPrompt`

**a) Strengthen the sentenceOrdering description** (in the multi-line prompt string, line ~528):

Replace current:
> sentenceOrdering: fragments is an array of words or phrases; correctOrder is the array of fragment indices that form the correct sentence (e.g. fragments=["en","vivo","Barcelona","yo"], correctOrder=[3,1,0,2] gives "yo vivo en Barcelona"). Use sentenceOrdering for A1/A2/B1 levels where testing syntax awareness without requiring production is appropriate.

With:
> sentenceOrdering: fragments is an array of words or phrases; correctOrder is the array of fragment indices that form the correct sentence (e.g. fragments=["en","vivo","Barcelona","yo"], correctOrder=[3,1,0,2] gives "yo vivo en Barcelona"). CRITICAL: joining the fragments in correctOrder MUST produce a grammatically correct, natural Spanish sentence — verify this before outputting each item. Use sentenceOrdering for A1/A2/B1 levels where testing syntax awareness without requiring production is appropriate.

**b) Add `BuildGrammarScopeBlock` to the exercises prompt** — insert after the existing `scopeConstraint` block (after line ~544):

```csharp
var grammarScope = BuildGrammarScopeBlock(level);
if (!string.IsNullOrEmpty(grammarScope))
    prompt += "\n\n" + grammarScope;
```

### 2. `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs`

Add 2 tests in the "Sentence ordering format" section (after the two existing tests ~line 2038):

**Test 1**: `ExercisesPrompt_SentenceOrdering_ContainsGrammaticalCorrectnessConstraint`
- Build A1 exercises prompt
- Assert UserPrompt contains "grammatically correct" (or similar unique phrase from the new instruction)

**Test 2**: `ExercisesPrompt_B1_IncludesGrammarScopeForExercises`
- Build B1.1 exercises prompt
- Assert UserPrompt contains "GRAMMAR SCOPE" (the header from `BuildGrammarScopeBlock`)
- This ensures CEFR level grammar scope gates exercises content, preventing overreach

## Test Coverage Mapping

| Acceptance criterion | Test |
|---|---|
| Prompt explicitly instructs grammatically correct assembly | Test 1 |
| CEFR level overreach prevented for exercises | Test 2 |
| Hans A1 / Isabel B1.1 Teacher QA (post-deploy) | manual / teacher-qa skill |

## Out of Scope

- Frontend changes (no rendering issue; problem is at prompt level)
- New e2e test (the existing `sentence-ordering-type.spec.ts` covers the happy path)
- Grammar validation service check on the assembled sentence (would require AI call; the prompt fix is sufficient and proportionate for MVP)
