# Task 378: Exam Prep — Fix Wrong Subjunctive Temporal Correlation

## Problem
`ExercisesUserPrompt` lacks a grammar accuracy constraint for subjunctive temporal correlation in Spanish. The AI generates `pudiera` (imperfect subjunctive) after `No creer que` + present tense, but the correct answer is `pueda` (present subjunctive). A DELE B2 candidate memorizing this rule will fail the exam.

## Root Cause
No grammar constraint in the prompt. The fix must be **data-driven** (JSON config), not code-gated (`if language == "Spanish"` blocks).

## Approach

### 1. Add `GrammarConstraint` record to `PedagogyConfig.cs`
```csharp
public record GrammarConstraint(
    string Topic,
    string Rule,
    string Enforcement,
    string[] AppliesTo
);
```

### 2. Extend `SpecificLanguage` in `PedagogyConfig.cs`
Add optional `GrammarConstraints` field with default null (so existing JSON entries without it still deserialize cleanly):
```csharp
public record SpecificLanguage(
    string? Family,
    string[] FalseFriends,
    string[] PositiveTransfer,
    string AdditionalNotes,
    GrammarConstraint[]? GrammarConstraints = null
);
```

### 3. Update `l1-influence.json`
Add `spanish` under `specificLanguages` with the subjunctive temporal correlation rule:
```json
"spanish": {
  "family": null,
  "falseFriends": [],
  "positiveTransfer": [],
  "additionalNotes": "Spanish is the target language. Grammar constraints below enforce accuracy of generated exercises.",
  "grammarConstraints": [
    {
      "topic": "subjunctive-temporal-correlation",
      "rule": "present/future main clause -> present subjunctive (pueda, haga, sea); past/conditional main clause -> imperfect subjunctive (pudiera, hiciera, fuera). Example: 'No creo que [el gobierno] pueda...' NOT 'pudiera'.",
      "enforcement": "mandatory",
      "appliesTo": ["exercises", "grammar"]
    }
  ]
}
```

Note: `family: null` because Spanish is the **target language** being taught, not an L1. This specific-language entry stores target-language accuracy constraints. `specificLanguages` already accommodates keys that aren't L1 interference entries (Persian has `family: null`).

### 4. Add `GetGrammarConstraints(string targetLanguage)` to `IPedagogyConfigService`
Returns `GrammarConstraint[]` for the specified target language. Returns empty array if not found.

### 5. Implement in `PedagogyConfigService`
Look up `specificLanguages[NormalizeLang(targetLanguage)]?.GrammarConstraints ?? []`.
No family-level lookup needed — grammar constraints are language-specific, not family-level.

### 6. Consume in `PromptService.ExercisesUserPrompt`
After existing guidance blocks, call `_pedagogy.GetGrammarConstraints(ctx.Language)`, filter to `appliesTo.Contains("exercises")`, and append each rule as a constraint line.

### 7. Tests
**`PedagogyConfigServiceTests.cs`** (2 tests):
- `GetGrammarConstraints("spanish")` returns at least one constraint with topic `subjunctive-temporal-correlation`
- `GetGrammarConstraints("english")` returns empty array

**`PromptServiceTests.cs`** (2 tests):
- When config returns grammar constraints for the target language, `BuildExercisesPrompt` includes the rule text in the user prompt
- When config returns empty for the target language, no grammar constraint block appears

## Files Changed
- `backend/LangTeach.Api/AI/PedagogyConfig.cs` — add `GrammarConstraint` record, extend `SpecificLanguage`
- `data/pedagogy/l1-influence.json` — add `spanish` entry with `grammarConstraints`
- `backend/LangTeach.Api/Services/IPedagogyConfigService.cs` — add `GetGrammarConstraints` to interface
- `backend/LangTeach.Api/Services/PedagogyConfigService.cs` — implement `GetGrammarConstraints`
- `backend/LangTeach.Api/AI/PromptService.cs` — consume constraints in `ExercisesUserPrompt`
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` — 2 new tests
- `backend/LangTeach.Api.Tests/Services/PedagogyConfigServiceTests.cs` — 2 new tests

## Non-goals
- No changes to French, Italian, English, or other language entries
- No new API endpoints
- No frontend changes
- No changes to other prompt builders (vocabulary, grammar, conversation) — only exercises for this issue
