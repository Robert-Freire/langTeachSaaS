# Pedagogical Configuration Architecture: Implementation Issues

**Source documents:**
- Isaac's pedagogy spec: `plan/pedagogy-specification/pedagogy-model-spec.md`
- Sophy's architecture design: `plan/pedagogy-specification/pedagogy-config-architecture.md`
- Isaac's review corrections (2026-03-28)
- Arch's review corrections (2026-03-28)

**Milestone:** Pedagogical Quality (next sprint)

**Sprint branch:** TBD (new sprint branch from main after Student-Aware Curriculum closes)

---

## Issue 1: Create exercise type catalog JSON (data entry)

**Type:** area:backend, area:ai
**Priority:** P1:must
**Depends on:** nothing

Transcribe all 72 exercise types from Isaac's spec (Section 1.1) into `data/pedagogy/exercise-types.json`.

**Acceptance criteria:**
- [ ] File exists at `data/pedagogy/exercise-types.json`
- [ ] Contains exactly 72 entries (CE:9, CO:8, EE:11, EO:10, GR:10, VOC:11, PRAG:5, LUD:8)
- [ ] Each entry has: id, name, nameEs, category, secondaryCompetencies, description, cefrRange, specialResources, uiRenderer
- [ ] `uiRenderer` correctly maps to existing ContentBlockType values where possible, `null` for unsupported types (CO-*, LUD-*, most PRAG-*)
- [ ] File is valid JSON, parseable without errors
- [ ] Count verified: run a script or manual count confirming 72

**Estimated effort:** 2-3 hours (mechanical transcription)

---

## Issue 2: Create CEFR level rules JSON files (data entry)

**Type:** area:backend, area:ai
**Priority:** P1:must
**Depends on:** Issue 1 (exercise type IDs must exist to reference)

Create 6 files under `data/pedagogy/cefr-levels/` from Isaac's spec Section 3.

**Acceptance criteria:**
- [ ] Files: a1.json, a2.json, b1.json, b2.json, c1.json, c2.json
- [ ] Each file has: level, grammarInScope, grammarOutOfScope, appropriateExerciseTypes, inappropriateExerciseTypes (with reasons), vocabularyPerLesson (or vocabularyApproach for C1/C2), instructionLanguage, metalanguageLevel, errorCorrection, scaffoldingDefault
- [ ] A1 grammarInScope includes all 15 items (including gustar, demonstratives, tambien/tampoco, reflexives, ir a + inf, tener que + inf)
- [ ] C1/C2 use `vocabularyApproach` string instead of numeric `vocabularyPerLesson`
- [ ] All exercise type IDs reference valid entries from exercise-types.json
- [ ] C1 inappropriateExerciseTypes includes: GR-01/GR-02 mechanical, GR-05, VOC-01 (lists without context), LUD-01, LUD-02, LUD-06

**Estimated effort:** 3-4 hours

---

## Issue 3: Enhance section profiles with exercise type references (data entry)

**Type:** area:backend, area:ai
**Priority:** P1:must
**Depends on:** Issue 1

Add `validExerciseTypes`, `forbiddenExerciseTypes`, `levelSpecificNotes`, and `minExerciseVariety` to each level entry in the 5 existing section profile files.

**Acceptance criteria:**
- [ ] All 5 section profiles updated: warmup, presentation, practice, production, wrapup
- [ ] Each level entry has the 4 new fields
- [ ] Existing fields (contentTypes, guidance, duration, etc.) unchanged
- [ ] `forbiddenExerciseTypes` uses uniform schema: `{id, pattern, reason}` with one of id/pattern null
- [ ] WarmUp: GR-*, EE-*, CO-* patterns forbidden at all levels
- [ ] Presentation: GR-01/02/03, EO-02/05/06, EE-04 through EE-10, LUD-* forbidden at all levels
- [ ] Production: GR-01 through GR-07, VOC-01 through VOC-03, CE-*, LUD-* forbidden at all levels
- [ ] Practice A1: minExerciseVariety = 1; B1+: minExerciseVariety = 2
- [ ] levelSpecificNotes populated (e.g., GR-01 needs word bank at A1, GR-02 max 3 options at A1)
- [ ] WrapUp valid/forbidden types derived from Isaac's spec Section 2.6 (no new content, no formal exercises, no long writing, no tests)
- [ ] File remains backward compatible (existing fields intact, no breaking schema changes)
- [ ] Validation script or test that checks: every exercise type ID in valid/forbidden lists exists in the catalog, no ID appears in both valid and forbidden for the same section/level

