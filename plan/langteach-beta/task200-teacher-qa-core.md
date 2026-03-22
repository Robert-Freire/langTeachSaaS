# Task 200: Teacher QA Agent - Core

**Issue:** #200
**Branch:** worktree-task-t200-teacher-qa-core
**Sprint:** curriculum-personalization

---

## Scope

Build the foundational Teacher QA infrastructure:
1. A persistent QA docker stack (real Auth0, not mock)
2. Playwright automation scripts for two Spanish teacher personas (Ana A1.1, Marco B1.1)
3. The `.claude/skills/teacher-qa/SKILL.md` orchestrating rubric, personas, and execution workflow
4. Auth0 QA user setup documentation

**Out of scope (issues #201, #202):** Personas 3-5 (Carmen, exam prep, Sprint Reviewer), triage workflow, first full QA run.

---

## Architecture

### Why a separate QA docker stack?

The existing `docker-compose.e2e.yml` uses `ASPNETCORE_ENVIRONMENT=E2ETesting`, which bypasses JWT validation entirely. Teacher QA needs **real Auth0** (real JWT, real /api/auth/me registration flow) so QA data persists under a dedicated identity that e2e test teardown never touches.

Solution: `docker-compose.qa.yml` with `ASPNETCORE_ENVIRONMENT=Development`, different ports (5175), persistent named volumes (`qa-sqlserver-data`, `qa-azurite-data`), and no playwright runner container (agent runs playwright from host).

### How the skill agent works

1. Agent reads SKILL.md, picks mode (full / ana-a1 / marco-b1)
2. Checks if QA stack is already running; starts it if not (from the specified branch)
3. Runs Playwright scripts from host: `cd .claude/skills/teacher-qa/playwright && npx playwright test`
4. Playwright scripts: log in with real Auth0, create student, create lesson, trigger AI generation, wait for completion, take screenshots, extract lesson content (all sections as JSON), save to `teacher-qa-output/`
5. Agent reads the JSON output and screenshots, evaluates against the rubric using Claude, writes the structured report

### Playwright output format (per persona)

Each persona run saves to `.claude/skills/teacher-qa/output/<persona>-<timestamp>/`:
- `lesson-editor.png` - lesson editor view
- `student-view.png` - student view (if accessible)
- `lesson-content.json` - all sections extracted as structured JSON:
  ```json
  {
    "studentName": "Emma",
    "lessonTopic": "ordering at a restaurant",
    "template": "conversation",
    "level": "A1.1",
    "l1": "English",
    "sections": [
      { "type": "warm-up", "title": "...", "blocks": [...] }
    ]
  }
  ```
- `run-metadata.json` - student ID, lesson ID, generation time, branch

---

## Files to Create / Modify

### 1. `docker-compose.qa.yml` (new)

Like docker-compose.e2e.yml but:
- Project name: `langteachsaas-qa`
- `ASPNETCORE_ENVIRONMENT: Development` (real Auth0, NOT E2ETesting)
- `VITE_E2E_TEST_MODE: "false"` (real Auth0Provider in frontend)
- Ports: frontend 5175, API internal only (not exposed)
- Persistent named volumes: `qa-sqlserver-data`, `qa-azurite-data`
- No playwright service (runs from host)
- `AllowedOrigins__E2e: "http://frontend:5175"` (fix CORS for QA stack)
- Env var references: `${TEACHER_QA_*}` vars alongside the existing auth vars

### 2. `.env.qa.example` (new)

Documents required env vars. Not committed with secrets. Keys:
- Shared: `SA_PASSWORD`, `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `VITE_AUTH0_CLIENT_ID`, `CLAUDE_API_KEY`
- QA-specific: `TEACHER_QA_EMAIL`, `TEACHER_QA_PASSWORD`, `TEACHER_QA_AUTH0_USER_ID`
- Playwright: `PLAYWRIGHT_BASE_URL=http://localhost:5175`

### 3. `.claude/skills/teacher-qa/playwright/package.json` (new)

Minimal deps: `@playwright/test`, `dotenv`. Node scripts for easy invocation.

### 4. `.claude/skills/teacher-qa/playwright/playwright.config.ts` (new)

- `testDir: ./tests`
- `use.baseURL` from env `PLAYWRIGHT_BASE_URL` (default `http://localhost:5175`)
- Single project (no mock-auth/parallel split needed - all tests use real Auth0)
- `outputDir` and screenshot on failure

### 5. `.claude/skills/teacher-qa/playwright/helpers/auth.ts` (new)

Real Auth0 login using `TEACHER_QA_EMAIL` and `TEACHER_QA_PASSWORD`. Reuses the login flow from `e2e/helpers/auth-helper.ts` (`createAuthenticatedContext`). Returns a persistent BrowserContext.

### 6. `.claude/skills/teacher-qa/playwright/helpers/navigation.ts` (new)

App navigation helpers:
- `createStudent(page, data)` - fills student creation form
- `createLesson(page, studentId, data)` - creates lesson with template/topic
- `triggerGeneration(page, lessonId)` - clicks generate, waits for completion (with generous timeout for real Claude calls)
- `extractLessonContent(page)` - reads all section blocks from the DOM, returns structured JSON
- `screenshotTeacherView(page, outputDir)` - takes labeled screenshots

### 7. `.claude/skills/teacher-qa/playwright/tests/ana-a1.spec.ts` (new)

Ana persona automation:
- Login with QA user
- Upsert student "Emma" (A1.1, English L1, interests: travel, food) - create if not exists, skip if already exists
- Create lesson: Conversation template, topic "ordering at a restaurant"
- Trigger AI generation, wait up to 3 minutes
- Screenshot teacher editor view
- Navigate to student view (if route exists), screenshot
- Extract `lesson-content.json`
- Save all to `teacher-qa-output/ana-a1-<timestamp>/`

### 8. `.claude/skills/teacher-qa/playwright/tests/marco-b1.spec.ts` (new)

Marco persona automation (same pattern):
- Student "Luca" (B1.1, Italian L1, interests: football/movies, weakness: ser/estar confusion)
- Grammar template, topic "ser vs estar in context"
- Same output structure

### 9. `.claude/skills/teacher-qa/SKILL.md` (new)

The orchestration skill. Contains:
- Frontmatter: `name: teacher-qa`, `description: ...`, `model: claude-opus-4-6`
- Auth0 QA user setup instructions (one-time, for Robert to do manually in Auth0 dashboard)
- Argument parsing: `full`, `sprint`, `ana-a1`, `marco-b1`
- Execution flow: stack management, playwright run, output reading, rubric evaluation, report writing
- Full evaluation rubric (from plan.md Part 2) verbatim
- Persona definitions (Ana A1.1, Marco B1.1; link to #201 for the rest)
- Report format template

---

## Auth0 QA User Setup (one-time, Robert)

This is not automated code - it's a human step needed before the skill can run:

1. In Auth0 dashboard, create user: `teacher-qa@langteach.test` with a strong password
2. Copy the Auth0 user ID (format: `auth0|...`)
3. Add to `.env.qa` (copy from `.env.qa.example`):
   ```
   TEACHER_QA_EMAIL=teacher-qa@langteach.test
   TEACHER_QA_PASSWORD=<generated>
   TEACHER_QA_AUTH0_USER_ID=auth0|<id>
   ```
4. Verify login works: start the QA stack and manually log in once

The skill's SKILL.md will document this as a prerequisite.

---

## Student Upsert Logic

Because QA data persists across runs, the automation needs to handle "student already exists" gracefully. Approach: before creating a student, check if one with the same name already exists (via the students list page or API). If found, reuse it. If not, create it.

---

## Curriculum Data Integration

The SKILL.md rubric section references Jordi's curriculum data for CEFR alignment checks. When Claude evaluates the lesson, it should load the relevant curriculum JSON:
- Ana (A1.1): `data/curricula/iberia/A1.1.json`
- Marco (B1.1): `data/curricula/iberia/B1.1.json`

The agent reads these files and includes the grammar/vocabulary scope in its evaluation prompt so it can flag out-of-level content accurately.

---

## QA Stack Coordination

The QA stack uses project name `langteachsaas-qa` and port 5175, separate from the e2e stack (`langteachsaas-e2e`, port 5174). Both can run simultaneously.

Before starting the QA stack, check:
```bash
docker ps --filter "name=langteachsaas-qa" --format "{{.Names}}"
```

---

## Pre-push Checks

No changes to the main application code (backend, frontend, infra). All new files are in:
- `docker-compose.qa.yml` - infrastructure file
- `.env.qa.example` - documentation
- `.claude/skills/teacher-qa/` - skill and playwright scripts

Pre-push checks that apply:
- `az bicep build --file infra/main.bicep` - must pass (no infra changes, but required)
- `cd backend && dotnet build` - must pass (no backend changes)
- `cd frontend && npm run build` - must pass (no frontend changes)
- Backend and frontend tests - must all pass
- The teacher-qa playwright scripts compile without TypeScript errors: `cd .claude/skills/teacher-qa/playwright && npx tsc --noEmit`

---

## Implementation Order

1. `docker-compose.qa.yml` + `.env.qa.example`
2. `playwright/package.json` + `playwright.config.ts`
3. `playwright/helpers/auth.ts` + `playwright/helpers/navigation.ts`
4. `playwright/tests/ana-a1.spec.ts` + `playwright/tests/marco-b1.spec.ts`
5. `.claude/skills/teacher-qa/SKILL.md`
6. TypeScript type-check, pre-push checks, QA-verify, review, PR

---

*Created: 2026-03-22*
