---
name: LangTeach SaaS — Task Status and Next Steps
description: Sprint branch name, milestone sequence, and pointers to live state. NOT per-issue status (query GitHub for that).
type: project
originSessionId: cdfd3e9b-4731-4ad7-8679-11c1de9c3545
---
## In-Flight: Groups sprint CLOSE (2026-05-26)

**Sprint: Groups (sprint/groups)** -- at sprint close, NOT yet merged to main.

All 8 Groups tasks (#1326-#1333) + 3 mid-sprint corrections items (#1349 Spanish explanations, #1350 paragraph-break under C, #1351 teacher full-error view + dual .docx) merged to sprint/groups.

Backlog triage done at close (2026-05-24): filed #1359-#1363 from the observed-issues/code-review backlogs. #1359 (prompt-health + config externalization), #1360 (arch dedup), #1362 (bug batch), #1363 (DS specs) were pulled into Groups and merged by bots. #1361 (pedagogy generation ceiling + L1) kept as backlog (unmilestoned). The three backlog files (observed-issues, code-review-backlog, ui-review-backlog) were cleared with a dated note.

Sprint-close walkthroughs done (2026-05-25, claude --chrome): functional Groups + corrections PASS; Vera UX; pedagogy. First wave of findings -- #1368 (B1 cohesion filter misclassification), #1369 (UI defects: avatar overflow, dual-download, Overview last-session), #1370 (Vera polish batch) -- bot-fixed, merged (PRs #1372/#1373/#1374), and re-verified live 2026-05-26 (paragraph-break now kept at B1; dual-download distinct). DONE.

Further findings from Robert's MANUAL testing (qa:ready, Groups, awaiting bots): #1375 (polish) group-detail width vs student detail; #1378 (polish) Sessions-tab date tile crams year; #1379 (P2 bug) clicking a group session opens an empty page (missing frontend route `/groups/:id/sessions/:sessionId`).

**RELEASE-SCOPE / MERGE GATE (2026-05-26):** the Edit Group screen is too thin AND inconsistent to ship -- it uses Save/Cancel while Edit Student uses autosave+Done (interaction-model inconsistency, see [[feedback_consistency_over_polish_in_close]]). Groups->main merge is GATED on Edit Group reaching Student parity:
- #1380 (P2) Edit Group form parity (shell + autosave + rail) -- qa:ready, must land FIRST.
- #1381 (P2) group profile fields (ReasonForStudying + Interests + Common focus areas columns + migration; class goals via TeacherFollowup keyed by GroupId; Sophy+Isaac shaped) -- qa:ready, depends on #1380; Sophy confirming pass recommended pre-plan.

Backlog (NOT Groups): #1361 (pedagogy generation), #1371 (Total Hours product Q), #1376 (app-wide max-width refactor). #1382 referenced by Robert but not yet created.

Migration validated in dev (2026-05-26): copy-azure-teacher (Jordi->Robert) + migrate-fake-groups --local. B1.1/A2.1 -> real groups, 13 live sessions reassigned (7+6; 1 soft-deleted B1.1 session excluded by design), fake students soft-deleted, members empty (Jordi populates via UI), 0 XOR violations. NOTE: prod migration can only run AFTER the sprint merges + deploys (prod has no Groups schema yet); run `--dry-run` in Azure mode first.

**Merge GATED on: #1379 + #1380 + #1381 landing + re-verify (Edit Group at Student parity), then merge-sprint-to-main (Robert triggers).** Remaining polish (#1375/#1378) and the open epic #1238 also in the milestone.

Process notes: [[feedback_no_inline_fix_during_close]] (I file, bots fix, I re-verify); [[feedback_consistency_over_polish_in_close]] (operation-level inconsistencies are blocking, not polish; add a "ship to Jordi?" check). Early in the close I fixed #1355/#1356 inline before those rules were set.

---

## Previous Sprint Status (2026-05-19)

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


## Deferred to sprint AFTER Groups

- #1324 (P2:should) — BirthYear field stores age, not year of birth. Data-integrity time bomb. File from 2026-05-23 PM session on Jordi's production data.
- #1325 (P2:should) — research spike: analyse Jordi's 132 voice notes + 583 session logs to redesign student profile fields. UI Redesign sprint (#16) fields have near-zero adoption.

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

**Active sprint branch:** sprint/groups (created 2026-05-23, 8 issues qa:ready, Isaac pedagogy-reviewed READY)

## Milestone Sequence (newest first)

| Milestone | Status | Notes |
|-----------|--------|-------|
| Groups | ACTIVE | sprint/groups, milestone created, 8 issues qa:ready |
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
