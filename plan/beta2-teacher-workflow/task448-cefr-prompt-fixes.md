# Task 448: Pedagogy review findings - CEFR scope gaps in prompts and config

## Goal

Fix three CEFR pedagogy gaps found by Isaac during the Pedagogical Quality sprint review:
1. C1/C2 prompt does not communicate that "controlled" is an optional practice stage
2. `ojala-indicative` grammar validation rule misses present perfect indicative forms of haber
3. A1.1 grammar scope does not constrain gustar to singular form only

## Source files

| Fix | File |
|-----|------|
| C1 optionalStages | `backend/LangTeach.Api/AI/PromptService.cs` (`BuildPracticeStageBlock`) |
| ojalá regex gap | `data/pedagogy/grammar-validation-rules.json` |
| A1.1 gustar | `data/pedagogy/cefr-levels/a1.json` |

## Implementation

### Fix 1: C1/C2 optionalStages in prompt

`BuildPracticeStageBlock` (PromptService.cs ~L249) already reads `req.OptionalStages` via `CefrStageRequirement.OptionalStages` but never emits it. After the main stages loop, append:

```
Optional stage(s): controlled (optional, use when mechanical consolidation is needed
before moving to meaningful practice)
```

Concretely: after the `foreach` loop over `req.Stages`, if `req.OptionalStages` is non-empty, iterate and emit each one with its definition and a note: `"(optional - include when mechanical consolidation would benefit the learner; omit for advanced/fluent C1 students)"`.

### Fix 2: ojalá present perfect indicative gap

The current `ojala-indicative` pattern only lists present indicative verbs (tiene, viene, etc.).  
It misses `ha/has/han/hemos/habéis/he` (indicative present of haber used in present perfect: "ojalá ha llegado").  
The correct form after "ojalá" for present perfect is subjunctive: "haya/hayas/hayan/hayamos/hayáis".

Add the indicative haber forms to the pattern alternation. Also update the `correction` text to mention the present perfect case.

### Fix 3: A1.1 gustar singular constraint

`data/pedagogy/cefr-levels/a1.json` grammarInScope entry:
- Current: `"Gustar + infinitivo / sustantivo (A1.2)"`
- New: `"Gustar + infinitivo / sustantivo singular (A1.2): at A1.1 restrict to 'me gusta' + infinitive or singular noun only; plural agreement 'gustan' not introduced until A1.2 per PCIC A1.1 p.38"`

This makes the PCIC constraint explicit in the data so the AI reads it directly from the grammar scope block.

## Tests

- `PromptServiceTests.cs`: add test for `BuildPracticeStageBlock` at C1 level verifying "optional" appears in output.
- Grammar validation tests: `GrammarValidation.cs` or existing test if present; add a test case "ojalá ha llegado" triggers the rule.
- No frontend changes.

## Acceptance criteria (from issue)

- [ ] C1 prompt block includes optionalStages note for controlled stage
- [ ] ojalá grammar validation rule extended to cover present perfect subjunctive [indicative haber]
- [ ] A1.1 grammar scope constrains gustar to singular form only
- [ ] All backend tests pass
- [ ] Teacher QA re-run with Ana A1 confirms gustar fix
- [ ] `.claude/skills/teacher-qa/output/prior-findings.md` updated with all three findings after merge
