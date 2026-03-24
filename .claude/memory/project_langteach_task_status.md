---
name: LangTeach SaaS — Task Status and Next Steps
description: Where to find current task state, historical task reference
type: project
---

## Live Tracker: GitHub Issues

GitHub Issues is the single source of truth for task tracking (as of 2026-03-19).
Use `gh issue list` to see current state. Key queries:

- Current sprint: `gh issue list --milestone "Student-Aware Curriculum"`
- Must-haves: `gh issue list --label "P1:must"`
- Ready to pick up: `gh issue list --label "qa:ready"`

**Active sprint branch:** `sprint/student-aware-curriculum`
Agents must PR against this branch, not `main`. See CLAUDE.md "Sprint Branch Workflow" section.

**Milestones:**
- Demo 1 (internal): CLOSED
- Phase 2A: Teacher Workflow: CLOSED (reorganized 2026-03-21)
- Curriculum & Personalization: CLOSED (2026-03-24, 35/35 done, merged to main)
- Pedagogical Credibility: CLOSED (merged into Student-Aware Curriculum)
- Student-Aware Curriculum: ACTIVE (#206, #256, #257, #258, #259, #260, #261, #262, #253, #254, #152, #151, #167, #166, #267, #268)
  - #255 DONE — PR #265 merged (template-seeded curriculum backbone: TemplateUnitRef, CompetencyFocus fields; AI personalization for student-linked courses; CefrSkillCodes shared utility; 3 code paths in CurriculumGenerationService)
  - #256 DONE — PR #266 merged (StudentProfileSummary card in CourseNew with 6-field completeness score; CurriculumContext fixed to include weaknesses+difficulties; student select UUID display bug fixed; studentProfileUtils.ts extracted)
  - #267 DONE — PR #277 merged (CefrExerciseGuidance + CefrPracticeGuidance helpers; A1/A2 word bank, B1/B2 variety, C1/C2 minimize drills; 7 unit tests; Teacher QA run pending)
  - #268 READY — Mandatory Production + Practice ordering (prompt fix + backend validation)
- Pedagogical Quality: AFTER STUDENT-AWARE (#269, #270, #271, #272, #273, #274, #275, #276)
  - New exercise formats: sentence ordering (#269), error correction (#270), true/false (#271), transformation (#272)
  - New content types: guided writing (#273), noticing task (#274)
  - Practice scaffolding with stage field (#275)
  - L1 contrastive notes in grammar blocks (#276)
- Solo Whiteboard: AFTER PEDAGOGICAL QUALITY (5 sub-issues from #174)
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

**Previous sprint: Curriculum & Personalization** (CLOSED 2026-03-24, 35/35 done)
- #184 Fix phantom materials in AI generation (P1, done, PR #193 merged)
- #157 AI-Powered Difficulty Targeting (P1, Ready to Test)
- #163 Extract curricula JSON (P1, Ready to Test)
- #164 Integrate curriculum data as templates (P2, done, PR #173 merged, Ready to Test)
- #150 Filter difficulties by target language (P1, ready)
- #161 Custom free-text entries for learning goals (P1, done, PR #172 merged)
- #154 Auto-fill lesson language/level from student (P2, done, PR #205 merged, Ready to Test)
- #213 Skippable onboarding steps 2-3 (P2, done, PR #236 merged, Ready to Test)
  - completeOnboarding moved to after step 1; steps 2/3 have skip buttons; dashboard empty state added
- #151 CEFR level mismatch warning (P2, ready)
- #192 Fix raw JSON visible in editor (P1, done, PR #204 merged, Ready to Test)
- #195 Sprint branch workflow (P1, done)
- #200 Teacher QA agent core — 2 personas + rubric + QA stack (P1, Ready to Test, PR #203 merged)
  - Auth0 QA user still needs manual creation (one-time setup, see SKILL.md)
- #201 Teacher QA remaining personas + Sprint Reviewer (P1, done, PR #211 merged, Ready to Test)
  - Fixes: paginated student list parsing, onboarding guard in auth helper
  - Adds: Carmen B2.1, Ana Exam Prep B2.1, Sprint Reviewer personas
  - Auth0 QA user: CREATED (done for #200/#201)
  - Onboarding wizard: still needs one-time manual completion (start QA stack, log in, complete 3-step wizard)
- #199 Fix flaky StudentForm test (P1, done, PR #209 merged, Ready to Test)
- #202 Teacher QA first run + triage (P1, DONE — PR #218 merged, Ready to Test)
  - All 5 personas ran successfully against sprint/curriculum-personalization
  - Key finding: WarmUp always generates vocabulary drill (should be icebreaker) — system-wide, 5/5 personas
  - Key finding: Carmen Reading & Comprehension has no reading passage — structural template gap
  - Confirmed working: #184 phantom media fix, #192 raw JSON fix
  - Triage report: .claude/skills/teacher-qa/output/triage-2026-03-22.md
  - Proposed follow-up: 2 P1 issues + 2 P2 issues (see triage report)
- #220 Add startup config validation (P1, DONE — PR #230 merged, Ready to Test)
  - StartupConfigValidator checks all 5 required keys after Key Vault loads, before service registration
  - BlobServiceClient gets explicit null guard with descriptive error
  - 5 unit tests in LangTeach.Api.Tests/Infrastructure/StartupConfigValidatorTests.cs
- #226 Fix WarmUp generation: icebreaker, not vocabulary drill (P1, DONE — PR #231 merged, Ready to Test)
  - Updated LessonPlanUserPrompt with per-section guidance; warmUp explicitly requires conversational icebreaker
  - Vocabulary lists, grammar drills, fill-in-blank explicitly prohibited for warmUp
  - 3 new unit tests in PromptServiceTests.cs verify constraints; 166 backend tests pass
  - Note: Teacher QA re-run needed to confirm fix (acceptance criterion #3)
- #228 Fix Exam Prep template: written production + timed practice (P2, DONE — PR #239 merged, Ready to Test)
  - Injected Exam Prep-specific requirements into LessonPlanUserPrompt (else-if pattern, same as #227)
  - Prohibits oral role-play in practice/production; requires written tasks (essay, formal letter, short report)
  - Mandates explicit time limits and word count targets in practice/production sections
  - 3 new unit tests in PromptServiceTests.cs; 176 backend tests pass
  - Note: Teacher QA re-run with Ana Exam needed to confirm fix (AC3)
- #227 Fix Reading & Comprehension template (P1, DONE — PR #235 merged, Ready to Test)
  - Added TemplateName to GenerationContext; LessonPlanUserPrompt now appends R&C-specific requirements when template matches
  - Requirements: 300-500 word reading passage, comprehension questions (factual/inferential/vocab-in-context), all 5 sections mandatory
  - Controller loads template name from DB on LessonPlan requests only (gated on ContentBlockType.LessonPlan)
  - Note: Teacher QA re-run with Carmen needed to confirm fix (AC4)
- #219 Review process gap (P1, DONE — PR #237 merged, Ready to Test)
  - Findings doc at plan/langteach-beta/219-findings.md covers all 4 postmortem angles
  - Implemented: #220 (startup validation), #221 (PR template), #223 (CI secret validation); Deferred: #224 (auto-rollback + alerting) to Phase 2B
- #223 CI step to validate required Key Vault secrets before deploy (P2, DONE — PR #240 merged, Ready to Test)
  - infra/required-secrets.json manifest lists all 5 required KV secret names
  - validate-secrets job checks each via ARM management-plane API (no new RBAC grants needed)
  - deploy job now depends on [ci, validate-secrets]; fails with actionable error if any secret missing
  - Error handling distinguishes ResourceNotFound from permission/transient errors
- #221 Add PR template checklist (P1, DONE — PR #232 merged, Ready to Test)
  - Created .github/PULL_REQUEST_TEMPLATE.md with Config & Infrastructure checklist section
  - Checklist prompts authors to confirm secrets in Key Vault, env vars in Bicep, new infra templated
  - Preserves Summary and Test Plan sections; pre-populates on all new PRs
- #208 Analyze Jordi's example PDF (P2, DONE — PR #225 merged, Ready to Test)
  - Visual reference card format: timeline infographic + clock row + formula callout + contrasting examples
  - No existing content type can produce this; recommends new `visualExplainer` type
  - Start with freeText prototype to validate demand before building full renderer
  - Analysis at plan/langteach-beta/jordi-pdf-analysis.md
- #242 Fix duplicate Regenerate labels and add auto-fill hint (P2, DONE — PR #247 merged, Ready to Test)
  - ContentBlock: block-level Regenerate hidden when parsedContent is null (error box already has one)
  - LessonNew: hint text "Selecting a student auto-fills language and level." added below student selector
  - 2 new unit tests; 385 frontend + 180 backend tests pass
- #229 Fix vocabulary generation: enforce L1 translations and CEFR-appropriate level (P2, DONE — PR #238 merged, Ready to Test)
  - VocabularyUserPrompt now requires CEFR-level items and L1 translations when native language known
  - 3 unit tests; fixes Teacher QA findings CQ-2 and CQ-3

## Production Incidents

### 2026-03-22: API ActivationFailed (issue #217, resolved)
- **Root cause:** `AzureBlobStorage--ConnectionString` secret missing from Key Vault. Added in Bicep but never provisioned after PR #148 (BlobStorageService) added the dependency.
- **Symptom:** Every new revision crashed on startup with `ArgumentNullException: connectionString`. Old revision 0000031 (built pre-PR-#148) kept running because it didn't use BlobStorageService.
- **Fix:** Added the secret to Key Vault manually (`az keyvault secret set`). New revision 0000040 is now healthy.
- **Follow-up:** Issue #219 — startup hardening (null guard) + review process gap (missing secret not caught in CI/review).
- **Lesson:** When adding a new service that reads from Key Vault, ensure the secret is provisioned (Bicep update + manual apply if infra wasn't redeployed).

## Key Architectural Notes
- Azure Container Apps (not App Service), North Europe region, SWA in West Europe
- ACR: `crlangteachdev.azurecr.io`, OIDC auth (not SP secret)
- Content blocks are typed (vocabulary, exercises, conversation, reading, grammar, homework, freeText) with per-type renderers
- Mock-auth e2e: ASPNETCORE_ENVIRONMENT=E2ETesting, VITE_E2E_TEST_MODE=true
- Student->Lesson FK is NoAction (SQL Server cascade constraint)
- Deploy freeze: primary mechanism is sprint branch workflow (don't trigger merge action); secondary is DEPLOY_FROZEN repo variable
