# Prompt Health Review: post-class-tracking sprint
**Date:** 2026-04-04
**Reviewer:** prompt-health-reviewer agent (inline, sprint-close)

---

## Files Reviewed
- `backend/LangTeach.Api/AI/PromptService.cs` (1324 lines)
- `data/section-profiles/*.json` (5 files: warmup, practice, presentation, production, wrapup)

---

## PromptService.cs Findings

### [PH-01] MINOR: Gap instruction is structure-level, placed in per-block system prompt

**Location:** PromptService.cs lines 411-417 (SESSION HISTORY block, gap instruction)

**Finding:** The gap instruction ("Include a brief warm-up reviewing key points from last session", "Include a dedicated review activity before introducing new content") is a lesson-structure directive. It is included in the shared system prompt for ALL content block generations (grammar, vocabulary, exercises, conversation). When generating a single Grammar block, telling the AI to "include a dedicated review activity" is irrelevant and could cause the grammar explanation to become a review, not an introduction of new material.

**Severity:** Minor. The AI likely ignores structure directives when generating a typed block, but it adds noise to every prompt.

**Recommendation:** Move gap instruction into LessonPlanUserPrompt only, not the shared BuildSystemPrompt. For individual block generation, omit it or replace with "Note: student last attended [N] days ago."

---

### [PH-02] MINOR: LearningStyleNotes could overlap with student profile data

**Location:** PromptService.cs lines 481-486 (SESSION HISTORY block, LearningStyleNotes)
**Context:** SessionHistoryService.cs line 55 maps `sessions[0].GeneralNotes` -> `LearningStyleNotes`

**Finding:** GeneralNotes from the most recent session is injected as "Learning style / context". The student profile already has a `Notes` field (ctx.StudentNotes, if populated). If both are present, the AI receives similar context twice under different labels, which adds token usage and mild redundancy.

**Severity:** Minor. The two fields serve slightly different purposes (one is static profile notes, one is dynamic session observation), but the distinction is not communicated to the AI. The labels ("Learning style / context" vs teacher profile notes) are different enough that this is low risk.

**Recommendation:** Low priority. Consider adding a comment in code noting the intentional separation.

---

### [PH-03] PASS: SESSION HISTORY block clarity

**Finding:** The new SESSION HISTORY block (lines 406-487) is well-structured. Fields are only emitted when non-null/non-empty. Each field has a distinct semantic purpose. No contradictions with existing student profile data. CoveredTopics grouping by category is clear and actionable for the AI.

---

### [PH-04] PASS: No stale patches or dead code in PromptService

**Finding:** No hardcoded level conditionals (e.g., `if level == "A1"`) found. All level-specific behavior comes from config via `_pedagogy` and `_profiles` services. No commented-out prompt fragments or TODO-marked instructions.

---

### [PH-05] PASS: No phantom references

**Finding:** The "text-only" constraint (line 513) is correctly gated: it only fires when no material files are uploaded. When files are present, the AI is told to use them as reference. This is correct.

---

## Section Profile Findings

### [SP-01] MINOR: practice/A1 guidance duplicates validExerciseTypes restriction

**Location:** `data/section-profiles/practice.json`, A1 level

**Finding:** Guidance says "Do not include sentence transformation or error correction tasks." These types are absent from `validExerciseTypes` for A1, so the restriction is already structurally enforced. The negative guidance is redundant bloat.

**Severity:** Minor. Redundant but not harmful.

**Recommendation:** Remove "Do not include sentence transformation or error correction tasks" from A1 practice guidance. The validExerciseTypes list already prevents them.

---

### [SP-02] MINOR: practice/B1 guidance says "do not rely on just one type" -- partially redundant with minExerciseVariety

**Location:** `data/section-profiles/practice.json`, B1 level

**Finding:** Guidance says "do not rely on just one type." The `minExerciseVariety` field (presumably enforced structurally) already mandates variety. Negative instruction is not harmful but is redundant.

**Severity:** Minor.

---

### [SP-03] PASS: production/A1 guidance is long (387 chars) but not bloated

**Finding:** The production/A1 guidance is long but provides genuinely useful actionable alternatives (guided writing vs guided dialogue) that are not captured structurally. Length is justified.

---

### [SP-04] PASS: No contradictions between levels

**Finding:** Scaffolding progression (high -> medium -> none) is consistent across all section profiles. Interaction pattern progression (teacher-led -> student-led) is consistent. No contradictions found between adjacent CEFR levels.

---

### [SP-05] PASS: hardConstraints absent from reviewed files

**Finding:** `hardConstraints` fields are absent from all reviewed section profile JSON files. Content type restrictions are enforced via `validExerciseTypes` and `contentTypes` arrays, which are correctly used in BuildExerciseGuidanceBlock and BuildContentTypeContextBlock.

---

## Summary

| Finding | Severity | File | Action |
|---------|----------|------|--------|
| PH-01: Gap instruction in per-block system prompt | Minor | PromptService.cs | Low priority refactor |
| PH-02: LearningStyleNotes / profile Notes potential overlap | Minor | PromptService.cs | Document intent, no change needed |
| PH-03: SESSION HISTORY block clarity | PASS | PromptService.cs | - |
| PH-04: No stale patches | PASS | PromptService.cs | - |
| PH-05: No phantom references | PASS | PromptService.cs | - |
| SP-01: practice/A1 negative bloat | Minor | practice.json | Remove redundant negative in guidance |
| SP-02: practice/B1 variety instruction | Minor | practice.json | Low priority cleanup |
| SP-03: production/A1 length | PASS | production.json | - |
| SP-04: No contradictions between levels | PASS | all profiles | - |
| SP-05: hardConstraints absence | PASS | all profiles | - |

**Critical findings: NONE.**
**Overall verdict: HEALTHY.** New SESSION HISTORY block is well-implemented. Minor cleanup opportunities noted but nothing that degrades AI output quality.
