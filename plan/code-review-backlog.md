# Code Review Backlog

Unfixed notes from code review (review agent) runs. When reviewing this backlog, be critical: if a finding has real risk (future breakage, i18n issues, security), create an issue. If it's superficial or speculative, delete it.

---

*Cleared 2026-03-28 during Student-Aware Curriculum sprint close (round 2). 9 entries processed: 4 batched into #347 (pedagogy data consistency), 2 into #349 (UX polish), 3 deleted (redundant tests nit, harmless prompt duplication, undocumented fallback comment).*

## PR task-t272-sentence-transformation (2026-03-31) — #272 sentence transformation format

| Severity | File | Note |
|---|---|---|
| Minor | `e2e/tests/sentence-transformation-type.spec.ts` | Two of four e2e tests (correct answer, alternative answer) omit `score-summary` assertion, diverging from `sentence-ordering-type.spec.ts` pattern. Low risk. |
| Major | `frontend/src/types/contentTypes.ts` coerceExercisesContent | Early return at line 328 (`if (isExercisesContent(v)) return v`) bypasses item filtering for `sentenceTransformation` (and `sentenceOrdering`) when base arrays are already valid. Malformed `alternatives` values could pass through un-sanitized. Pre-existing pattern, not introduced by this PR. Affects all optional sub-formats. Fix in a coercion hardening pass. |

## PR task-t269-sentence-ordering (2026-03-31) — #269 sentence ordering format

| Severity | File | Note |
|---|---|---|
| Minor | `frontend/src/types/contentTypes.ts` coerceExercisesContent | sentenceOrdering items are filtered with shape validation during coercion, but fillInBlank/multipleChoice/matching items are not. Convention inconsistency only; low risk since AI rarely produces malformed exercise items beyond the sentenceOrdering case. Align in a future coercion hardening pass. |
| Minor | `frontend/src/components/lesson/renderers/ExercisesRenderer.tsx` Student | `available` filtering uses `chosen.includes(idx)` (O(n) per item). Fine for typical 4-8 fragment arrays; could use a Set for cleaner code if fragment counts grow. |

## PR #351 (2026-03-28) — #351 additive section guidance model

| Severity | File | Note |
|---|---|---|
| Minor | `PromptService.cs` restrictions block | Restrictions render as negative constraints ("Do not use [LUD] exercises"). Future authoring pass should consider positive framing ("Use written tasks only. Exclude LUD exercises.") as restrictions list grows. |
| Minor | `template-overrides.json:culture-society:practice` | "Avoid purely mechanical grammar drills" is soft negative bloat. Replace with positive task description on next authoring pass. |
| Minor | `PromptServiceTests.cs` fragile assertions | Tests `LessonPlanPrompt_UserPrompt_PracticeGuidance_*` and `LessonPlanPrompt_UserPrompt_RequiresProductionInEveryLesson` assert against B1 profile prose substrings. Any future wording change to `practice.json`/`production.json` B1 will silently break these. |
| Minor | `PromptService.cs:GetSectionFallbackGuidance` | Expression-body switch syntax; other private helpers in PromptService.cs use block-body. Style inconsistency only. |

## PR #346 (2026-03-28) — #346 fix Docker e2e build context

| Severity | File | Note |
|---|---|---|
| Minor | `.dockerignore` | `scripts/` and `.github/` dirs not excluded — tiny size (~8KB), no functional impact. Could be added for completeness. |

## PR #334 (2026-03-28) — #326 frontend section content types

| Severity | File | Note |
|---|---|---|
| Important | `frontend/src/components/lesson/GeneratePanel.tsx` | `useSectionRules` has no `isError` handling — if the fetch fails permanently, `sectionRules` stays `undefined` and ALL_CONTENT_TYPES is silently returned (content-type filtering disabled with no user feedback). Graceful degradation is intentional but should surface an inline error or toast. |
| Minor | `backend/LangTeach.Api.Tests/Controllers/PedagogyControllerTests.cs` | The 3 tests all call the same endpoint; second/third tests are redundant round-trips. Could collapse assertions into a single test. |

---

## PR #325 - 2026-03-28

| Severity | Location | Finding |
|----------|----------|---------|
| Low | PromptService.cs | `CurriculumSystemPrompt` emits "You output ONLY valid JSON arrays..." and `CurriculumUserPrompt` ends with "Output ONLY the JSON array." — duplicate JSON-only instruction across system+user prompt pair. Remove from system prompt, keep in user prompt. |

---

## PR #323 - 2026-03-28

| Severity | Location | Finding |
|----------|----------|---------|
| Medium | l1-influence.json + consumer (#324) | `persian.family: null` — PedagogyConfigService must null-guard family lookup; `families[language.family]` without null check will throw |
| Low | style-substitutions.json + consumer (#324) | `neverSubstituteWith: ["EE-*"]` uses glob-style wildcard; consumer must handle pattern matching, not plain `Array.includes()` |
| Low | course-rules.json | Skill distribution maxes sum to 1.05 — these are per-competency ranges (not simultaneous), matches Isaac's spec. No change needed unless a validator enforces total=1. |

---

## PR #320 — CEFR level rules JSON (2026-03-28) — MEDIUM

**Schema split: vocabularyPerLesson (A1-B2) vs vocabularyApproach (C1-C2)**
A1-B2 use `vocabularyPerLesson: { productive: {min,max}, receptive: {min,max} }`. C1-C2 replace this with a string `vocabularyApproach`. This is intentional per Isaac's spec and Sophy's Layer 3 schema. When the consuming C# service (CefrRulesService) is implemented, it must handle both shapes -- either via a union type or by checking for key presence. Risk: null ref if loader reads `vocabularyPerLesson.productive.min` unconditionally on C1/C2 documents.

---

| PR | Date | Severity | Description |
|----|------|----------|-------------|
| #322 | 2026-03-28 | minor | `template-overrides.json` uses camelCase keys `warmUp`/`wrapUp` while `section-profiles/` uses lowercase `warmup`/`wrapup`. AC specifies camelCase; PedagogyConfigService (#324) must handle this mapping explicitly to avoid silent lookup failures. |

## PR #312 (2026-03-28) — prompt-health-fixes

| Severity | File | Note |
|----------|------|------|
| minor | `PromptService.cs:FreeTextUserPrompt` | Does not call `_profiles.GetGuidance(...)` unlike all other prompt builders. Intentional generic fallback but undocumented. Worth a comment explaining why section profile guidance is skipped. |

| PR#338 | 2026-03-28 | low | PedagogyConfig.cs ExerciseTypeEntry: `bool Available = false` uses value-type default while other optional fields use nullable types. Functionally correct; minor style divergence. |

| PR#360 | 2026-03-28 | low | PromptService.cs BuildRequest: StudentName and other PII are logged via named structured parameters ({SystemPrompt}, {UserPrompt}). Structured logging backends (Seq, App Insights) index these as searchable fields. Currently safe (Debug only in test/QA compose files), but worth switching to unstructured embedding or documenting as a known constraint to prevent accidental production enablement. |
