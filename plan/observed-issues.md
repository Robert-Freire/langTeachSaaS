# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
|-------------|------|----------|-------------|
| #198 | 2026-03-22 | Minor | `StudentForm.test.tsx` "shows English-specific weaknesses when English is selected" is flaky on the sprint branch (fails on `getByRole('option', { name: 'English' })`) despite PR #209 fixing a different test in the same file; may need `findByRole` fix for this test case too |
| #154 | 2026-03-22 | Minor | NativeLanguage selector in StudentForm shows "none" instead of "Not specified" in the closed trigger (same root cause as the "No student" fix in this PR) |
| #154 | 2026-03-22 | Minor | LessonNew step 2 uses a custom header layout (ArrowLeft icon + h1) instead of the PageHeader component used by every other sub-page, creating visual inconsistency between step 1 and step 2 |
| #224 | 2026-03-23 | Minor | With minReplicas=0, the old revision may be scaled to zero when a new deploy arrives. If the health gate fails and old revision is restored to 100% traffic, there will be a cold-start delay before it can serve requests. Potential improvement: set minReplicas=1 during deploy window, or pre-warm the old revision before shifting traffic back. |

*Items #2 and #3 are covered by #243 (visual polish batch). Item #1 is a test flakiness issue; monitor and create a separate issue if it persists.*
| #243 | 2026-03-23 | Minor | LessonEditor uses a custom header (not PageHeader), so PageHeader's new `truncate` class does not apply to the lesson title on the editor screen. Long lesson titles still wrap in LessonEditor's header row. |
| #255 | 2026-03-24 | Minor | `CurriculumEntry.TemplateUnitRef` stores the human-readable unit title as the reference key. If two future template units share the same title, the reference becomes ambiguous. Consider storing `UnitNumber` as a stable identifier alongside the title. No risk with current templates (all unique titles). |
| #257 | 2026-03-24 | Minor | Student selector in CourseNew shows the raw string "none" as trigger text when unselected, instead of the "No specific student" placeholder text. Same root cause as the NativeLanguage selector issue noted in #154. |
| #257 | 2026-03-24 | Minor | Student selector in CourseNew may show raw UUID as display value after selection in headless Chromium (Windows); likely a Radix UI rendering artifact, unconfirmed in real browser. |
| #151 | 2026-03-25 | minor | No e2e test covering the CEFR mismatch warning in LessonEditor (only CourseNew is covered); existing unit tests verify component behavior |
| #167 | 2026-03-25 | minor | E2E dismiss flow for AI guardrails warnings cannot be tested without a real Claude call or mock-server configuration that returns warnings; the e2e spec verifies page renders without errors but the dismiss branch is dead code in the e2e environment. Unit tests cover dismiss end-to-end. |
