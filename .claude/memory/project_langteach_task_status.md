---
name: LangTeach SaaS — Task Status and Next Steps
description: Where to find current task state, historical task reference
type: project
---

## Live Tracker: GitHub Issues

GitHub Issues is the single source of truth for task tracking (as of 2026-03-19).
Use `gh issue list` to see current state. Key queries:

- Current sprint: `gh issue list --milestone "Phase 2A: Teacher Workflow"`
- Must-haves: `gh issue list --label "P1:must"`
- Ready to pick up: `gh issue list --label "qa:ready"`

**Milestones:**
- Demo 1 (internal): CLOSED (all issues done)
- Phase 2A: Teacher Workflow (Course Planner, Audio Reflections, Difficulty Tracking, Group Classes, Material Upload) — ACTIVE
- Phase 2B: Production (onboarding, caching, usage limits, QA agent, CI pipeline)
- Phase 3: Growth (student portal, evaluation, content library, payments)

## Task Numbering Convention
Tasks are numbered sequentially within a phase. Branch naming: `task/t<N>-<short-description>`.

## Historical Reference (Phase 1 + Beta)

All Phase 1 tasks (T1-T9) and most Beta tasks (T10-T21, T23-e2e) are DONE.
See git history for details. Key completed milestones:
- Phase 1: repo setup, Azure infra, Auth0, DB, CRUD APIs, lesson UI, CI/CD
- Beta Phase 2A (AI Core): T10-T15 (Claude API, prompts, generation, streaming, typed content)
- Beta Phase 2B (Make It Real): T16-T21 (one-click generation, PDF export, student notes, dashboard v2, brand polish, mobile responsive, regenerate with direction)
- Demo Sprint: all issues closed, milestone closed

**Active sprint:** Phase 2A: Teacher Workflow (18 open issues)
- #98 Course/Curriculum Planner (P0)
- #100 Enhanced Difficulty Tracking (P1)
- #102 Material Upload (P1)
- #127 Exercise Correction with Explanation (P1)
- Audio Reflections (#99) deferred per Jordi's skepticism

## Key Architectural Notes
- Azure Container Apps (not App Service), North Europe region, SWA in West Europe
- ACR: `crlangteachdev.azurecr.io`, OIDC auth (not SP secret)
- Content blocks are typed (vocabulary, exercises, conversation, reading, grammar, homework, freeText) with per-type renderers
- Mock-auth e2e: ASPNETCORE_ENVIRONMENT=E2ETesting, VITE_E2E_TEST_MODE=true
- Student->Lesson FK is NoAction (SQL Server cascade constraint)
