# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
|-------------|------|----------|-------------|
| #380 | 2026-03-29 | minor | `MapToDto` in CreateAsync/UpdateAsync/DuplicateAsync paths does not `.Include(l => l.Template)` so TemplateName is null in those responses. Editor re-fetches via GetByIdAsync so no user impact, but inconsistent. Fix with other LessonService query hygiene. |
| #380 | 2026-03-29 | minor | `EXAM_PREP_SECTION_TASK_MAP` in FullLessonGenerateButton hardcodes pedagogical content-type routing in TS code instead of deriving from backend config. Should be driven by template-overrides data once #334 (Expose section profiles API) lands. |
| #380 | 2026-03-29 | minor | `BuildTemplateGuidanceBlock` is only injected in FreeTextUserPrompt and ExercisesUserPrompt. For consistency, it should also be applied to GrammarUserPrompt, VocabularyUserPrompt etc. so future templates that define overrides for those content types work automatically. |
| #351 | 2026-03-28 | minor | Grammar-focus warmUp override says "not practice or discovery" — "or discovery" could be misread as ruling out discovery globally across templates. Consider rephrasing to "not practice" only on next authoring pass (Isaac, 2026-03-28). |
| #335 | 2026-04-01 | major | `NATIVE_LANGUAGES` in OnboardingStep2 includes "Catalan" but backend `AllowedNativeLanguages` in StudentService does not. Selecting Catalan as native language in onboarding will throw a ValidationException. Pre-existing bug, not introduced by this refactoring. Fix: add "Catalan" to backend HashSet and sync comment to reference `NATIVE_LANGUAGES` in `lib/languages.ts`. |
| #351 | 2026-03-28 | minor | B1 presentation L1 interference note instruction is valuable. Consider propagating it as a section profile `levelSpecificNote` globally (not just via template overrides) so all B1 templates benefit, not just grammar-focus. |

*Cleared 2026-03-28 during Student-Aware Curriculum sprint close (round 2). 3 entries processed: 2 batched into #348 (input validation), 1 into #349 (UX polish). Docker e2e build context issue logged as #346 (P0).*

*Previous clearing 2026-03-27: 10 entries deleted, 3 batched into issues #302, #298.*
| #273 | 2026-03-30 | minor | No e2e test for guided-writing AI generation path. Requires live AI API; covered by Teacher QA runs. Same gap exists for all other Pedagogical Quality content types. |
| #318 | 2026-04-01 | minor | All 10 teacher-qa persona specs have `studentId: undefined` in saveRunOutput metadata. `upsertStudent` returns the ID but no spec captures it. Affects run traceability only; no functional impact. Pre-existing across all specs. |
| #318 | 2026-04-01 | minor | All 10 teacher-qa persona specs have comment "allow up to 3 minutes" above triggerFullGeneration, but the actual timeout is 8 minutes. Stale comment. Pre-existing across all specs. |