**Estimated effort:** 4-5 hours (cross-referencing Isaac's spec Section 2 with exercise catalog)

---

## Issue 4: Create template overrides JSON (data entry)

**Type:** area:backend, area:ai
**Priority:** P1:must
**Depends on:** Issue 1

Create `data/pedagogy/template-overrides.json` with all 7 templates (5 existing + 2 proposed by Isaac).

**Acceptance criteria:**
- [ ] File exists at `data/pedagogy/template-overrides.json`
- [ ] Contains 7 templates: conversation, grammar-focus, reading-comprehension, writing-skills, exam-prep, thematic-vocabulary, culture-society
- [ ] Each template has: sections (warmUp, presentation, practice, production, wrapUp) with required, overrideGuidance, priorityExerciseTypes, minExerciseVarietyOverride, notes
- [ ] Each template has: levelVariations, restrictions
- [ ] Grammar Focus Practice has minExerciseVarietyOverride: 3
- [ ] Exam Prep Practice notes mention timer is mandatory
- [ ] Exam Prep restrictions state LUD-* inappropriate
- [ ] Reading & Comprehension Presentation notes state text MUST be in Presentation
- [ ] Conversation Presentation is required: false
- [ ] All exercise type IDs reference valid entries from exercise-types.json

**Estimated effort:** 2-3 hours

---

## Issue 5: Create L1 influence, course rules, and style substitution JSON files (data entry)

**Type:** area:backend, area:ai
**Priority:** P2:should
**Depends on:** Issue 1

Create three files from Isaac's spec Sections 5, 6, and 5.4.

**Acceptance criteria:**
- [ ] `data/pedagogy/l1-influence.json`: 5 language families (romance, germanic, sinitic-japonic, slavic, arabic) + 4 specific languages (italian, french, persian, mandarin)
- [ ] Persian is NOT in the Arabic family (has `family: null` with its own notes about 6-vowel system)
- [ ] `data/pedagogy/course-rules.json`: variety rules, skill distribution (general + conversational), grammar progression (spiral model), recycling rules with valid/lazy examples
- [ ] `data/pedagogy/style-substitutions.json`: 4 substitution entries (role-play, long writing, mechanical grammar, listening) with rejects, substituteWith, neverSubstituteWith, and rule
- [ ] Each substitution entry preserves competency (never replaces oral with written)

**Estimated effort:** 2-3 hours

---

## Issue 6: Build PedagogyConfigService (code)

**Type:** area:backend, area:ai
**Priority:** P1:must
**Depends on:** Issues 1-5 (JSON files must exist)

Create `IPedagogyConfigService`/`PedagogyConfigService` that loads all pedagogy JSON files at startup, validates referential integrity, and exposes composition methods.

**Acceptance criteria:**
- [ ] Interface `IPedagogyConfigService` defined with methods:
  - `GetValidExerciseTypes(section, level, templateId?, nativeLang?)`
  - `GetForbiddenExerciseTypes(section, level)`
  - `GetGrammarScope(level)` returning in-scope and out-of-scope lists
  - `GetVocabularyGuidance(level)` returning numeric load or approach string
  - `GetL1Adjustments(nativeLang)` returning notes and additional types
  - `GetTemplateOverride(templateId)` returning section modifications
  - `GetCourseRules()` returning variety and distribution rules
  - `GetStyleSubstitutions(rejectedTypes)` returning valid substitutes and rules from style-substitutions.json
- [ ] Registered as singleton in `Program.cs`
- [ ] All JSON files loaded as embedded resources (same pattern as SectionProfileService), including style-substitutions.json
- [ ] csproj updated with `EmbeddedResource` entries for `data/pedagogy/*.json` and `data/pedagogy/cefr-levels/*.json` with correct Link paths
- [ ] Embedded resources configured in csproj with correct Link paths
- [ ] Startup validation: all cross-layer exercise type ID references verified; fail fast on dangling references
- [ ] Pattern expansion: `GR-*` in forbiddenExerciseTypes expands to all matching IDs from catalog
- [ ] Composition logic: intersect CEFR + section valid types, subtract forbidden, merge template priorities, add L1 types, re-filter forbidden
- [ ] Diagnostic logging at Debug level showing composition chain
- [ ] Unit tests: at least 10 tests covering composition edge cases (L1 additions don't bypass forbidden, template variety override, C1/C2 vocabulary approach, pattern expansion)

**Estimated effort:** 1-1.5 days

---

## Issue 7: Integrate PedagogyConfigService into PromptService (code)

**Type:** area:backend, area:ai
**Priority:** P1:must
**Depends on:** Issue 6

Replace hardcoded template strings in `PromptService.cs` with calls to `PedagogyConfigService`. Inject section coherence rules as fixed prompt block.

**Acceptance criteria:**
- [ ] `PromptService` receives `IPedagogyConfigService` via constructor injection
- [ ] `LessonPlanUserPrompt`: template-specific blocks (Reading & Comprehension, Exam Prep, etc.) replaced with `GetTemplateOverride()` data
- [ ] Exercise guidance block injected into prompts: valid types with names, forbidden with reasons, level-specific notes, min variety
- [ ] Grammar scope block injected: in-scope and out-of-scope lists from CEFR level files
- [ ] Vocabulary constraints injected: numeric load or approach string depending on level
- [ ] L1 adjustments injected when student native language is known
- [ ] Section coherence rules (5 rules from Isaac's spec 2.7) injected as a STATIC STRING (not composed from JSON) on every lesson generation
- [ ] Declared difficulty integration: if student has weaknesses, targeted guidance appended to Practice/Production/WrapUp
- [ ] Existing `SectionProfileService` relationship clarified: either delegates to PedagogyConfigService or interface preserved with adapter
- [ ] All `*UserPrompt` methods updated (LessonPlan, Exercises, Conversation, Vocabulary, Grammar, Reading, Homework, FreeText)
- [ ] Existing unit tests in PromptServiceTests.cs continue to pass
- [ ] New unit tests for: template override injection, grammar scope injection, L1 adjustment injection, section coherence rules present in output, difficulty integration

**Estimated effort:** 1.5-2 days

---

## Issue 8: Update frontend section content type rules (code)

**Type:** area:frontend
**Priority:** P2:should
**Depends on:** Issue 6

Replace hardcoded `sectionContentTypes.ts` with data-driven rules from the backend.

**Acceptance criteria:**
- [ ] `sectionContentTypes.ts` no longer hardcodes section-to-content-type mappings
- [ ] Content type allowlists driven by section profile data (either via API endpoint or build-time generation)
- [ ] Decision documented: API endpoint vs build-time TypeScript generation (recommendation: API endpoint for consistency with how other data flows work)
- [ ] If API endpoint: new controller or endpoint (e.g. `GET /api/pedagogy/section-rules`) returning valid ContentBlockTypes per section per level
- [ ] Existing dropdown filtering behavior preserved (same UX, different data source)
- [ ] Unit tests updated

**Estimated effort:** 0.5-1 day

---

## Issue 9: Wire course distribution rules into curriculum generation (code)

**Type:** area:backend, area:ai
**Priority:** P2:should
**Depends on:** Issue 6

Modify `BuildCurriculumPrompt` to inject variety rules and skill distribution targets from course-rules.json.

**Acceptance criteria:**
- [ ] Variety rules (no repeat practice combos in 3 sessions, alternate written/oral production, competency coverage in every 5 sessions) injected into curriculum prompt
- [ ] Skill distribution targets (general vs conversational proportions) injected based on course type
- [ ] Spiral grammar recycling guidance injected with valid/lazy examples
- [ ] Learning style substitution rules: note that `CurriculumContext.TeacherNotes` is free text today, not structured. For now, inject style substitution guidance as a prompt block when teacher notes contain relevant keywords. Structured style preference field deferred to a future issue.
- [ ] Unit tests for curriculum prompt composition

**Estimated effort:** 0.5-1 day

---

## Summary

| Issue | Type | Priority | Effort | Depends on |
|-------|------|----------|--------|------------|
| 1. Exercise type catalog JSON | data entry | P1 | 2-3h | none |
| 2. CEFR level rules JSON | data entry | P1 | 3-4h | #1 |
| 3. Enhanced section profiles | data entry | P1 | 4-5h | #1 |
| 4. Template overrides JSON | data entry | P1 | 2-3h | #1 |
| 5. L1 + course rules + style subs JSON | data entry | P2 | 2-3h | #1 |
| 6. PedagogyConfigService | code | P1 | 1-1.5d | #1-5 |
| 7. PromptService integration | code | P1 | 1.5-2d | #6 |
| 8. Frontend section rules | code | P2 | 0.5-1d | #6 |
| 9. Curriculum rules integration | code | P2 | 0.5-1d | #6 |

**Total: ~5-6 working days**

Issues 1-5 are pure data entry and can be done in a single session. Issues 6-9 are code changes, each a separate PR. Issues 1-5 could potentially be a single large data-entry PR.

**Parallelization:** Issues 2, 3, 4, 5 all depend on Issue 1 but are independent of each other. Issues 8 and 9 are independent of each other but both depend on Issue 6. Issue 7 depends on Issue 6 but is independent of Issues 8 and 9.

---

## Open questions for discussion

1. **Should Issues 1-5 be a single "data entry" PR or separate PRs?** Single PR is simpler but the diff is large. Separate PRs are easier to review but more overhead.

2. **Should the 2 new templates (Thematic Vocabulary, Culture & Society) be added to the DB `LessonTemplate` table in this batch, or deferred?** The JSON templates exist but the UI dropdown needs entries.

3. **Where does this land relative to the existing Pedagogical Quality milestone?** The 8 exercise format issues (#269-#276) were already scoped. This architecture work provides the foundation they build on. Should this come first, replacing the ad-hoc approach those issues would take?
