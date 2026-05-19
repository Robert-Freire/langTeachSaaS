---
name: LangTeach SaaS — Task Status and Next Steps
description: Sprint branch name, milestone sequence, and pointers to live state. NOT per-issue status (query GitHub for that).
type: project
originSessionId: cdfd3e9b-4731-4ad7-8679-11c1de9c3545
---
## In-Flight Tasks (2026-05-19)

**Hardening II CLOSED 2026-05-17.** 38/38 issues merged to main.

**#1319 MERGED 2026-05-19 (hotfix).** Correction pipeline migrated from "emit raw JSON" prompting to Anthropic tool calling (pass1: submit_correction_tags, filter: submit_filter_decisions, scopeAffirmer: submit_scope_spans). AssistantPrefill workaround from #1316 removed. ScopeAffirmer MaxTokens raised to 4096.

No tasks currently in flight. Next sprint: Groups (epic #1238), Isaac pedagogy review required before tasks broken out.

Deferred to Groups milestone (carried from Hardening II sprint close):
- #1283 (P3:nice) -- pre-commit + CI high-entropy secret scanner
- #1284 (P2:should) -- automated audit: appsettings.json keys must reach Key Vault + env + ALL docker-compose files
- #1294 (P2:should) -- daily KQL job for correction max_tokens / latency breach detection (closes #1293 monitoring loop)
- #1297 (P2:should) -- correction execution to survivable job pipeline (Sophy-approved spec)
- #1302 (P2:should) -- ScopeAffirmer pedagogical refinements + prompt-health cleanup bundle
- #1304 (P2:should) -- PM discussion: should we feature-flag off lesson AI generation in production?

Bicep cleanup deferred (no issue opened per Robert): computer-vision.bicep was written assuming a separate prod environment that doesn't exist. Today harmless because nobody runs ./infra/deploy.sh. Revisit only if a real prod environment is later added.

Procedure updates landed mid-sprint (now in main):
- .claude/procedures/issue-management.md: External Infrastructure gate (qa:ready specialist gates)
- .claude/skills/smoke-test/SKILL.md: UNVERIFIED result state replaces PASS(partial)
- feedback_push_after_commit.md memory: push immediately for .claude/* and plan/* commits
- project_teacher_qa_stack.md memory: teacher-qa runs on its own langteachsaas-qa stack
- project_azure_environments.md memory: single Azure environment rg-langteach-dev IS production (no rg-langteach-prod)


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

**Active sprint branch:** none (Hardening II merged to main 2026-05-17; next sprint = Groups, branch not yet created)

## Milestone Sequence (newest first)

| Milestone | Status | Notes |
|-----------|--------|-------|
| Hardening II | CLOSED 2026-05-17 | sprint/hardening-ii, milestone #22, merged to main. 38 issues total (scope grew from initial 12 as quality gates surfaced late-session bugs). Correction prompt robustness, security rate limit, arch cleanup, DB hardening, prompt externalization, generation grammar scope, pedagogy C-category, UI polish, Atelier hardening, test infra, prompt-health sweep, Vision OCR infra (#1279-#1281), ScopeAffirmer (#1286), max_tokens + timeout raises (#1293/#1296), Corrigiendo render fix (#1299), BuildGrammarScopeBlock injection (#1301). Sprint story: plan/sprints/hardening-ii.md |
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
