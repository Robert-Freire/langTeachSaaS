# Observed Issues

Out-of-scope observations logged by agents during implementation. Each row is something an agent noticed but did not fix because it was outside the current task's scope. These get batched into future GitHub issues by the PM.

| Source issue | Date | Severity | Observation |
|-------------|------|----------|-------------|
| #198 | 2026-03-22 | Minor | `StudentForm.test.tsx` "shows English-specific weaknesses when English is selected" is flaky on the sprint branch (fails on `getByRole('option', { name: 'English' })`) despite PR #209 fixing a different test in the same file; may need `findByRole` fix for this test case too |
