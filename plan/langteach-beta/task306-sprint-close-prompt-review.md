# Task 306: Sprint Close -- Two-Pass Prompt and Pedagogy Review Gate

**Issue:** #306
**Branch:** worktree-task-t306-sprint-close-prompt-review
**Sprint:** sprint/student-aware-curriculum

## Context

#309 merged (PR #310). Section profiles live at `data/section-profiles/*.json` (warmup, presentation, practice, production, wrapup). The `SectionProfileService.GetGuidance()` method injects ONLY the `guidance` string per level into prompts -- `hardConstraints` and metadata fields are NOT sent to the AI.

An earlier prompt health baseline review exists at `plan/sprints/prompt-health-review-student-aware-curriculum.md` (status: pre-#305). Several findings from that baseline remain unresolved in the current codebase.

## What needs to be done

### Part A: Permanent process changes

1. **Update `sprint-close.md`** -- reorder phases:
   - Current: Teacher QA (2) -> Pedagogy (3) -> Prompt Health (3b)
   - Target: Teacher QA (2) -> Prompt Health (2b) -> Pedagogy (3)
   - Expand Phase 2b scope: prompt health reviews BOTH `PromptService.cs` AND `data/section-profiles/*.json`
   - Expand Phase 3: pedagogy reviewer receives Teacher QA output AND is asked to review JSON profile guidance strings directly (CEFR progression, activity types, durations, scaffolding)

2. **Update `prompt-health-reviewer.md`** -- expand Context Loading:
   - Add `data/section-profiles/*.json` to files to review
   - Add review criteria for JSON profiles: are `guidance` strings positive? Contradictory across levels? Escalation-appropriate per CEFR? Redundant with structural enforcement?
   - Note: `hardConstraints` array is NOT sent to the AI (not in any GetGuidance path); focus review on `guidance` strings and `contentTypes`

3. **Update `CLAUDE.md`** sprint close Stage 2 bullet -- change "runs Teacher QA, runs pedagogy review on QA results" to mention two-pass sequence: Teacher QA then prompt health then pedagogy.

4. **Update `docs/dev-workflow.md`** line 145 -- update sprint close description to reflect reordered sequence.

### Part B: Run the reviews on this sprint (deferred -- user will complete interactively via /pm)

The actual review runs (prompt-health-reviewer, pedagogy-reviewer, Teacher QA re-run, and fixing findings in PromptService.cs and JSON profiles) are out of scope for this PR. The issue will remain open. Part B acceptance criteria will be completed in a follow-up /pm session.

### Part C: No tests needed (process/config/data files only)

All changes in Part A are to agent definitions, CLAUDE.md, and docs. No code changes. No new tests required.

## Files to change

### Part A (process):
- `.claude/agents/sprint-close.md`
- `.claude/agents/prompt-health-reviewer.md`
- `.claude/CLAUDE.md`
- `docs/dev-workflow.md`

## Order of execution

1. Make process changes (Part A) -- commit and push, open PR
2. Part B deferred to follow-up /pm session

## Pre-push checks

All 6 standard checks (no code changes, but must verify clean build).

## Scope limits

- Template-specific overrides (R&C, Exam Prep) stay as inline code; only fix their negative/contradictory instructions
- L1 adaptation hooks: not in scope
- `hardConstraints` in JSON files: only fix if they create confusion (they're not sent to AI, so low priority; can be left as documentation)
