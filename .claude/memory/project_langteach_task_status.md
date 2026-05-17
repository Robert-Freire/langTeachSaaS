---
name: LangTeach SaaS — Task Status and Next Steps
description: Sprint branch name, milestone sequence, and pointers to live state. NOT per-issue status (query GitHub for that).
type: project
originSessionId: cdfd3e9b-4731-4ad7-8679-11c1de9c3545
---
## In-Flight Tasks (2026-05-17)

Hardening II rounds 1-5 follow-ups all merged. #1292 (Vision dev compose) closed inline. New bug surfaced by user testing on real A1 content:

- #1293 (P1:must) -- correction main pass hits 16384 max_tokens cap on real-world A1 redaccion content. Three-layer fix: raise cap to 32k + telemetry, choose verbosity-trim or chunking based on telemetry, frontend polling UX for the 60-300s wait window. Sprint-promise regression: A1 corrections silently fail.

Deferred to Groups milestone:
- #1283 (P3:nice) -- pre-commit + CI high-entropy secret scanner
- #1284 (P2:should) -- automated audit: appsettings.json keys must reach Key Vault + env + ALL docker-compose files (not just QA / e2e). Would have caught #1292 in CI.
- #1285 (P1:must) -- A10 ceiling drift: B1.1 exercises generator produces subjuntivo drill despite #1227 guard.

Procedure updates landed mid-sprint:
- .claude/procedures/issue-management.md: External Infrastructure gate (qa:ready specialist gates)
- .claude/skills/smoke-test/SKILL.md: UNVERIFIED result state replaces PASS(partial); blocks sprint close until human-verify or explicit waiver

Sprint-close paused until #1293 lands. After: re-test the Marton K A1 redaccion correction end-to-end. If correction succeeds, sprint can close.


## Next Sprint: Groups

Epic: #1238 "EPIC: Groups -- teacher creates and manages student groups for academy classes"
Milestone: Groups (milestone already created on GitHub)
Status: Epic created, tasks NOT yet broken out. Isaac review required before task creation (4 open pedagogical questions in the epic). Work begins after Hardening II sprint close.

## Live Tracker: GitHub Issues

GitHub Issues is the single source of truth for task tracking.
**Never trust this file for per-issue status. Always query GitHub.**

Key queries:
- Current sprint issues: `gh issue list --milestone "<milestone-name>" --state open`
- Must-haves: `gh issue list --milestone "<milestone-name>" --label "P1:must" --state open`
- Ready to pick up: `gh issue list --milestone "<milestone-name>" --label "qa:ready" --state open`

**Active sprint branch:** `sprint/text-correction` (milestone #21, Text Correction)

## Milestone Sequence (newest first)

| Milestone | Status | Notes |
|-----------|--------|-------|
| Hardening II | ACTIVE | sprint/hardening-ii, milestone #22. 12 issues (#1222-#1233). Correction prompt robustness (Pass 2 ser/estar #1222), security rate limit (#1223), arch cleanup (#1224), DB hardening (#1228), prompt externalization (#1229), generation grammar scope (#1227), pedagogy C-category (#1226), UI polish (#1225, #1231), Atelier hardening (#1230), test infra (#1232), prompt-health sweep (#1233). Sprint story: plan/sprints/hardening-ii.md |
| Text Correction | CLOSED 2026-05-11 | sprint/text-correction, milestone #21, merged to main. Redacción markup (C/G/L/O), two-pass pipeline, .docx export, CEFR-calibrated corrections, thumbs feedback. Sprint story: plan/sprints/text-correction.md |
| Hardening | CLOSED 2026-05-08 | sprint/hardening, milestone #20, merged to main and deployed. Atelier rebrand shipped, CEFR canonicalization, extraction polish, Whisper transcription rework. Sprint story: plan/sprints/hardening.md |
| Unified Voice & Chat | CLOSED 2026-05-03 | milestone #19, merged to main (commit 774961b8), branch deleted. Atelier Assistant shipped: FAB launcher, multi-entity proposals, voice + text input, modify-in-place. Sprint story: plan/sprints/unified-voice-chat.md |
| Student Profile Voice Input | CLOSED 2026-04-27 | milestone #18, merged to main, branch deleted |
| Stabilisation | CLOSED 2026-04-25 | milestone #17, merged to main, branch deleted |
| UI Redesign & Student Profile Polish | CLOSED 2026-04-22 | milestone #16, merged to main, branch deleted |
| Adaptive Replanning | CLOSED 2026-04-08 | 22/22 done, merged to main |
| Post-Class Tracking | CLOSED 2026-04-04 | 23/23 done, merged to main |
| Pedagogical Quality | CLOSED 2026-04-02 | 35/35 done, merged to main |
| Student-Aware Curriculum | CLOSED 2026-03-29 | merged to main |
| Pedagogical Credibility | CLOSED | merged into Student-Aware Curriculum |
| Curriculum & Personalization | CLOSED 2026-03-24 | 35/35 done, merged to main |
| Phase 2A: Teacher Workflow | CLOSED 2026-03-21 | reorganized |
| Demo 1 (internal) | CLOSED | |

## Upcoming Milestones (not yet started)

- Listening Comprehension: deferred
- Solo Whiteboard: deferred
- Group Classes: FUTURE
- Phase 2B: Production (caching, usage limits, CI pipeline)
- Phase 3: Growth (student portal, evaluation, content library, payments)

## Task Numbering Convention

Tasks are numbered sequentially within a phase. Branch naming: `task/t<N>-<short-description>`.

## Key Architectural Notes

- Azure Container Apps (not App Service), North Europe region, SWA in West Europe
- ACR: `crlangteachdev.azurecr.io`, OIDC auth (not SP secret)
- Content blocks are typed (vocabulary, exercises, conversation, reading, grammar, homework, freeText, errorCorrection, noticingTask, guidedWriting) with per-type renderers
- Mock-auth e2e: ASPNETCORE_ENVIRONMENT=E2ETesting, VITE_E2E_TEST_MODE=true
- Student->Lesson FK is NoAction (SQL Server cascade constraint)
- Deploy freeze: primary mechanism is sprint branch workflow (don't trigger merge action). DEPLOY_FROZEN repo variable was removed.

## Production Incidents

### 2026-03-22: API ActivationFailed (issue #217, resolved)
- **Root cause:** `AzureBlobStorage--ConnectionString` secret missing from Key Vault.
- **Lesson:** When adding a service that reads from Key Vault, ensure the secret is provisioned.
