# Teacher QA Report: Student-Aware Curriculum Sprint Close

**Date:** 2026-03-28
**Branch:** sprint/student-aware-curriculum
**Run type:** Full (5 personas)
**Reviewed by:** Sophy (architect), Isaac (pedagogy, via evaluation agents)

---

## Executive Summary

The pedagogy config refactor (7-layer data-driven system replacing hardcoded prompt rules) introduced two template-specific regressions and exposed a systemic prompt injection pattern issue. Content truncation affects 3 of 4 fully-evaluated personas. WarmUp/WrapUp section boundary enforcement is weak across the board.

**Sprint close verdict: NOT READY.** Two blockers must be fixed before merge.

---

## Persona Results

| Persona | Template | Verdict | Critical | Major | Moderate |
|---------|----------|---------|----------|-------|----------|
| Sprint Reviewer | Grammar B1 | ISSUES FOUND | Broken MC (wrong answer, duplicate options) | Truncated Q6 | Heavy WarmUp, WrapUp adds material |
| Marco B1.1 | Grammar B1 | ISSUES FOUND | "Eres de acuerdo" in model language (teaches wrong ser/estar) | Truncated matching exercise, questionable MC | WarmUp grammar-focused, WrapUp oversized |
| Carmen B2.1 | Reading B2 | **FAIL** | Missing Production section, no reading passage (#227 regression) | Truncated practice | WrapUp identical to WarmUp |
| Ana Exam B2 | Exam Prep B2 | **FAIL** | Oral role-plays instead of written tasks (#228 regression), no time limits | Missing T/F+justification | |
| Ana A1 | Conversation A1 | PARTIAL (screenshots only, content extraction race condition) | None visible | | WarmUp is conversation (fix #226 confirmed working) |

---

## Root Cause Analysis

### 1. Template constraint injection is too distant from generation point

The template overrides data in `template-overrides.json` is correct. For example:
- Reading & Comprehension: "Embed a complete reading passage... TEXT MUST appear in this section"
- Exam Prep: "Do NOT use oral role-play or conversation activities"

**The problem is how the code injects them.** `BuildTemplateOverrideBlock` (PromptService) dumps every section's `overrideGuidance` as a flat bullet list under a single heading near the top of the prompt. By the time Claude generates the Presentation or Production section, the constraints are 2000+ tokens behind and treated as general advice, not binding rules.

### 2. `restrictions` field loaded but never enforced

Template-overrides.json includes `restrictions: [{type: "exerciseCategory", value: "LUD"}]` for Exam Prep, but no code path reads or enforces this field. Config that exists but does nothing.

### 3. Prompt budget consumed by new layers

The 7-layer pedagogy config system added substantial prompt content (L1 patterns, CEFR rules, exercise guidance, section coherence). The combined prompt may now exceed what leaves enough `max_tokens` budget for the response. This explains content truncation across 3 personas.

### 4. Section boundary guidance too weak

Section profiles say "icebreaker" for WarmUp and "review" for WrapUp, but these are advisory keywords, not constraints. Claude generates full grammar-focused conversations (7-9 exchanges) for WarmUp and new material for WrapUp because nothing structurally prevents it.

---

## Sophy's Assessment

**Verdict: APPROVE the issue plan, with one structural recommendation.**

Key points from Sophy:

1. **Inline injection:** Instead of one monolithic template override block at the top, inject each section's `overrideGuidance` inline right before that section's generation instruction. Section-local constraints are much harder for the LLM to ignore. This is orchestration logic (where to place the constraint), not business logic (what the constraint says). Clean boundary.

2. **Content truncation:** Not a data model concern (rawContent is an unbounded string). Check `max_tokens` on the API call. The new 7-layer prompt eats into the response budget. Compare prompt token count before and after the refactor.

3. **Issue C (WarmUp/WrapUp) depends on Issue A:** The inline injection pattern from Issue A makes Issue C trivial: just tighten the `overrideGuidance` strings. Call out the dependency.

4. **Architectural risk:** The composition order of 7 layers appended to a single string is fragile. The LLM has recency bias (last-appended = most important). Template overrides currently go in the middle, meaning weakness targeting and coherence rules can override template constraints. The inline injection approach fixes this for template constraints specifically, but the general "append everything" pattern will keep causing priority conflicts as layers grow.

---

## Planned Issues

### Issue A: Restore template-specific constraints (BLOCKER)

**Title:** Restore template-specific constraints via inline section injection
**Priority:** P0:blocker
**Milestone:** Student-Aware Curriculum (fix before close)
**Labels:** area:backend, area:ai
**Size:** M

**Scope:**
- Refactor `BuildTemplateOverrideBlock` to inject each section's `overrideGuidance` inline, right before that section's generation instruction (not as a monolithic preamble)
- Enforce the `restrictions` field from template-overrides.json (currently loaded but unused)
- Verify Reading & Comprehension generates a reading passage in Presentation and has all 5 sections
- Verify Exam Prep generates written production tasks with time limits, no oral role-play
- Do NOT re-introduce hardcoded if/else blocks (that defeats the refactor)

**Acceptance criteria:**
- [ ] Template override guidance injected per-section, not as a single block
- [ ] `restrictions` field in template-overrides.json is read and enforced
- [ ] Teacher QA: Carmen B2.1 produces a reading passage and has Production section
- [ ] Teacher QA: Ana Exam B2 produces written tasks with time/word-count targets, no oral role-play
- [ ] Unit tests for inline injection and restrictions enforcement

### Issue B: Fix content truncation in AI-generated exercises (BLOCKER)

**Title:** Fix content truncation in AI-generated exercises
**Priority:** P1:must
**Milestone:** Student-Aware Curriculum (fix before close)
**Labels:** area:backend, area:ai
**Size:** S

**Scope:**
- Investigate `max_tokens` setting on Claude API calls vs prompt token consumption
- Compare prompt size before and after pedagogy config refactor
- If prompt grew significantly, increase `max_tokens` or optimize prompt size
- If parsing issue, fix content block extraction

**Acceptance criteria:**
- [ ] Prompt token count documented (before/after refactor comparison)
- [ ] `max_tokens` adjusted if needed
- [ ] Teacher QA: no truncated exercises in any persona run
- [ ] Unit test or assertion to detect generation truncation

### Issue C: Enforce WarmUp/WrapUp section boundaries (Pedagogical Quality)

**Title:** Enforce WarmUp/WrapUp section boundaries in generation
**Priority:** P1:must
**Milestone:** Pedagogical Quality
**Labels:** area:backend, area:ai
**Size:** S
**Depends on:** Issue A (inline injection pattern)

**Scope:**
- Tighten WarmUp section profile: max 2-3 exchanges, explicitly prohibit grammar drilling, require low-pressure conversational starter
- Tighten WrapUp section profile: max 3-4 items, prohibit new contexts/scenarios, require summary/self-assessment/preview format
- These become inline constraints via Issue A's injection pattern

**Acceptance criteria:**
- [ ] WarmUp generates icebreaker content (2-5 min, no right/wrong answers)
- [ ] WrapUp generates review/closure (no new material, brief)
- [ ] Teacher QA confirms across at least 3 personas

### Issue D: Add AI output language validation for grammar lessons (Pedagogical Quality)

**Title:** Add AI output language validation for grammar lessons
**Priority:** P1:must
**Milestone:** Pedagogical Quality
**Labels:** area:backend, area:ai
**Size:** M

**Scope:**
- Post-generation validation step that checks model language in grammar lessons for known error patterns
- Specifically: ser/estar usage in ser/estar lessons, subjunctive in subjunctive lessons
- Could be rule-based (regex patterns for common errors) or LLM-based (quick validation call)
- Flag errors in the warnings panel (existing #167 infrastructure)

**Acceptance criteria:**
- [ ] "Eres de acuerdo" (and similar ser/estar errors) detected in ser/estar lessons
- [ ] Validation results surfaced in the lesson warnings panel
- [ ] Does not add significant latency to generation flow

---

## UI Findings (separate, not included in above issues)

Two minor UI findings from the screenshot review. These go to `plan/ui-review-backlog.md`, not into the issues above:
- Student view title truncation on long lesson names
- Role selector pill overflow on long role descriptions

---

## Recommendation

Fix Issues A and B in the current sprint (Student-Aware Curriculum) before closing. They are the minimum gate. Issues C and D are correctly scoped for Pedagogical Quality, and Issue C explicitly depends on Issue A's inline injection pattern.

After A and B are fixed, re-run Teacher QA (Carmen + Ana Exam at minimum) to confirm the regressions are resolved before triggering the merge to main.
