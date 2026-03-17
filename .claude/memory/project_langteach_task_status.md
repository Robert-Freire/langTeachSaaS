---
name: LangTeach SaaS — Task Status and Next Steps
description: Which tasks are done, in progress, or next; task numbering convention
type: project
---

## Task Numbering Convention
Tasks are numbered sequentially within a phase. Branch naming: `task/t<N>-<short-description>`.
Phase 1 tasks are T1-T9 (defined in `plan/langteach-phase1/plan.md`).

## Phase 1 — COMPLETE (as of 2026-03-15)

| Task | Description | Status |
|------|-------------|--------|
| T1 | Repository & Tooling Setup | DONE |
| T2 | Azure Infrastructure (Bicep, Container Apps, SQL, SWA, Key Vault) | DONE |
| T3 | Auth0 Integration (JWT, Auth0Provider, Serilog, Playwright) | DONE |
| T4 | Database Schema (EF Core migrations, seed templates) | DONE |
| T5 | Teacher Profile API + UI | DONE |
| T5.1 | Design System (Tailwind, shadcn/ui, AppShell) | DONE |
| T6 | Student Profiles API + UI | DONE |
| T7 | Lesson CRUD API | DONE |
| T8 | Lesson UI (Planner, section editor, duplicate, publish) | DONE — PR #23 merged |
| T9 | CI/CD Pipeline (GitHub Actions, ACR, OIDC) | DONE — PR #27 merged |
| T9.1 | Brand & Logo | MOVED TO BETA T20 |

## Beta Phase — CURRENT (as of 2026-03-17)

**Next task: T20** (Brand & Visual Polish) or T23 (Beta Demo Preparation)

