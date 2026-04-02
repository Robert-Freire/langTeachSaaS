# Visual Test Infrastructure

This document explains the visual testing layer: screenshot specs, the visual seed, and the stack-up script.

## What it is

Visual tests take screenshots of each screen in the app against a seeded database, without relying on AI-generated content or complex flows. The `review-ui` agent runs these specs and evaluates the screenshots. The goal is fast, reliable visual review in 2-5 minutes per run.

## Running visual specs

1. Start the visual stack (builds frontend, starts services, runs seed):
   ```bash
   bash e2e/scripts/start-visual-stack.sh
   ```
2. Run all visual specs:
   ```bash
   cd e2e && npx playwright test --project=visual
   cd e2e && npx playwright test --project=visual-onboarding
   ```
3. Screenshots are written to `e2e/screenshots/` (gitignored).

The stack-up script is idempotent. Running it on an already-healthy stack is a no-op.

## Adding a visual spec for a new screen

When a new screen (route) is added to the app, add a corresponding `@visual` spec in `e2e/tests/visual/`.

1. Create `e2e/tests/visual/<screen-name>.visual.spec.ts`.

2. Use this template:
   ```ts
   import { test, expect } from '@playwright/test'
   import { createMockAuthContext } from '../../helpers/auth-helper'
   import { setupMockTeacher } from '../../helpers/mock-teacher-helper'
   import { NAV_TIMEOUT } from '../../helpers/timeouts'
   import * as fs from 'fs'

   test.beforeAll(async ({ browser }) => {
       const ctx = await createMockAuthContext(browser)
       const page = await ctx.newPage()
       await setupMockTeacher(page)
       await page.close()
       await ctx.close()
   })

   test('@visual <screen-name>', async ({ browser }) => {
       fs.mkdirSync('screenshots', { recursive: true })
       const context = await createMockAuthContext(browser)
       const page = await context.newPage()
       const consoleErrors: string[] = []
       page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

       await page.goto('/<your-route>')
       await expect(page.locator('h1')).toBeVisible({ timeout: NAV_TIMEOUT })
       await page.screenshot({ path: 'screenshots/<screen-name>.png', fullPage: true })

       expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0)
       await context.close()
   })
   ```

3. If the route needs a real ID (e.g., `/items/:id`), fetch it via the API in `beforeAll`:
   ```ts
   const res = await page.request.get(`${API_BASE}/api/items`, { headers: AUTH_HEADER })
   const items = await res.json()
   itemId = items[0].id
   ```

4. Add the spec to the screen mapping table in `.claude/agents/review-ui.md`.

## Extending the visual seed

The visual seed is in `DemoSeeder.SeedVisualAsync` in `backend/LangTeach.Api/Data/DemoSeeder.cs`.

It creates entities tagged with `[visual-seed]`:
- Students: Notes = `[visual-seed]`
- Lessons: Topic = `[visual-seed]`
- Courses: Description = `[visual-seed]`

To add seed data for a new screen:
1. Add the new entities inside `SeedVisualAsync` in the same transaction.
2. Re-run `start-visual-stack.sh` to pick up the new seed (the partial-state guard will clean and re-seed).

The seed is idempotent: it checks for both students AND course presence before seeding. If either is missing, it cleans and re-runs the full seed.

## What to do when review-ui or qa-verify reports a gap

### VISUAL SPEC GAP: no @visual spec for screen X

A screen was changed or added but has no `@visual` spec. Action: add a spec following the template above (either in the current task or as a follow-up issue).

### VISUAL DATA GAP: screen X requires Y not in seed

The spec for screen X requires data that the visual seed does not provide. Action: extend `SeedVisualAsync` with the required data.

## Onboarding spec special case

The onboarding spec (`onboarding.visual.spec.ts`) resets the shared mock teacher record to test the fresh-user flow. It:
1. Calls `resetE2ETestTeacher()` in `beforeAll`
2. Registers the teacher via `/api/auth/me` without completing onboarding
3. Screenshots the onboarding wizard
4. Restores the standard teacher state in `afterAll`

It runs in the `visual-onboarding` project (serial, after `visual`) so it does not interfere with other specs.

## Seed data reference

| Entity | Tag field | Tag value | Purpose |
|--------|-----------|-----------|---------|
| Student (Ana Visual B2) | `Notes` | `[visual-seed]` | students-list, students-edit, courses |
| Student (Marco Visual A2) | `Notes` | `[visual-seed]` | students-list |
| Lesson "Travel Vocabulary" | `Topic` | `[visual-seed]` | lesson-editor, study-view (has vocabulary content block) |
| Lesson "Daily Routines" | `Topic` | `[visual-seed]` | lesson-editor (plain, no content) |
| Course "B2 English General Course" | `Description` | `[visual-seed]` | courses-list, course-detail |
