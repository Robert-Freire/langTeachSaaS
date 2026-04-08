# Task 496 — Fix Playwright race condition in navigation.ts

## Issue
#496: Fix Playwright race condition in navigation.ts: content-blocks wait registered after response fires

## Problem

In `extractLessonContent` (`.claude/skills/teacher-qa/playwright/helpers/navigation.ts`, line 266), the
`waitForResponse` for `/content-blocks` is registered AFTER `page.goto()` completes. When the page
loads, both `/api/lessons/{id}` and `/api/lessons/{id}/content-blocks` fire nearly simultaneously.
By the time we await the second `waitForResponse`, the response may have already fired, causing an
intermittent timeout.

## Root Cause

```typescript
// BEFORE (race condition)
const [lessonResponse] = await Promise.all([
  page.waitForResponse(resp => ...lessonId..., { timeout: 30000 }),
  page.goto(`${baseURL}/lessons/${lessonId}`),
])
// goto already completed above — content-blocks may have already fired
const blocksResponse = await page.waitForResponse(
  resp => ...content-blocks...,
  { timeout: 30000 }
)
```

## Fix

Register both `waitForResponse` calls inside the same `Promise.all` as `page.goto`, so both listeners
are active before the navigation action triggers any network requests.

```typescript
// AFTER (race-free)
const [lessonResponse, blocksResponse] = await Promise.all([
  page.waitForResponse(resp => ...lessonId..., { timeout: 30000 }),
  page.waitForResponse(resp => ...content-blocks..., { timeout: 30000 }),
  page.goto(`${baseURL}/lessons/${lessonId}`),
])
```

## File Changed

- `.claude/skills/teacher-qa/playwright/helpers/navigation.ts` (lines 254-270)

## Acceptance Criteria

- Teacher QA content generation tests do not fail due to this race condition
- No intermittent navigation.ts timing failures in CI