| Task | Description | Status |
|------|-------------|--------|
| T10 | Student Profile Enrichment (NativeLanguage, LearningGoals, Weaknesses fields) | DONE — PR #32 merged |
| T10.1 | Frontend Component Fixes (cmdk dep, PopoverTrigger render prop) | DONE — folded into T10 PR |
| T11 | Claude API Client (IClaudeClient, model routing, error handling) | DONE — PR #40 merged |
| T12 | Prompt Construction Service (IPromptService, GenerationContext, quality validation) | DONE — PR #41 merged |
| T13 | Generation Endpoints (7x POST /api/generate/*) | DONE — PR #42 merged |
| T14 | Streaming SSE endpoint + useGenerate hook | DONE — PR #44 merged |
| T15 | Lesson Editor AI Integration (per-section generate, streaming UI, edit/regenerate) | DONE — PR #45 merged |
| T15.1 | Typed Content Model Foundation (type registry, renderer dispatch, student view route) | DONE — PR #46 merged |
| T15.2 | Vocabulary Type (editable table for teacher, flashcards for student) | DONE — PR #48 merged |
| T15.3 | Exercise/Quiz Type (quiz editor for teacher, interactive quiz for student) | DONE — PR #50 merged |
| e2e-mock-auth | Mock-auth e2e architecture (decouple 6 tests from Auth0) | DONE — PR #51 merged |
| T15.4 | Conversation Type (dialogue editor for teacher, dialogue view for student) | DONE — PR #52/#53 merged |
| T15.5 | Grammar Type (styled renderer for teacher + student) | DONE — PR #55 merged |
| T15.6 | Homework Type (assignment renderer for teacher + student) | DONE — PR #56 merged |
| T16 | One-Click Full Lesson Generation | DONE — PR #54 merged |
| T17 | PDF Export | DONE — PR #63 merged |
| T18 | Student Lesson Notes (post-lesson notes, lesson history on student profile) | DONE — PR #64 open |
| T19 | Dashboard v2 (weekly schedule, WeekStrip, NeedsPrep, QuickActions) | DONE — PR #60 merged |
| T19.1 | Schedule from Dashboard ("+" on day columns, assign draft or create new) | DONE — PR #62 merged |
| T19.2 | Dashboard Scheduling Redesign (stay on dashboard, block slots, duplicate, adapt) | post-demo |
| T20 | Brand & Visual Polish (icon, favicon, loading states — replaces T9.1) | pending |
| T21 | Regenerate with Direction (make easier/harder/shorter/longer modifiers) | DONE — PR #65 merged |
| T23 | Beta Demo Preparation (seed data, demo script, talking points) | pending (always last) |

## Key T2 Deviations (important for future tasks)
- Azure Container Apps (not App Service) — VS Enterprise subscription has zero VM quota in all regions
- Region: North Europe (not West Europe — SQL Server unavailable there); SWA stays in West Europe
- Key Vault integration deferred to T4 — Container Apps validates KV refs at deploy before RBAC is granted
- KV name: `kv-lt-dev-5ba22u` (uniqueString suffix due to soft-delete collision)
- App URL: `https://app-langteach-api-dev.purplewater-292509f3.northeurope.azurecontainerapps.io`

## T9 Key Notes
- ACR name: `crlangteachdev` / login server: `crlangteachdev.azurecr.io`
- Backend CD: `az acr build` (builds in cloud) + `az containerapp update` — no Docker needed in runner
- Frontend CD: pre-build in workflow, then `Azure/static-web-apps-deploy@v1` with `skip_app_build: true`
- OIDC auth (not SP secret) — requires federated credential for `repo:Robert-Freire/langTeachSaaS:ref:refs/heads/main`
- Bicep circular dependency avoided by computing `acrLoginServer` as `${acrName}.azurecr.io` rather than using ACR module output

## T8 Key Notes
- `LessonsController` email guard: use `?? ""` fallback (same as StudentsController) — e2e test user JWT has no email claim
- `DuplicateAsync` prefixes copied lesson title with `"Copy of "`
- Docker API image must be rebuilt after backend changes (`docker compose build api`) before running Playwright

## Key T7 Notes (important for T8)
- `GET /api/lesson-templates` is NOT in T7 — T8 adds it as a minimal read-only controller (direct DbContext, no service, no new tests)
- `LessonUpdateResult` sealed record hierarchy (Success, NotFound, InvalidStudent) lives in `Services/LessonUpdateResult.cs` — use same pattern for any future service that needs discriminated outcomes
- Template section seeding in tests: seed `LessonTemplate` directly via `_factory.Services.CreateScope()` + `AppDbContext` (SeedData does not run in Testing environment)
- `UpdateLessonRequest.DurationMinutes` and `Status` are nullable — null means keep existing value

## Key T6 Notes (important for T7/T8)
- `PagedResult<T>` DTO is generic — reuse for T7 lessons list
- `UpsertTeacherAsync` now returns `Task<Guid>` (teacher DB Id) — use this pattern in T7 controller
- Test infrastructure: `TestAuthHandler` + `AuthenticatedWebAppFactory` + `ApiTestCollection` shared xUnit collection fixture. Use `[Collection("ApiTests")]` on all future test classes to share one factory and avoid Serilog/EF Core conflicts.
- EF Core InMemory dual-provider fix: directly register pre-built `DbContextOptions<AppDbContext>` singleton (don't call `AddDbContext` again in test factory — it stacks configure actions)
- Button component uses Base UI (no `asChild`). For link-buttons, use `buttonVariants` directly on `<Link>` from react-router-dom
- shadcn alert-dialog, select, textarea now installed in `frontend/src/components/ui/`

## Beta Plan (supersedes Phase 2 sequencing)
Plan at: `plan\langteach-beta\plan.md`
Phase 2 AI Core plan (`plan\langteach-phase2\plan.md`) remains valid as technical reference but task sequencing now follows the beta plan (T10-T23), reorganized around demo impact for first beta tester.

**Beta task overview:**
- Phase 2A (Core Magic): T10-T15 (all DONE)
- Phase 2A.1 (Typed Content): T15.1 content model foundation, T15.2 vocabulary type, T15.3 exercise type, T15.4 conversation type
- Phase 2B (Make It Real): T16 one-click full lesson, T17 PDF export, T18 student lesson notes, T19 dashboard v2, T21 regen with direction, T24 adapt lesson, T25 suggest next topic
- Phase 2C (Polish): T20 brand
- T23: Beta demo preparation (seed data, demo script, talking points)

**Key architectural decision (2026-03-15):** Content blocks must be typed (vocabulary, exercises, conversation, reading, freeText) with per-type renderers for both teacher (editor) and student (interactive) views. T22 (Interactive Exercise Rendering) absorbed into T15.3. Old T16 (One-Click Full Lesson) renumbered but kept.

**Demo audience:** Robert's brother, potential PM. Goal is to show the full teacher-to-student loop and sell the platform vision.

**Deferred from original Phase 2:** generation caching (T3), usage tracking/limits (T8), Stripe, content library, shareable links.

## Key T4 Notes (important for T5+)
- Student->Lesson FK is NoAction (not SetNull) — SQL Server multiple cascade path constraint. Nullify StudentId in service layer when soft-deleting students if needed.
- Migrations run automatically on startup via MigrateAsync; guarded with !IsEnvironment("Testing") for test host. E2ETesting environment runs migrations (real DB) but uses E2ETestAuthHandler instead of JWT.
- Mock-auth e2e: start API with ASPNETCORE_ENVIRONMENT=E2ETesting, frontend with npm run dev:e2e (VITE_E2E_TEST_MODE=true). Run: npx playwright test --project=mock-auth. Fixed identity: auth0|e2e-test-teacher / e2e-test@langteach.io.
- docker-compose mounts frontend/.env.local into container for Auth0 vars.
