# Task 406: Visual Test Infrastructure

## Goal
Build reusable visual test infrastructure so `review-ui` only runs existing specs and reads screenshots, never creates tests.

## Deliverables

### 1. `e2e/scripts/start-visual-stack.sh`
Shell script callable by review-ui agent and developers:
- `docker compose build frontend` (build once)
- `docker compose up -d` (idempotent)
- Poll `docker compose ps` / health endpoints until all services are healthy (api: `curl http://localhost:5000/health`, sqlserver: already has healthcheck)
- Check for seed marker (a student with `Notes = '[visual-seed]'` belonging to the mock teacher); if absent, call the visual seed

**Visual seed trigger:** `docker exec langteach-api dotnet LangTeach.Api.dll --visual-seed auth0|e2e-test-teacher`

The script calls the seed unconditionally; the seed method itself is DB-idempotent (checks for existing `[visual-seed]` students + courses and exits early). This satisfies the AC requirement "runs the seed if the marker is not present" because the seed method performs the marker check internally.

The script must be idempotent: safe to run on an already-running stack.

### 2. `DemoSeeder.cs` extension — visual seed
Add a new entry point `SeedVisualAsync(db, teacherLookup, logger)` alongside the existing `SeedAsync`.

Uses a `[visual-seed]` tag instead of `[demo]` so the two seed sets don't collide.

Creates entirely new entities (does NOT reuse demo-tagged data):
- **2 students** tagged `Notes = "[visual-seed]"` (Ana Visual B2, Marco Visual A2)
- **2 lessons** tagged via Notes placeholder (use `Topic = "[visual-seed]"` as marker) for the two students
  - Lesson 0 has a `LessonContentBlock` with `BlockType = ContentBlockType.Vocabulary` and this exact JSON payload (schema: `{ items: [{word, definition, exampleSentence}] }`):
    ```json
    {"items":[{"word":"travel","definition":"to go from one place to another","exampleSentence":"I love to travel."},{"word":"passport","definition":"an official document for international travel","exampleSentence":"Don't forget your passport."}]}
    ```
- **A course** tagged `Description = "[visual-seed]"` with `StudentId = students[0].Id`, 3 CurriculumEntry rows
  - One entry with `Status = "created"` and `LessonId` pointing to lesson 0

Idempotency marker: check BOTH `db.Students.AnyAsync(s => s.TeacherId == teacher.Id && s.Notes == "[visual-seed]")` AND `db.Courses.AnyAsync(c => c.TeacherId == teacher.Id && c.Description == "[visual-seed]")`. Both must be present for the seed to be considered complete; if either is absent, run the full seed (and delete partial state first for safety).

### 3. `Program.cs` — `--visual-seed` CLI argument
Mirror the existing `--seed` argument handling. On `--visual-seed <lookup>`:
- Run `DemoSeeder.SeedVisualAsync(...)`
- Exit 0/1

### 4. `e2e/tests/visual/` — per-screen specs
One file per screen, all tagged `@visual`. Each spec:
1. `beforeAll`: `createMockAuthContext` + `setupMockTeacher` (existing helpers)
2. `test`: navigate to route, `page.screenshot({ path: 'screenshots/<screen>.png' })`, assert no console errors

Screens and routing:

| File | Route | Notes |
|------|-------|-------|
| `dashboard.visual.spec.ts` | `/` | Uses seeded students + lessons |
| `settings.visual.spec.ts` | `/settings` | Teacher account |
| `students-list.visual.spec.ts` | `/students` | Seeded students |
| `students-new.visual.spec.ts` | `/students/new` | No seed |
| `students-edit.visual.spec.ts` | `/students/:id/edit` | Fetches first student via API |
| `lessons-list.visual.spec.ts` | `/lessons` | Seeded lessons |
| `lessons-new.visual.spec.ts` | `/lessons/new` | Students dropdown |
| `lesson-editor.visual.spec.ts` | `/lessons/:id` | Fetches seeded lesson via API |
| `study-view.visual.spec.ts` | `/lessons/:id/study` | Fetches lesson with content block |
| `courses-list.visual.spec.ts` | `/courses` | Seeded course |
| `courses-new.visual.spec.ts` | `/courses/new` | Students dropdown |
| `course-detail.visual.spec.ts` | `/courses/:id` | Fetches seeded course via API |
| `onboarding.visual.spec.ts` | `/onboarding` | Separate auth state: `createMockAuthContext` + no `setupMockTeacher` (fresh teacher, no onboarding complete) |

