---
name: Playwright tests must be run before pushing — not just written
description: Always execute the Playwright test against the running stack before committing; writing it is not enough
type: feedback
---

The pre-push checklist requires `npx playwright test` to pass before pushing — not just that the test file exists.

For T5, the Playwright test was written but never executed. The test would have caught the 404 (teacher not found) bug caused by the upsert ordering issue, preventing a broken PR from being pushed.

Before every push on a task that includes a Playwright test:
1. Ensure the Docker stack is running (`docker compose up sqlserver api -d`)
2. Ensure the frontend is running (`npm run dev` or Docker)
3. Run: `cd e2e && npx playwright test tests/<task-spec>.spec.ts`
4. If it fails, fix the issue before pushing

Prerequisite: `e2e/.env` must have real Auth0 test credentials (`E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`).
If credentials are missing, stop and ask the user — do not skip the test.
