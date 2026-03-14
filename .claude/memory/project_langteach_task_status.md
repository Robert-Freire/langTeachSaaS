---
name: LangTeach SaaS — Task Status and Next Steps
description: Which tasks are done, in progress, or next; task numbering convention
type: project
---

## Task Numbering Convention
Tasks are numbered sequentially within a phase. Branch naming: `task/t<N>-<short-description>`.
Phase 1 tasks are T1-T9 (defined in `plan/langteach-phase1/plan.md`).

## Phase 1 Task Status (as of 2026-03-14)

| Task | Description | Status |
|------|-------------|--------|
| T1 | Repository & Tooling Setup (monorepo, Docker, React, .NET 9) | DONE (2026-03-12) |
| T2 | Azure Infrastructure (Bicep: Container Apps, SQL, SWA, Key Vault, Storage) | DONE (2026-03-13) |
| T3 | Auth0 Setup & Integration (backend JWT, frontend Auth0Provider, Serilog, Playwright) | DONE — PR #2, login page confirmed working via Playwright |
| T4 | Database Schema — EF Core migrations, Phase 1 tables, seed templates | DONE — PR #10 merged to main |
| T5 | Teacher Profile API + UI | DONE — PR #11 merged to main |
| T5.1 | Design System & UI Foundation (Tailwind, shadcn/ui, AppShell, restyle T5) | DONE — PR #12 open (rebased on main) |
| T6 | Student Profiles API + UI | DONE — PR #13 open, all checks passed |
| T7 | Lesson CRUD API | DONE — PR #20 merged to main (2026-03-14) |
| T8 | Lesson UI (Planner) | IN REVIEW — PR #23 open, all checks passed (10/10 Playwright, 18/18 unit tests). |
| T9 | CI/CD Pipeline (GitHub Actions) | pending |
| T9.1 | Brand & Logo (icon, favicon, AppShell logomark) | pending — defer until T6-T8 done |

## Key T2 Deviations (important for future tasks)
- Azure Container Apps (not App Service) — VS Enterprise subscription has zero VM quota in all regions
- Region: North Europe (not West Europe — SQL Server unavailable there); SWA stays in West Europe
- Key Vault integration deferred to T4 — Container Apps validates KV refs at deploy before RBAC is granted
- KV name: `kv-lt-dev-5ba22u` (uniqueString suffix due to soft-delete collision)
- App URL: `https://app-langteach-api-dev.purplewater-292509f3.northeurope.azurecontainerapps.io`

## T8 Key Notes
- `LessonsController` email guard: use `?? ""` fallback (same as StudentsController) — e2e test user JWT has no email claim
- `DuplicateAsync` prefixes copied lesson title with `"Copy of "`
- Docker API image must be rebuilt after backend changes (`docker compose build api`) before running Playwright

## Key T7 Notes (important for T8)
- `GET /api/lesson-templates` is NOT in T7 — T8 adds it as a minimal read-only controller (direct DbContext, no service, no new tests)
- `LessonUpdateResult` sealed record hierarchy (Success, NotFound, InvalidStudent) lives in `Services/LessonUpdateResult.cs` — use same pattern for any future service that needs discriminated outcomes
- Template section seeding in tests: seed `LessonTemplate` directly via `_factory.Services.CreateScope()` + `AppDbContext` (SeedData does not run in Testing environment)
- `UpdateLessonRequest.DurationMinutes` and `Status` are nullable — null means keep existing value
- Issue #21 tracks adding `CancellationToken` to both `ILessonService` and `IStudentService`

## Key T6 Notes (important for T7/T8)
- `PagedResult<T>` DTO is generic — reuse for T7 lessons list
- `UpsertTeacherAsync` now returns `Task<Guid>` (teacher DB Id) — use this pattern in T7 controller
- Test infrastructure: `TestAuthHandler` + `AuthenticatedWebAppFactory` + `ApiTestCollection` shared xUnit collection fixture. Use `[Collection("ApiTests")]` on all future test classes to share one factory and avoid Serilog/EF Core conflicts.
- EF Core InMemory dual-provider fix: directly register pre-built `DbContextOptions<AppDbContext>` singleton (don't call `AddDbContext` again in test factory — it stacks configure actions)
- Button component uses Base UI (no `asChild`). For link-buttons, use `buttonVariants` directly on `<Link>` from react-router-dom
- shadcn alert-dialog, select, textarea now installed in `frontend/src/components/ui/`

## Phase 2 Plan (future)
Full AI Core plan already written (T1-T8 internal tasks) but saved at WRONG location.
Should be at: `plan\langteach-phase2\plan.md` inside the project vault.
Was incorrectly saved at: `obsidianVault\Personal-AI-OS\Plans\langteach-phase2\plan.md`

## Key T4 Notes (important for T5+)
- Student->Lesson FK is NoAction (not SetNull) — SQL Server multiple cascade path constraint. Nullify StudentId in service layer when soft-deleting students if needed.
- Migrations run automatically on startup via MigrateAsync; guarded with !IsEnvironment("Testing") for test host.
- docker-compose mounts frontend/.env.local into container for Auth0 vars.
