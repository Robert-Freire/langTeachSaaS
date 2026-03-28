# Task #312 — Fix prompt health findings: enforcement gap, dead data, stale negatives

## Goal

Apply all 13 prompt health findings from the sprint-close review to `PromptService.cs`, `SectionProfile.cs`, the 5 section profile JSONs, and their tests. After this, the pedagogy reviewer can run on clean profiles.

## Changes by group

### Group A: IsAllowed enforcement gap (Finding #11)

**Problem:** `SectionProfileService.IsAllowed(section, contentType)` checks if the content type appears in ANY level's `contentTypes` array. So `Production.reading` is allowed for A1 (because B2 has it), but it shouldn't be.

**Fix:**
1. Change `ISectionProfileService.IsAllowed` signature to `bool IsAllowed(string sectionType, string contentType, string cefrLevel)`
2. Update `SectionProfileService.IsAllowed` to call `GetAllowedContentTypes(sectionType, cefrLevel)` — this method already exists and is correct
3. Update `GenerateController.Stream` (L83-89): pass `request.CefrLevel.Trim()` as 3rd arg
4. Update `GenerateController.Generate` (L303-307): pass `cefrLevel` (already trimmed at L297) as 3rd arg

**Tests:**
- Update all existing `IsAllowed` tests (currently 2-arg calls) to include a `cefrLevel` argument
  - Disallowed combos: use "B1" for all (all are false regardless of level)
  - Allowed combos: use "B1" for all EXCEPT `Production/reading` which MUST use "B2" (at B1, reading is not in production's contentTypes, so B1 would flip it to false)
  - Case-insensitive tests: add "B1"
  - Unknown section tests: add "B1"
- Add new tests:
  - `IsAllowed_Production_Reading_A1_ReturnsFalse` — the specific bug from Finding #11
  - `IsAllowed_Production_Reading_B2_ReturnsTrue` — confirm B2 boundary works

### Group B: Remove hardConstraints (Findings #1, #2, #12)

1. `SectionProfile.cs`: Remove `string[] HardConstraints` from the record definition
2. All 5 JSON files (`warmup.json`, `presentation.json`, `practice.json`, `production.json`, `wrapup.json`): Remove the `hardConstraints` array from each

No tests needed — the field is just being deleted, no behavior change.

### Group C: PromptService stale negatives (Findings #3, #6, #7)

All changes in `PromptService.cs`:

- **Finding #3** (L293, presentation guideline): Remove `"Do not include exercises or practice tasks here."` — the contentTypes allowlist already enforces this
- **Finding #6** (R&C override, warmUp line ~L305): Remove `"Do NOT use grammar drills, vocabulary lists, or fill-in-blank exercises here."` — warmup profile already has `contentTypes: ["conversation"]`
- **Finding #7** (Exam Prep override ~L319-320): Replace both separate `"Do NOT use oral role-play or conversation activities"` lines (one in practice, one in production) with a single positive instruction on the practice line: `"All practice and production tasks must be written (essay, formal letter, reading comprehension, gap-fill)."`

### Group D: Minor cleanup (Findings #4, #5, #8, #9, #10, #13)

**Finding #4** (duplicate "All five sections required"):
- `PromptService.cs` R&C override (~L310): Remove last line `"All five sections (warmUp, presentation, practice, production, wrapUp) are required. Do not collapse or omit any of them."`
- `PromptService.cs` Exam Prep override (~L322): Remove same duplicate line

**Finding #5** (`CurriculumSystemPrompt` JSON instruction duplicate):
- `PromptService.cs` L341: Remove `sb.AppendLine("You output ONLY valid JSON arrays with no markdown, no prose, no code fences.");` (keep L375 occurrence)

**Finding #8** (`production.json` A1 negative):
- Change: `"Production MUST be a guided writing task with sentence frames provided. Ask the student to write 3-5 sentences using new vocabulary or structures from this lesson. Do NOT use 'discuss with your partner' or oral-only activities — guided writing is appropriate and achievable even at A1."`
- To: `"Production MUST be a guided writing task with sentence frames provided. Ask the student to write 3-5 sentences using new vocabulary or structures from this lesson. Guided writing is appropriate and achievable even at A1."`

**Finding #9** (`practice.json` C1 duplication):
- Change: `"Minimize purely mechanical items (basic fill-in-blank, simple matching); minimize mechanical drills in favor of reformulation, paraphrase, register transfer, and pragmatic inference tasks."`
- To: `"Minimize purely mechanical items (basic fill-in-blank, simple matching) in favor of reformulation, paraphrase, register transfer, and pragmatic inference tasks."`
- Note: preserve "purely" so the existing test `GetGuidance_Practice_C1_MentionsMinimizeMechanical` (asserts `Contain("Minimize purely mechanical")`) continues to pass without modification.

**Finding #10** (`PromptService.cs` L150, external materials instruction):
- Change: `"IMPORTANT: All content must be self-contained and work with text alone. Do not reference images, audio clips, videos, physical objects, or any external materials. Every exercise, example, and activity must be completable using only the text provided."`
- To: `"All content must be text-only and self-contained. Every exercise, example, and activity must be completable using only the text provided."`

**Finding #13** (`practice.json` A2, negative phrasing):
- Change: `"Fill-in-blank with optional word bank, multiple-choice with 4 options, true/false with justification required. Avoid purely mechanical drills; use simple contextual items."`
- To: `"Fill-in-blank with optional word bank, multiple-choice with 4 options, true/false with justification required. Use simple contextual items rather than isolated drills."`

## Frontend check

`sectionContentTypes.ts` is already level-aware for Production (B2+ check for reading). No sync needed — it independently implements the same logic client-side.

## Test update summary

- `SectionProfileServiceTests.cs`: update existing 2-arg `IsAllowed` calls to 3-arg; add 2 new level-boundary tests
- No new test files needed
- Existing tests for guidance strings that mention content being removed need checking (one test: `GetGuidance_Practice_C1_MentionsMinimizeMechanical` — asserts `"Minimize purely mechanical"`, which is preserved in the new wording)

## Acceptance criteria coverage

| AC | Implementation |
|----|---------------|
| IsAllowed checks student's CEFR level | Group A: signature + implementation change |
| GenerateController passes CEFR level to IsAllowed | Group A: both controller paths updated |
| hardConstraints removed from all 5 JSONs | Group B |
| hardConstraints removed from SectionProfile.cs | Group B |
| Presentation negative removed | Group C, Finding #3 |
| R&C warmUp negative removed | Group C, Finding #6 |
| Exam Prep oral negatives consolidated to positive | Group C, Finding #7 |
| "All five sections" deduplicated | Group D, Finding #4 |
| CurriculumSystemPrompt JSON instruction deduplicated | Group D, Finding #5 |
| production.json A1 "discuss with partner" removed | Group D, Finding #8 |
| practice.json C1 minimization consolidated | Group D, Finding #9 |
| External materials instruction shortened | Group D, Finding #10 |
| practice.json A2 rephrased positively | Group D, Finding #13 |
| Frontend sectionContentTypes.ts verified | Already level-aware, no change needed |
| Backend unit tests for IsAllowed with level | Group A new tests |
| Existing tests pass | Updated 2-arg calls + preserved assertion strings |

## Implementation order

1. `SectionProfile.cs` — remove HardConstraints (unblocks JSON deserialization)
2. 5 JSON files — remove hardConstraints arrays
3. `ISectionProfileService.cs` — update IsAllowed signature
4. `SectionProfileService.cs` — update IsAllowed implementation
5. `GenerateController.cs` — pass cefrLevel in both Stream and Generate
6. `PromptService.cs` — all Group C + D text changes
7. `SectionProfileServiceTests.cs` — update + add tests
