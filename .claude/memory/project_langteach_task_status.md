---
name: LangTeach SaaS — Task Status and Next Steps
description: Where to find current task state, historical task reference
type: project
---

## Live Tracker: GitHub Issues

GitHub Issues is the single source of truth for task tracking (as of 2026-03-19).
Use `gh issue list` to see current state. Key queries:

- Current sprint: `gh issue list --milestone "Curriculum & Personalization"`
- Must-haves: `gh issue list --label "P1:must"`
- Ready to pick up: `gh issue list --label "qa:ready"`

**Milestones:**
- Demo 1 (internal): CLOSED
- Phase 2A: Teacher Workflow: CLOSED (reorganized 2026-03-21)
- Curriculum & Personalization: ACTIVE (target Easter April 5, Jordi testing)
- Solo Whiteboard: NEXT SPRINT (5 sub-issues from #174)
- Adaptive Replanning: AFTER WHITEBOARD (audio input, post-class reflections, auto-difficulty updates, course replanning, progress dashboard)
- Group Classes: FUTURE (#146, #147)
- Phase 2B: Production (caching, usage limits, CI pipeline)
- Phase 3: Growth (student portal, evaluation, content library, payments)
- Backlog (no milestone): polish, tech debt, grammar constraints, guardrails

## Task Numbering Convention
Tasks are numbered sequentially within a phase. Branch naming: `task/t<N>-<short-description>`.

## Historical Reference (Phase 1 + Beta)

All Phase 1 tasks (T1-T9) and most Beta tasks (T10-T21, T23-e2e) are DONE.
See git history for details. Key completed milestones:
- Phase 1: repo setup, Azure infra, Auth0, DB, CRUD APIs, lesson UI, CI/CD
- Beta Phase 2A (AI Core): T10-T15 (Claude API, prompts, generation, streaming, typed content)
- Beta Phase 2B (Make It Real): T16-T21 (one-click generation, PDF export, student notes, dashboard v2, brand polish, mobile responsive, regenerate with direction)
- Demo Sprint: all issues closed, milestone closed

**Active sprint: Curriculum & Personalization** (target Easter April 5)
- #184 Fix phantom materials in AI generation (P1, done, PR #193 merged)
- #157 AI-Powered Difficulty Targeting (P1, in progress)
- #163 Extract curricula JSON (P1, in progress, Ready to Test)
- #164 Integrate curriculum data as templates (P2, in progress, depends on #163)
- #150 Filter difficulties by target language (P1, ready)
- #161 Custom free-text entries for learning goals (P1, done, PR #172 merged)
- #154 Auto-fill lesson language/level from student (P2, ready)
- #151 CEFR level mismatch warning (P2, ready)

## Key Architectural Notes
- Azure Container Apps (not App Service), North Europe region, SWA in West Europe
- ACR: `crlangteachdev.azurecr.io`, OIDC auth (not SP secret)
- Content blocks are typed (vocabulary, exercises, conversation, reading, grammar, homework, freeText) with per-type renderers
- Mock-auth e2e: ASPNETCORE_ENVIRONMENT=E2ETesting, VITE_E2E_TEST_MODE=true
- Student->Lesson FK is NoAction (SQL Server cascade constraint)
