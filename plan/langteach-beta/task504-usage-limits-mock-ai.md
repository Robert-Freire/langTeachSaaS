# Task 504: Fix usage-limits.spec.ts — use mockAiStream

## Issue
#504 — E2E: usage-limits.spec.ts times out in nightly CI (real AI generation too slow)

## Problem
The test calls real Claude API which consistently exceeds 90s TEST_TIMEOUT. Excluded from `parallel` project in PR #500.

## Fix

### 1. Rewrite `e2e/tests/usage-limits.spec.ts`
- Import `mockAiStream` + `GRAMMAR_FIXTURE` from `../helpers/mock-ai-stream`
- Remove `AI_STREAM_TIMEOUT` import (no longer needed)
- Call `await mockAiStream(page, GRAMMAR_FIXTURE)` before first `page.goto`
- Change `insert-btn.waitFor` timeout from `AI_STREAM_TIMEOUT` to `FEEDBACK_TIMEOUT`

The usage counter increments server-side on content block save (not on the AI call itself),
so a mocked stream still triggers the counter.

### 2. Update `e2e/playwright.config.ts`
- Add `**/usage-limits.spec.ts` to `mock-auth` project `testMatch`
- Remove `**/usage-limits.spec.ts` from `parallel` project `testIgnore`

## Acceptance Criteria
- Test runs in mock-auth project with mocked AI stream
- Test verifies usage counter increments after inserting a content block
- usage-limits.spec.ts no longer in parallel testIgnore
