# Prompt Health Review: Pedagogical Quality Sprint

**Date:** 2026-04-02
**Files reviewed:** `backend/LangTeach.Api/AI/PromptService.cs` + 5 section profile JSONs (`warmup`, `wrapup`, `practice`, `presentation`, `production`)
**Previous review:** `plan/sprints/prompt-health-review-student-aware-curriculum.md` (2026-03-27)

## Delta from Last Review

All 7 findings from the prior review are resolved:
- Findings #1, #2, #3 (WarmUp negative constraints, Exam Prep contradiction): removed from PromptService.cs — content type allowlist and positive guidance now cover these
- Finding #4 (oral role-play duplicate negative constraint): removed
- Finding #5 (5x "All five sections required" duplication): resolved
- Finding #6 (duplicate JSON output instruction in CurriculumSystemPrompt): only one instance now at line 1033
- Finding #7 (verbose self-contained constraint): now clean at line 416: "All content must be text-only and self-contained."

## Findings

| # | Location | Category | Severity | Description | Recommended fix |
|---|----------|----------|----------|-------------|-----------------|
| 1 | `practice.json:C1:guidance` | hedging | minor | "Minimize purely mechanical items" uses hedging language — the model can still generate mechanical items and consider itself compliant. | Replace with: "Use reformulation, paraphrase, register transfer, and pragmatic inference tasks. Fill-in-blank and simple matching are not appropriate at C1." |
| 2 | `practice.json:B1:guidance` | negative fragment | minor | "do not rely on just one type" embedded in an otherwise positive sentence. Low priority since the sentence is mostly positive. | Replace "do not rely on just one type" with the already-present constraint "Include transformation and error correction items." The positive instruction is sufficient. |
| 3 | `BuildSectionConversationPrompt` lines 624-627 | negative bloat | minor | Forbidden exercise reasons are emitted as "Do not generate activities that: [reason]". Currently only fires for CO-* (listening) reasons. Negative framing of a structural constraint that could instead be positive ("This is a text-only activity; no audio resources are available."). Not urgent — only fires for WarmUp/WrapUp conversation. | Replace with positive: "This activity is text-only. No audio, listening comprehension, or recording activities are available." |
| 4 | `ExercisesUserPrompt` line 559 | minor negative | minor | "GRAMMAR ACCURACY CONSTRAINTS (mandatory — do not violate)" — the "do not violate" ending is redundant given "mandatory" already establishes that. | Remove "do not violate"; keep "GRAMMAR ACCURACY CONSTRAINTS (mandatory):" |
| 5 | `production.json:A1:guidance` | minor positive ambiguity | minor | "Production MUST be a guided writing task... Alternatively, a guided dialogue... is appropriate when the session focus is oral production." The "alternatively" creates a two-path instruction where neither is clearly preferred. The model may default to whichever appears first (guided writing). | Make the preference explicit: "Default to guided writing unless the teacher or template specifies oral production." |

## Summary

- 0 critical
- 0 important
- 5 minor
- PromptService.cs health: CLEAN
- Section profiles health: CLEAN (minor hedging in C1 practice)
- Overall: CLEAN

The sprint's structural changes (content type allowlists, section profile config, grammar constraints from GrammarValidationService) successfully moved constraints out of prompt text and into structural enforcement. The prompt layer is leaner than the previous sprint.
