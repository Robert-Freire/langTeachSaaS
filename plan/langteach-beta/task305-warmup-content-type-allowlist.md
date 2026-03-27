# Task 305: Restrict WarmUp to freeText/conversation content types

## Problem
WarmUp sections generate vocabulary drills despite prompt fixes in PR #231. The root cause: soft "NEVER do X" constraints are ignored by the model. Solution: replace negative constraints with positive allowlists that specify exactly what activity *style* to generate for each section, keyed by CEFR band.

## Scope
Prompt engineering only (`PromptService.cs` + tests). No schema changes, no new ContentBlockType values. "freeText" and "conversation" in the issue are activity style descriptors, not enum values.

## Key file
- `backend/LangTeach.Api/AI/PromptService.cs` — `LessonPlanUserPrompt()`
- `backend/LangTeach.Api.Tests/AI/PromptServiceTests.cs`

## Implementation

### 1. Rewrite `LessonPlanUserPrompt` section guidelines

Replace the current flat section-by-section text with a CEFR-banded allowlist approach.

**WarmUp (CEFR-banded positive constraints):**

Extract a helper `WarmUpGuidance(cefrLevel)` that returns the appropriate guidance string:

- A1-A2: use `freeText` style (prose activity, no conversation). Examples: show an image and elicit a word, "odd one out" with pictures, one simple personal question recycling previous lesson language. No conversation — beginners lack linguistic resources.
- B1-B2: use `freeText` or `conversation` style. Examples: agree/disagree statement about the lesson topic, "two truths and a lie" using target grammar, headlines prediction, short 2-3 turn opinion exchange.
- C1-C2: use `freeText` or `conversation` style. Examples: ethical dilemma prompt, semantic brainstorm with connections to previous lesson, authentic tweet/quote as discussion trigger, define-without-using circumlocution game.

**Other sections (positive constraints, lean):**

- presentation: introduce new language with input. Do not include exercises or practice tasks here.
- practice: controlled production only — exercises progressing from mechanical to meaningful, or guided conversation. No grammar explanations (if needed, that's a Presentation failure).
- production: free/communicative output. No vocabulary lists, grammar tables, or structured exercises.
- wrapUp: reflection and self-assessment only, 2-3 min. Concise prose, no drilling.

**Remove all negative/defensive WarmUp instructions:**
- Remove "NEVER generate a vocabulary list, grammar drill, translation exercise, or fill-in-blank activity for warmUp"
- Review and remove any other "do NOT" duplicates covered by the new positive constraints

### 2. Update tests

**Remove (no longer match new prompt text):**
- `LessonPlanPrompt_UserPrompt_ProhibitsVocabularyListInWarmUp` — asserts "NEVER generate a vocabulary list"
- `LessonPlanPrompt_UserPrompt_ProhibitsGrammarDrillInWarmUp` — asserts "grammar drill"

**Keep (still valid):**
- `LessonPlanPrompt_UserPrompt_ContainsWarmUpIcebreakerGuidance` — update assertion to match new text

**Add (per acceptance criteria):**
1. `LessonPlanPrompt_WarmUp_RestrictedToFreeTextStyle_ForA1` — A1 context: prompt contains an A1-specific activity phrase (e.g. "odd one out", "simple personal question"). Do NOT assert absence of "conversation" — that word appears elsewhere in the prompt (practice section has "guided conversation"). Assert presence of A1-specific positive content only.
2. `LessonPlanPrompt_WarmUp_AllowsConversation_ForB1Plus` — B1 context (BaseCtx default): prompt contains a B1 conversation-style example phrase (e.g. "agree/disagree", "opinion exchange")
3. `LessonPlanPrompt_WarmUp_IncludesLevelAppropriateExamples_A1` — A1 context: contains an A1 activity example distinct from B1/B2 examples
4. `LessonPlanPrompt_WarmUp_IncludesLevelAppropriateExamples_B1` — B1 context: contains a B1/B2 activity example distinct from A1 examples

Note: tests 1 and 3 overlap; collapse into two tests: one for A1 (positive A1 phrases present) and one for B1+ (B1 conversation phrases present).

## Acceptance criteria mapping

| AC | Implementation |
|---|---|
| WarmUp requests `freeText` style (A1-A2) | WarmUpGuidance("A1") specifies freeText prose activities only |
| WarmUp allows `conversation` for B1+ | WarmUpGuidance("B1") adds conversation option |
| WarmUp includes CEFR-banded activity suggestions | WarmUpGuidance() has per-band examples |
| Presentation never requests exercises | Positive constraint in presentation section |
| Practice only requests exercises/guided conversation | Positive constraint in practice section |
| Production never requests exercises | Positive constraint in production section |
| WarmUp content never a vocabulary list or drill | Structural: positive allowlist makes drills an LLM mistake, not a prompt omission |
| Unit test: WarmUp CEFR band constraints | Tests #1–4 above |
| Teacher QA sprint reviewer confirms icebreaker | Run after implementation |

## Exam Prep and Reading & Comprehension template interaction

The Exam Prep template override (line ~305 in PromptService.cs) already sets a custom WarmUp description: "review the exam format, the target task type, and the scoring criteria. No casual icebreakers or conversation warm-ups." This is intentionally different from the standard icebreaker WarmUp. The `WarmUpGuidance` helper applies only to the base instruction path. The Exam Prep block stays as-is. Explicitly document this in a comment near the Exam Prep block.

The Reading & Comprehension template override says "warmUp: a pre-reading activation task only" which aligns with the new approach. No changes needed there.

## No-ops / out of scope
- No ContentBlockType enum changes
- No DB migrations
- No frontend changes
- No e2e test changes (WarmUp content is inside the lesson plan JSON blob, not separately validated at e2e level)
