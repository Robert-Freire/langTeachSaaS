---
name: LangTeach SaaS — Task Status and Next Steps
description: Where to find current task state, historical task reference
type: project
---

## Live Tracker: GitHub Issues

GitHub Issues is the single source of truth for task tracking (as of 2026-03-19).
Use `gh issue list` to see current state. Key queries:

- Current sprint: `gh issue list --milestone "Pedagogical Quality"`
- Must-haves: `gh issue list --label "P1:must"`
- Ready to pick up: `gh issue list --label "qa:ready"`

**Active sprint branch:** `sprint/pedagogical-quality`
Agents must PR against this branch, not `main`. See CLAUDE.md "Sprint Branch Workflow" section.

**Milestones:**
- Demo 1 (internal): CLOSED
- Phase 2A: Teacher Workflow: CLOSED (reorganized 2026-03-21)
- Curriculum & Personalization: CLOSED (2026-03-24, 35/35 done, merged to main)
- Pedagogical Credibility: CLOSED (merged into Student-Aware Curriculum)
- Student-Aware Curriculum: CLOSED (2026-03-29, merged to main)
  - All 21 original issues closed (including #261 which was done but not tracked)
  - #305 DONE — PR #308 merged (WarmUp content type allowlist, dropdown filtering)
  - #309 DONE — PR #310 merged (extract section guidance to JSON profiles)
  - #306 PARTIAL — PR #311 merged (Part A); Part B still open (pedagogy review on cleaned profiles + Teacher QA re-run)
  - #312 DONE — PR #313 merged (prompt health fixes: level-aware IsAllowed, removed hardConstraints, cleaned stale negatives in PromptService.cs + JSON profiles)
  - Board fixed 2026-03-27: 16 missing issues added to board, 9 done issues closed manually
  - #351 DONE — PR #356 merged (additive section guidance model: inline template overrides per section, GetDuration, 7 template-overrides.json fixes, presentation B1/B2 conditional grammar framing, restrictions enforcement)
  - Sprint close progress (2026-03-28):
    - Stage 1 DONE: backlogs triaged, 44 deleted, 29 batched into #298-#304 (backlog issues for next sprint)
    - Stage 2 COMPLETE: #312 done, #351 done (additive prompt model)
    - Stage 3 READY: user can trigger merge-sprint-to-main; post-merge: run Teacher QA full 5-persona, add prior-findings.md traceability rows for #351
    - Pedagogy findings: WarmUp vocabulary drill recurring (P0, fixed in #305), Practice variety limited (P1, covered by Pedagogical Quality sprint)
  - #321 DONE — PR #330 merged (section profiles extended: validExerciseTypes, forbiddenExerciseTypes, levelSpecificNotes, minExerciseVariety per level in all 5 profiles; 4 validation tests; ForbiddenExerciseType/LevelSpecificNote C# records)
  - #320 DONE — PR #329 merged (CEFR level rules JSON: a1-c2.json, grammar scope, exercise type appropriate/inappropriate lists, vocabulary targets, instruction language, error correction strategy per level)
  - #338 DONE — PR #345 merged (exercise type allowlist: available field on all 71 catalog entries, PRAG-02 deleted/merged into EE-09, _availableIds filter as step 9 in GetValidExerciseTypes, 3 new backend tests)
  - #326 DONE — PR #339 merged (frontend section content types: GET /api/pedagogy/section-rules, useSectionRules hook, removed hardcoded switch from sectionContentTypes.ts)
  - #327 DONE — PR #341 merged (wire course distribution rules into curriculum prompts: variety rules, skill distribution by course type, spiral grammar recycling, style substitution guidance from teacher notes keywords; CourseType field on CurriculumContext; GetAllStyleSubstitutions on IPedagogyConfigService; 7 new tests)
  - #325 DONE — PR #340 merged (integrate PedagogyConfigService into PromptService: data-driven grammar scope, vocabulary targets, L1 adjustments, exercise guidance, template overrides, section coherence rules; removed hardcoded R&C and Exam Prep blocks; 22 new tests)
  - #324 DONE — PR #333 merged (PedagogyConfigService: loads all 6 pedagogy JSON layers, 8-step composition algorithm, GR-*/EE-*/CO-* pattern expansion, L1 re-filter, startup cross-layer validation, CefrLevelNormalizer shared helper, 21 unit tests)
  - #323 DONE — PR #332 merged (l1-influence.json: 5 language families + 4 specific languages; course-rules.json: variety rules, skill distribution, spiral grammar model; style-substitutions.json: 4 competency-preserving substitution entries)
  - #322 DONE — PR #331 merged (template-overrides.json: 7 lesson templates with section overrides, priority exercise types, level variations, restrictions)
  - #319 DONE — PR #328 merged (exercise type catalog JSON: 72 types, data/pedagogy/exercise-types.json, foundation for pedagogical config architecture)
  - #292 DONE — PR #296 merged (exam prep mode: learning goal toggle, exam selector, deadline picker, session type badges)
  - #291 DONE — PR #297 merged (session-to-lesson navigation: status badges, Generate lesson nav, Edit/View links)
  - #290 DONE — PR #295 merged (course creation e2e flow: StudentCoursesCard, error state, 2 e2e + 5 unit tests)
  - #289 DONE — PR #293 merged (Create Course entry point on student detail page)
  - #167 DONE — PR #286 merged (AI quality guardrails: CEFR validation, warnings panel)
  - #166 DONE — PR #294 merged (learning target labels on generated content blocks)
  - #152 DONE — PR #288 merged (grammar-constrained content generation)
  - #151 DONE — PR #285 merged (CEFR mismatch warning)
  - #259 DONE — PR #284 merged (add/remove/reorder curriculum sessions)
  - #258 DONE — PR #281 merged (enhanced curriculum walkthrough UI)
  - #262 DONE — PR #282 merged (session-count-to-curriculum mapping)
  - #260 DONE — PR #280 merged (objective flow: curriculum to lesson generation)
  - #255 DONE — PR #265 merged (template-seeded curriculum backbone)
  - #256 DONE — PR #266 merged (student profile integration in course creation)
  - #267 DONE — PR #277 merged (CEFR exercise selection per level)
  - #268 DONE — PR #279 merged (mandatory Production section, practice ordering)
  - #253 DONE — PR #263 merged (fix empty template dropdown for A1)
  - #254 DONE — PR #264 merged (fix curriculum template attribution)
  - #257 DONE — closed (personalized context generation, completed as part of other work)
  - #206 DONE — epic closed (parent issue for the sprint)
- Pedagogical Quality: ACTIVE — sprint/pedagogical-quality (#269, #270, #271, #272, #273, #274, #275, #276, #378, #379, #317)
  - New exercise formats: sentence ordering (#269 PR #401 open), error correction (#270), true/false (#271 DONE), transformation (#272 DONE)
  - #272 DONE — PR #403 merged (sentenceTransformation exercise sub-format: 6th sub-format in Exercises, prompt/original/expected/alternatives fields, multi-answer validation, B1+ DELE targeting, Editor/Preview/Student views, 3 backend + 12 frontend unit tests, 4 e2e tests)
  - #270 DONE — PR #399 merged (error-correction content type: GR-04 uiRenderer updated, cefrRange A2-C2, new ErrorCorrectionRenderer with Editor/Preview/Student + identify-only and identify-and-correct modes, JSON schema, PromptService builder with level notes + L1 pipeline, 53 new tests)
  - #271 DONE — PR #400 merged (trueFalse exercise sub-format: CE-10 in exercise-types catalog, practice-stages meaningful, section profiles A2-C2, reading-comprehension template priorities; ExercisesRenderer Editor/Preview/Student; streaming support; backward-compat optional field; 15 new frontend + 3 backend tests)
  - #274 DONE — PR #404 merged (noticing-task content type: JSON schema, CEFR-level discovery parameters in cefr-levels/*.json, NoticingTaskRenderer with interactive word highlighting Editor/Preview/Student views, PromptService generic schema injection, section profiles updated)
  - New content types: guided writing (#273 DONE), noticing task (#274 DONE)
  - #275 DONE — PR #397 merged (practice-stages.json: 3 stage definitions + CEFR requirements; stage field on exercises schema; BuildPracticeStageBlock in PromptService; ExercisesRenderer stage headers/badges; 8 backend + 3 frontend tests; Teacher QA re-run needed)
  - #276 DONE — PR #405 merged (L1 contrastive notes in grammar blocks: contrastivePatterns in l1-influence.json for 5 families + Italian/Portuguese specific entries; GetContrastivePattern on PedagogyConfigService; BuildL1ContrastiveBlock in PromptService; L1ContrastiveNote on GrammarContent; collapsible editor section + blue callout in Preview/Student; 11 backend + 8 frontend tests)
  - #378 DONE — PR #384 merged (data-driven grammar constraints: TargetLanguageGrammarConstraint in l1-influence.json, GetGrammarConstraints on PedagogyConfigService, ExercisesUserPrompt injects mandatory constraints; 4 new tests; Teacher QA re-run needed to confirm)
  - #358 DONE — PR #385 merged (content type constraints: preferredContentType field on SectionOverride, GetPreferredContentType on PedagogyConfigService + startup validation, PromptService emits validContentTypes + preferredContentType in LessonPlan section guidelines and block prompts; R&C presentation gets reading, Exam Prep practice/production get exercises; production B1-C2 gains exercises contentType; 14 new tests; Teacher QA re-run needed)
  - #348 DONE — PR #387 merged (prompt injection: sanitize targetLevel + GrammarFocus via shared InputSanitizer; array bound: MaxCollectionCount(50) on LearningTargets; 5 new tests)
  - #343 DONE — PR #388 merged (JSON schema definitions: 7 draft-07 schema files in data/content-schemas/, ContentSchemaService loads generically from embedded resources, PromptService.BuildRequest injects schema into all generation prompts; no hardcoded type names in C#; 536 backend tests pass)
  - #317 DONE — PR #389 merged (4 new Teacher QA personas: Sophie A2 FR, Ricardo C1 PT, Nadia B2 AR, Hans A1 DE; full run now covers 9 personas; SKILL.md updated with persona descriptions, run commands, curriculum JSON pointers)
  - #273 DONE — PR #396 merged (guided-writing content type: JSON schema, guidedWriting block in all 6 CEFR level files, GuidedWriting enum + kebab-case, GetGuidedWritingGuidance on PedagogyConfigService, BuildGuidedWritingPrompt with no hardcoded level conditions, section profiles updated, GuidedWritingRenderer with live word count + hidden model answer, streaming parser, 18 backend + 15 frontend tests)
  - #379 B2 error correction explanations truncated (P2, from 2026-03-29 QA run)
- Solo Whiteboard: AFTER LISTENING COMPREHENSION (5 sub-issues from #174, milestone #7)
- Post-Class Tracking: AFTER WHITEBOARD — milestone #12, epic #391. Text-only session log (planned/done/homework/observations), student history view, profile update from notes, Excel import. Audio deferred to next sprint. Informed by Jordi's actual Excel (35 students, `feedback/raw/2026-03-29-jordi-excel-alumnos-actuales.xlsx`).
- Adaptive Replanning: AFTER POST-CLASS TRACKING (audio input, post-class reflections, auto-difficulty updates, course replanning, progress dashboard)
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
  - #152 DONE — PR #288 merged (grammar constraints field in generation panel; GrammarConstraints in GenerateRequest + PromptService + GenerateController; textarea in GeneratePanel; 3 backend + 3 frontend unit tests; issue closed manually — auto-close doesn't work for sprint-branch PRs)
  - #151 DONE — PR #285 merged (CompetencyGapWarning component: keyword detection for skill-removing teacher notes, amber dismissible banner in CourseNew, 20 unit tests, e2e extended; CEFR mismatch warning was already done in prior session)
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
