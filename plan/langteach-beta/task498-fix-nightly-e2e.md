# Task 498: Fix Nightly E2E — Curate Suite and Add Failure Notifications

## Issue
https://github.com/Robert-Freire/langTeachSaaS/issues/498

## Problem Summary

`e2e/tests/ai-guardrails.spec.ts` imports two non-existent modules:
- `./helpers/courses` (no such file)
- `./helpers/auth` (no such file; real auth helper is `e2e/helpers/auth-helper.ts`)

Playwright loads all spec files before running, so this single import crash zeroes out the entire nightly suite. Additionally the nightly runs all projects (including `visual` and `destructive`) and has no failure notification.

## Analysis

### AC1: Fix ai-guardrails.spec.ts

The spec was written with a different test API (`loginAsTeacher(page)`, `createCourse(page, {...})`) that doesn't exist in this codebase. The correct pattern (used by `cefr-mismatch-warning.spec.ts`, `courses.spec.ts`) is:
- `createMockAuthContext(browser)` for authentication
- Mock API routes via `page.route()` rather than calling real endpoints
- Import helpers from `../helpers/`, not `./helpers/`

The `warnings-panel` and `dismiss-warning-*` test IDs exist in `frontend/src/pages/CourseDetail.tsx` (the `WarningsPanel` component). The feature is real and testable.

**Fix:** Rewrite `ai-guardrails.spec.ts` to use `createMockAuthContext`, mock `GET /api/courses/:id` returning a course with `warnings` array, and test the panel render + dismiss flow. Add to `mock-auth` testMatch. Add to `parallel` testIgnore.

### AC2: Curate the nightly test set

Current nightly: `npx playwright test` (no project filter) runs ALL projects including:
- `visual` / `visual-onboarding`: need a separately seeded stack (start-visual-stack.sh) — cannot run in nightly CI
- `destructive`: runs `registration.spec.ts` which deletes and recreates the shared teacher record

Fix: pass `--project mock-auth --project parallel --project serial` to limit nightly to safe, curated tests.

### AC3: Failure notification

Add a step after test run that creates a GitHub issue on failure, labeled `bug` + `area:e2e`. Requires adding `issues: write` permission to the workflow.

### AC4: Verify

Trigger `workflow_dispatch` after PR merges to confirm green run.

## Files to Change

| File | Change |
|------|--------|
| `e2e/tests/ai-guardrails.spec.ts` | Rewrite using mock-auth + mocked API |
| `e2e/playwright.config.ts` | Add spec to `mock-auth` testMatch; add to `parallel` testIgnore |
| `.github/workflows/nightly-e2e.yml` | Add project filter; add `issues: write` permission; add failure notification step |

## Implementation Steps

### Step 1: Rewrite ai-guardrails.spec.ts

Use the same pattern as `cefr-mismatch-warning.spec.ts`:
- `beforeAll`: `createMockAuthContext` + `setupMockTeacher`
- Test 1: mock `GET /api/courses/:id` returning course with empty `warnings` array -> `warnings-panel` not visible
- Test 2: mock `GET /api/courses/:id` returning course with one warning -> `warnings-panel` visible -> click `dismiss-warning-0` -> panel disappears or clear badge shows

`CurriculumWarning` shape: `{ sessionIndex: number, grammarFocus: string, flagReason: string, suggestedLevel: string }`.
Use `sessionIndex: 0` in the fixture so the test ID `dismiss-warning-0` matches.

Full course mock fixture must include: `id`, `name`, `language`, `mode`, `targetCefrLevel`, `targetExam: null`, `examDate: null`, `sessionCount`, `studentId: null`, `studentName: null`, `lessonsCreated: 0`, `description: null`, `createdAt`, `updatedAt`, `entries: []`, `warnings`.

Note: `area:e2e` label confirmed to exist in the repo.

### Step 2: Update playwright.config.ts

Add `'**/ai-guardrails.spec.ts'` to `mock-auth.testMatch`.
Add `'**/ai-guardrails.spec.ts'` to `parallel.testIgnore`.

### Step 3: Update nightly-e2e.yml

1. Add `issues: write` to permissions.
2. Change the Run Playwright step:
   ```
   npx playwright test --project mock-auth --project parallel --project serial --reporter=html
   ```
3. Add failure notification step after the test step (runs `if: failure()`):
   ```yaml
   - name: Create failure issue
     if: failure()
     uses: actions/github-script@v7
     with:
       github-token: ${{ github.token }}
       script: |
         const today = new Date().toISOString().slice(0, 10)
         await github.rest.issues.create({
           owner: context.repo.owner,
           repo: context.repo.repo,
           title: `Nightly E2E failure (${today})`,
           body: `Nightly E2E workflow failed.\n\nRun: ${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
           labels: ['bug', 'area:e2e']
         })
   ```

## Acceptance Criteria Checklist

- [ ] AC1: `ai-guardrails.spec.ts` imports are fixed and tests pass with mock-auth
- [ ] AC2: Nightly workflow runs only mock-auth + parallel + serial projects
- [ ] AC3: Nightly creates a GitHub issue on failure
- [ ] AC4: Manual workflow_dispatch run passes (post-merge)
