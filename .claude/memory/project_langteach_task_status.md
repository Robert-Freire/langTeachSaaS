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
| T4 | Database Schema — EF Core migrations, Phase 1 tables, seed templates | NEXT |
| T5 | Teacher Profile API + UI | pending |
| T6 | Student Profiles API + UI | pending |
| T7 | Lesson CRUD API | pending |
| T8 | Lesson UI (Planner) | pending |
| T9 | CI/CD Pipeline (GitHub Actions) | pending |

## Key T2 Deviations (important for future tasks)
- Azure Container Apps (not App Service) — VS Enterprise subscription has zero VM quota in all regions
- Region: North Europe (not West Europe — SQL Server unavailable there); SWA stays in West Europe
- Key Vault integration deferred to T4 — Container Apps validates KV refs at deploy before RBAC is granted
- KV name: `kv-lt-dev-5ba22u` (uniqueString suffix due to soft-delete collision)
- App URL: `https://app-langteach-api-dev.purplewater-292509f3.northeurope.azurecontainerapps.io`

## Phase 2 Plan (future)
Full AI Core plan already written (T1-T8 internal tasks) but saved at WRONG location.
Should be at: `plan\langteach-phase2\plan.md` inside the project vault.
Was incorrectly saved at: `obsidianVault\Personal-AI-OS\Plans\langteach-phase2\plan.md`

## Current Session
- T3 implemented and PR #2 opened
- T3 requires manual Auth0 tenant setup before end-to-end testing (see PR description)
- T4 is next: EF Core migrations, Phase 1 DB schema, seed lesson templates
