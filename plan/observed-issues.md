# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
|-------------|------|----------|-------------|
| #198 | 2026-03-22 | Minor | `StudentForm.test.tsx` "shows English-specific weaknesses when English is selected" is flaky on the sprint branch (fails on `getByRole('option', { name: 'English' })`) despite PR #209 fixing a different test in the same file; may need `findByRole` fix for this test case too |
| #154 | 2026-03-22 | Minor | NativeLanguage selector in StudentForm shows "none" instead of "Not specified" in the closed trigger (same root cause as the "No student" fix in this PR) |
| #154 | 2026-03-22 | Minor | LessonNew step 2 uses a custom header layout (ArrowLeft icon + h1) instead of the PageHeader component used by every other sub-page, creating visual inconsistency between step 1 and step 2 |

*Items #2 and #3 are covered by #243 (visual polish batch). Item #1 is a test flakiness issue; monitor and create a separate issue if it persists.*
