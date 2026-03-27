# Prompt Health Review: Student-Aware Curriculum Sprint

**Date:** 2026-03-27
**File reviewed:** `backend/LangTeach.Api/AI/PromptService.cs`
**Status:** Pre-#305 baseline (findings will be re-evaluated after #305 merges)

## Findings

| # | Location | Category | Severity | Description | Fix |
|---|----------|----------|----------|-------------|-----|
| 1 | `LessonPlanUserPrompt` L280 | negative bloat | critical | `NEVER generate a vocabulary list, grammar drill, translation exercise, or fill-in-blank activity for warmUp` -- failed twice (#226, Teacher QA re-run). Negative constraints don't reliably prevent content types. | Remove after #305 adds content type allowlist. Replace with positive "Generate a conversational icebreaker" (already present). |
| 2 | `LessonPlanUserPrompt` R&C override L293 | duplication + negative bloat | important | `Do NOT use grammar drills, vocabulary lists, or fill-in-blank exercises here` duplicates the generic warmUp constraint from L280. | Remove after #305. The generic warmUp allowlist covers all templates. |
| 3 | `LessonPlanUserPrompt` Exam Prep override L305 | contradictory | critical | `No casual icebreakers or conversation warm-ups` contradicts generic warmUp guidance ("conversational icebreaker"). Both rules fire for Exam Prep lessons. Claude gets conflicting signals. | #305 should define Exam Prep warmUp separately (format review, not icebreaker) without negating the generic rule. Use positive: "Review the exam format and scoring criteria." |
| 4 | `LessonPlanUserPrompt` Exam Prep L307-308 | negative bloat + duplication | important | `Do NOT use oral role-play or conversation activities` repeated identically for both practice and production sections. | Replace with positive instruction once: "Use written tasks only (essay, formal letter, reading comprehension, gap-fill)." |
| 5 | `LessonPlanUserPrompt` L286, L298, L310 | duplication | minor | "All five sections required" appears 3 times: generic + R&C + Exam Prep. | Keep it once in the generic section. Remove from template overrides. |
| 6 | `CurriculumSystemPrompt` L329 + L363 | duplication | minor | `You output ONLY valid JSON arrays...` appears at both the start and end of the system prompt. Exact duplicate. | Remove one instance (keep the one at the end, which is the last thing Claude reads). |
| 7 | `BuildSystemPrompt` L139 | negative bloat | minor | `IMPORTANT: All content must be self-contained and work with text alone. Do not reference images, audio clips, videos, physical objects, or any external materials.` -- long negative list. | Shorten to: "All content must be text-only and self-contained. Do not reference external media or physical materials." |

## Summary

- **2 critical** (findings #1 and #3): actively cause wrong output or contradictory signals
- **2 important** (findings #2 and #4): add noise without structural harm
- **3 minor** (findings #5, #6, #7): cosmetic duplication

## Dependency

Findings #1, #2, #3 overlap with #305's scope (WarmUp content type allowlist + prompt cleanup subsection). After #305 merges, re-check which findings were addressed and clean up the rest as #306 AC4.
