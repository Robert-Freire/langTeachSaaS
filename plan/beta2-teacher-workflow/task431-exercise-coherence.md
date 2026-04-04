# Task #431: Exercise content coherence issues (True/False and CEFR scope)

## Goal

Fix four prompt-level issues found by Teacher QA:
1. True/False items generated without an anchoring source text (Nadia B2 AR)
2. True/False items contradicting the lesson's Presentation grammar rules (Ricardo C1 PT)
3. Practice introducing grammar structures not taught in Presentation (Sophie A2.2 FR)
4. WarmUp roleB model phrases above the stated CEFR level (B1 Sprint Reviewer)

All fixes are prompt instruction changes in `PromptService.cs` (and one in `warmup.json`). No schema, migration, or API surface changes.

## Context

Files touched:
- `backend/LangTeach.Api/AI/PromptService.cs` - ExercisesUserPrompt, BuildSectionConversationPrompt
- `data/section-profiles/warmup.json` - B1 level guidance
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs` - new test cases

The `ExercisesUserPrompt` method (line 593) builds the practice exercises prompt. It already injects:
- JSON schema including `trueFalse.[].sourcePassage`
- Level guidance from `practice.json`
- Grammar scope from `BuildGrammarScopeBlock` (line 622)
- Practice stage block from `BuildPracticeStageBlock` (line 614)

The `BuildSectionConversationPrompt` method (line 678) builds WarmUp conversation prompts and injects guidance from `warmup.json`.

## Implementation

### Fix 1: True/False source text is mandatory

**File:** `PromptService.cs`, `ExercisesUserPrompt`

After the JSON schema line (line 603), add an explicit instruction:

```
CRITICAL: For all trueFalse items, the sourcePassage field MUST be non-empty. It must contain the exact sentence or phrase from the lesson text or Presentation examples that makes the statement verifiable. A trueFalse item with an empty sourcePassage is invalid and must not appear in the output.
```

### Fix 2: True/False must not contradict Presentation

Same location as Fix 1 (append after Fix 1 instruction):

```
IMPORTANT: trueFalse statements must be consistent with the grammar rules and exceptions actually taught in the lesson. If the lesson presented a nuanced rule or exception (e.g. "indicativo is also possible when the fact is confirmed"), the trueFalse items must reflect that nuance and must not state the rule as absolute.
```

### Fix 3: Practice must not introduce grammar beyond Grammar Scope

**File:** `PromptService.cs`, `ExercisesUserPrompt`

The grammar scope block is conditionally appended (line 622-624):
```csharp
var grammarScope = BuildGrammarScopeBlock(level);
if (!string.IsNullOrEmpty(grammarScope))
    prompt += "\n\n" + grammarScope;
```

The non-introduction constraint should be appended inside the same conditional so it only appears when a grammar scope exists:
```csharp
var grammarScope = BuildGrammarScopeBlock(level);
if (!string.IsNullOrEmpty(grammarScope))
{
    prompt += "\n\n" + grammarScope;
    prompt += "\nCRITICAL: Practice exercises MUST only use the grammar structures listed in the GRAMMAR SCOPE above. Do not introduce additional structures, tenses, or paradigms not listed there, even if they appear naturally in context.";
}
```

### Fix 4: WarmUp roleB phrases must be level-appropriate

**File:** `data/section-profiles/warmup.json`, B1 `guidance` field

Current B1 guidance (line 89):
```
"Use opinion-eliciting questions or short personal anecdotes as triggers. ..."
```

Append to existing guidance:
```
All roleAPhrases and roleBPhrases must use only B1-level grammar structures. Do not include conditional perfect, imperfect subjunctive, or other structures above B1.
```

However, this approach is hardcoded for B1 only. Better to add it to `BuildSectionConversationPrompt` as a generic level constraint:

**File:** `PromptService.cs`, `BuildSectionConversationPrompt` (line 678)

After building `mainInstruction`, before the JSON schema line (line 709-710), add:
```csharp
sb.AppendLine($"CRITICAL: All roleAPhrases and roleBPhrases must use only {level}-appropriate grammar structures. Do not include structures from higher CEFR levels.");
```

This is generic, covers all levels, and requires no per-level hardcoding.

## Tests

Add to `PromptServiceTests.cs` (use `ExercisesPrompt_` prefix to match existing naming):

1. `ExercisesPrompt_TrueFalse_RequiresNonEmptySourcePassage` - verifies the sourcePassage mandatory instruction appears in the exercises user prompt
2. `ExercisesPrompt_TrueFalse_MustNotContradictPresentation` - verifies the coherence instruction appears
3. `ExercisesPrompt_GrammarScope_IncludesNoIntroductionConstraint` - verifies the grammar scope non-introduction constraint appears when grammar scope is non-empty (use a level that has a grammar scope, e.g. A2)
4. `ConversationUserPrompt_WarmUp_RolePhrasesCEFRConstraint` - verifies the CEFR level constraint on role phrases appears in WarmUp prompt

## Post-implementation steps

1. Update `.claude/skills/teacher-qa/output/prior-findings.md` with the four findings from this issue (source: teacher QA triage 2026-04-02):
   - CQ-NB2: True/False without source text (Nadia B2 AR)
   - CQ-RC1: True/False contradicts Presentation (Ricardo C1 PT)
   - CQ-SA2: B1 grammar introduced in A2.2 Practice (Sophie A2.2 FR)
   - CQ-WB1: WarmUp roleB model phrase above B1 (Sprint Reviewer B1)
2. Run `/teacher-qa sprint` to verify fixes.

## Acceptance criteria from issue

- [ ] True/False prompt requires each item verifiable against a specific text/dialogue
- [ ] Exercise prompts include cross-reference constraint against Presentation grammar scope
- [ ] Grammar scope enforcement prevents introducing new structures in Practice
- [ ] WarmUp conversation prompt constrains role phrases to stated CEFR level
- [ ] All backend tests pass
- [ ] `prior-findings.md` updated with the four findings