All specs use mock-auth mode (no real Auth0 needed). For routes needing a real ID (`/lessons/:id`, `/courses/:id`, `/students/:id/edit`), fetch the ID via a GET API call in `beforeAll`.

### 5. `playwright.config.ts` update
Add a `visual` project:
```ts
{
  name: 'visual',
  testMatch: ['**/visual/**/*.spec.ts'],
  fullyParallel: true,
  workers: 4,
}
```

The visual project does NOT appear in mock-auth or parallel (no test conflicts).

### 6. `review-ui.md` agent rewrite
Replace current approach:
1. Call `bash e2e/scripts/start-visual-stack.sh`
2. Determine affected screens from the diff (map changed files to routes)
3. Gap checks before running:
   - **Spec gap**: no `@visual` spec for the affected screen → log `VISUAL SPEC GAP: no @visual spec for screen <X>`, skip
   - **Data gap**: screen requires seed data not covered → log `VISUAL DATA GAP: screen <X> requires <data> not in seed`, skip
4. Run `npx playwright test --grep @visual --project=visual` for affected specs
5. Read screenshots from `e2e/screenshots/`
6. Report findings — PASS / NEEDS WORK with screenshot references
7. **Never generate test code**

### 7. `qa-verify.md` agent update
When verifying an `area:frontend` issue:
- Check `e2e/tests/visual/` for a `@visual` spec for each touched screen
- Check the visual seed for required data
- If either is missing: flag `VISUAL SPEC GAP` or `VISUAL DATA GAP` and include in verdict

### 8. `e2e/README-visual.md`
How to:
- Add a visual spec for a new screen
- Extend the visual seed
- What to do when review-ui or qa-verify reports a gap

---

## Implementation Order

1. `DemoSeeder.cs` — `SeedVisualAsync` method + `[visual-seed]` marker
2. `Program.cs` — `--visual-seed` CLI arg
3. `e2e/scripts/start-visual-stack.sh`
4. `e2e/tests/visual/` — 13 spec files
5. `playwright.config.ts` — visual project
6. `review-ui.md` rewrite
7. `qa-verify.md` update
8. `e2e/README-visual.md`

## Key Decisions

- **Visual seed is separate from demo seed** to avoid collisions; same teacher, different tag
- **Seed via CLI arg** (`--visual-seed`) mirrors existing `--seed` pattern; called from the shell script via `docker exec`
- **Screenshots dir**: `e2e/screenshots/` (create if absent in each spec)
- **Onboarding spec** uses a separate auth context without calling `setupMockTeacher`, so the teacher record doesn't exist yet and the app redirects to onboarding
- **StudyView seed**: vocabulary block JSON must match the `VocabularyContent` schema (`{ items: [{word, definition, exampleSentence}] }`) so the renderer shows flashcards
- **No snapshot diffing** — out of scope; specs just capture + assert no errors
- **screenshots dir**: add `e2e/screenshots/` to `.gitignore` and create `e2e/screenshots/.gitkeep`; specs write to this path with `{ path: 'screenshots/<screen>.png' }`
- **Onboarding spec**: the mock-auth handler auto-registers the fixed identity on first API call (done by `setupMockTeacher`). For onboarding, skip `setupMockTeacher` so no teacher record exists; the frontend SPA should redirect to `/onboarding` when `/api/auth/me` returns 404 or the teacher has `HasCompletedOnboarding = false`. Verify this behavior in `onboarding.spec.ts` (it already exists in the test suite) before relying on it.
- **playwright.config.ts top-level `use`**: existing config has `use: { baseURL, headless: true }` at top level; projects inherit this. The new `visual` project does not need to override it.

## Test plan
- `dotnet build` passes
- `dotnet test` passes (536 backend tests)
- `npx playwright test --project=visual` runs all 13 specs against seeded stack; all pass
- `start-visual-stack.sh` is idempotent (run twice, second run is a no-op)
