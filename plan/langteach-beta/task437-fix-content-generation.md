# Task 437: Fix Content Generation Failures

## Issue
#437: Fix content generation failures: JSON truncation, Exam Prep 400, R&C reading passage

## Bug Status After Investigation

Three bugs were found in the April 2, 2026 QA run. Two of them were **already fixed** by PR #429 (commit 0bdad36), which is in the current branch.

| Bug | Status | Fix |
|-----|--------|-----|
| Exercise JSON truncation at B2+ | **OPEN - needs fix** | Increase max_tokens, switch to Sonnet |
| Exam Prep WarmUp/WrapUp/Production 400 | **Fixed in PR #429** | EXAM_PREP_SECTION_TASK_MAP uses conversation/exercises |
| R&C missing reading passage block | **Fixed in PR #429** | READING_COMPREHENSION_SECTION_TASK_MAP uses reading for Presentation |

## Root Cause Analysis

### Bug 1: Exercise JSON Truncation (NEEDS FIX)
**File:** `backend/LangTeach.Api/AI/PromptService.cs:49`
**Current:** `return BuildRequest("exercises", "practice", ctx.CefrLevel, ctx.TemplateName, system, user, ClaudeModel.Haiku, 4096);`
**Problem:** The exercises prompt generates all 6 exercise types (fillInBlank, multipleChoice, matching, trueFalse, sentenceOrdering, sentenceTransformation) with min 3 items each plus explanations. At B2+ with 5+ items per type, this exceeds 4096 tokens. JSON is cut off mid-stream.
**Fix:** Change to `ClaudeModel.Sonnet, 8192`. Sonnet is already used for grammar (which has similar complexity). 8192 tokens gives headroom for all levels.

### Bug 2: Exam Prep 400 (ALREADY FIXED - PR #429)
**Root cause:** The old EXAM_PREP_SECTION_TASK_MAP had WarmUp/WrapUp/Production mapped to `free-text`. Section profiles for WarmUp and WrapUp only allow `conversation`; Production (B1+) doesn't include `free-text`. When the full-lesson generate button called `free-text/stream` for these sections, the backend returned 400.
**Fix already in place:** EXAM_PREP_SECTION_TASK_MAP now uses `conversation` for WarmUp/WrapUp and `exercises` for Production (both allowed by section profiles).

### Bug 3: R&C Missing Reading Passage (ALREADY FIXED - PR #429)
**Root cause:** The old FullLessonGenerateButton used the default SECTION_TASK_MAP (Presentation→grammar) for R&C. The READING_COMPREHENSION_SECTION_TASK_MAP was not yet in place.
**Fix already in place:** READING_COMPREHENSION_SECTION_TASK_MAP maps Presentation→`reading`, so the full-lesson generate now creates a reading block (with passage + comprehension questions) in Presentation.

## Implementation Plan

### Step 1: Fix Bug 1 - Exercise JSON Truncation
**File:** `backend/LangTeach.Api/AI/PromptService.cs`
- Line 49: Change `ClaudeModel.Haiku, 4096` to `ClaudeModel.Sonnet, 8192`

### Step 2: Update prior-findings.md
**File:** `.claude/skills/teacher-qa/output/prior-findings.md`

Add a section for #437 findings, noting:
- Bug 2 (Exam Prep 400): Fixed in PR #429 (EXAM_PREP_SECTION_TASK_MAP). Deployed to current branch.
- Bug 3 (R&C reading passage): Fixed in PR #429 (READING_COMPREHENSION_SECTION_TASK_MAP). Deployed.
- Bug 1 (exercise truncation): Fixed in PR #437 (exercises → Sonnet 8192).

### Step 3: Run Teacher QA
Run the teacher-qa skill for Carmen (R&C) and Ana Exam Prep to verify all three fixes work. This is the primary validation mechanism per the acceptance criteria.

## Acceptance Criteria Verification

- [ ] Exercise JSON generation completes without truncation at all CEFR levels → Step 1 fix
- [ ] Exam Prep WarmUp, WrapUp, and Production sections generate successfully → Already fixed (PR #429)
- [ ] R&C lessons include a reading passage block as the first content block in Presentation → Already fixed (PR #429)
- [ ] Teacher QA Carmen + Ana Exam Prep personas pass → Step 3 verification
- [ ] prior-findings.md updated → Step 2

## Files to Change

| File | Change |
|------|--------|
| `backend/LangTeach.Api/AI/PromptService.cs` | Line 49: Haiku 4096 → Sonnet 8192 |
| `.claude/skills/teacher-qa/output/prior-findings.md` | Add entries for #437 fixes |

## Reviewer Notes

- `area:backend` + `area:ai` + `area:content` → run code review, architecture review, pedagogy review (Isaac), Sophy on PromptService diff
- No frontend changes needed (the full-lesson generate button fixes were in PR #429)
- No new e2e tests needed (existing full-lesson-generation.spec.ts + teacher-qa cover this)
