# Task 755: Fix nightly E2E fails — mock-teacher-helper defaults to wrong API port

## Problem
`mock-teacher-helper.ts` defaults to port 5178 (visual stack) instead of 5000 (standard docker-compose API). The nightly workflow does not set `VITE_API_BASE_URL`, so every test fails in `beforeAll` with ECONNREFUSED.

## Changes

### 1. `e2e/helpers/mock-teacher-helper.ts`
Change the fallback default from `http://localhost:5178` to `http://localhost:5000`.

### 2. `.github/workflows/nightly-e2e.yml`
Add `VITE_API_BASE_URL: http://localhost:5000` to the `Run Playwright tests` step env block.

### 3. Improve `notify_failure` job
Instead of creating a new issue per day (with same-day dedup only), look for any open issue with title matching `Nightly E2E failure` prefix:
- If one exists: add a comment with today's date and run link.
- If none exists: create a new one and assign it to the repo owner.
This stops accumulation of stale issues while still notifying the owner.

### 4. Close 8 stale nightly failure issues
Close #502, #619, #631, #660, #695, #712, #717, #753 with a "resolved by this fix" comment.

## Acceptance criteria
- [ ] `mock-teacher-helper.ts` default port is 5000
- [ ] `nightly-e2e.yml` sets `VITE_API_BASE_URL`
- [ ] notify_failure consolidates into a single open issue with daily comments
- [ ] 8 stale issues closed
