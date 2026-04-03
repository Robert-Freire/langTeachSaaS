# Prior Findings Log

This file tracks findings from previous Teacher QA runs and what was done to fix them. The QA agent reads this before evaluating so it can verify whether fixes worked, while still keeping an open mind for new issues.

**Format:** Each entry has the finding ID (from the triage), what was found, the fix (issue number + description), and whether it's been deployed to the branch being tested.

---

## From: triage-2026-03-22.md

### Fixed (verify these)

| ID | Finding | Fix | Issue | Deployed? |
|----|---------|-----|-------|-----------|
| CQ-1 | WarmUp always generates vocabulary drill instead of icebreaker (100% of personas) | Updated WarmUp generation prompt to specify conversational icebreaker format, prohibit vocab/grammar drills | #226 (PR #231) | Yes, merged 2026-03-22 |
| GAP-1 | Carmen Reading & Comprehension has no reading passage (generates grammar drill instead) | Updated Reading template prompt to require 300-500 word passage + comprehension questions | #227 (PR #235) | Yes, merged 2026-03-22 |
| GAP-2 | Carmen missing Production section (4 sections instead of 5) | Included in #227 fix, template now requires all 5 PPP sections | #227 (PR #235) | Yes, merged 2026-03-22 |
| CQ-4 | Ana Exam Production is oral role-play instead of written exam task | Updated Exam Prep template to specify written production matching exam format | #228 (PR #239) | Yes, merged 2026-03-22 |
| GAP-3 | Ana Exam has no timed practice guidance | Included in #228 fix, prompt now includes time limit guidance | #228 (PR #239) | Yes, merged 2026-03-22 |
| CQ-2 | Ana Exam vocabulary includes C1 word ("soslayar") in B2 lesson | Updated generation prompt to enforce CEFR-appropriate vocabulary level | #229 (PR #238) | Yes, merged 2026-03-22 |
| CQ-3 | Ana Exam vocabulary definitions in Spanish for English L1 student | Updated generation prompt to require L1 translations | #229 (PR #238) | Yes, merged 2026-03-22 |

### Not fixed (known limitations, don't re-flag)

| ID | Finding | Reason |
|----|---------|--------|
| GAP-4 | Sprint Reviewer has no defined weaknesses, so #157 difficulty targeting not validated e2e | Sprint Tester persona intentionally has no weaknesses. Difficulty targeting is tested via Marco (ser/estar). |

### Positive findings (protect these, flag if regressed)

| ID | Finding | Persona |
|----|---------|---------|
| S-2 | Marco B1 is the quality benchmark: excellent L1 Italian accommodation, sports personalization, ser/estar targeting | Marco B1.1 |
| — | No phantom media references across all 5 personas (#184 fix confirmed) | All |
| — | No raw JSON visible in any lesson (#192 fix confirmed) | All |
| — | Grammar blocks render correctly as structured content | All |
| — | PDF export works across all personas | All |
| — | Student view renders correctly for all personas | All |

---

## From: #262 - Session-count-to-curriculum mapping (2026-03-25)

### Logic change (verify curriculum entry count and sub-focus labeling)

Template-based courses now generate exactly `sessionCount` entries (not `unitCount`). Mapping strategies:

| Strategy | When | What to verify |
|----------|------|----------------|
| exact | sessionCount == unitCount | One entry per unit, topic = unit title |
| expand | sessionCount > unitCount | Multiple entries per unit with sub-focus labels: "UnitTitle: Introduction", "UnitTitle: Practice", "UnitTitle: Production" (or "Foundation"/"Extended Practice" for 2-session units) |
| compress | sessionCount < unitCount | Only first N units covered; remaining units absent from curriculum |

**Verify for any template-based course:**
- Total curriculum entries = chosen session count (not template unit count)
- For expand: each unit's entries have distinct sub-focus labels in the topic field
- For compress: units beyond the chosen session count are entirely absent; no partial coverage
- Grammar progression order is preserved (unit 1 before unit 2, etc.)
- `TemplateUnitRef` on each entry points to the source unit title

---

## From: #351 - Additive section guidance model (2026-03-28)

### What #351 changed
Replaced hardcoded per-section prose in `PromptService.cs` with a loop that assembles section instructions from config (sectionProfile guidance + templateOverride overrideGuidance). Enforced `restrictions` field from template-overrides.json. Fixed 7 template-overrides.json entries (Grammar Focus warmUp, Writing Skills warmUp/wrapUp, Exam Prep warmUp, R&C warmUp, Thematic Vocabulary wrapUp). Updated Presentation B1/B2 guidance with conditional grammar-discovery framing.

### Verified in full 5-persona QA run (2026-03-28)

| ID | Finding | #351 AC | Status | Notes |
|----|---------|---------|--------|-------|
| CQ-1 | WarmUp vocabulary drill (all personas) | N/A (fixed by #226) | **HOLDS** | WarmUp no longer generates vocabulary drills. All personas produce conversation content type. Original fix from #226 is stable. |
| GAP-1 | Carmen R&C no reading passage in Presentation | Carmen B2.1: Presentation contains a reading passage | **NOT FIXED** | Presentation still generates a grammar block (indicativo/subjuntivo) instead of a reading passage. Grammar content is excellent but wrong section purpose for R&C template. |
| GAP-2 | Carmen R&C missing Production section | Carmen B2.1: Production section is present | **NOT FIXED** | Lesson still has only 4 sections (WarmUp, Presentation, Practice, WrapUp). Production is missing. |
| CQ-4 | Ana Exam Production is oral instead of written | Ana Exam B2: Production contains written tasks with time/word-count targets | **NOT FIXED** | Production still generates conversation scenarios (oral practice). No written exam tasks, no time limits, no word count targets. |
| GAP-3 | Ana Exam no timed practice guidance | Ana Exam B2: timed practice awareness | **NOT FIXED** | No time limits mentioned anywhere in the lesson. |
| CQ-2 | C1 vocabulary in B2 lesson | N/A (fixed by #229) | **HOLDS** | No C1 vocabulary detected in Ana Exam B2. Fix stable. |
| CQ-3 | Vocabulary definitions in Spanish for English L1 | N/A (fixed by #229) | **N/A** | No standalone vocabulary block in Ana Exam to test. |
| NEW-1 | Grammar Focus WarmUp overgeneration | WarmUp is a single brief activation | **NOT FIXED** | All Grammar Focus personas (Marco B1, Sprint Reviewer) generate 3 full conversation scenarios (5-6 exchanges each) instead of the specified "single question, one student response, brief teacher reaction." |
| NEW-2 | WrapUp overgeneration across all personas | WrapUp is reflection/closure, no new practice | **NOT FIXED** | All 5 personas generate 3 full conversation scenarios in WrapUp. No reflection, self-assessment, or summary is present. This is new practice material. |
| NEW-3 | Exam Prep WarmUp not following briefing format | Exam Prep warmUp: exam briefing, not icebreaker | **NOT FIXED** | Ana Exam WarmUp generates 3 full conversation scenarios instead of the specified "Orient the student to today's exam task type. State the task, the time limit, and the one scoring criterion." |
| S-2 | Marco quality benchmark | N/A | **HOLDS** | Marco remains the quality benchmark. L1 Italian accommodation and personalization are excellent. |

### Root cause analysis

The additive prompt model (#351) successfully replaced hardcoded prose with config-driven section instructions. The template overrides are loaded and composed correctly (confirmed in unit tests). However, the AI does not follow section-level guidance strings when the generated content type is `conversation`.

The **conversation content type schema** always produces 3 full scenarios with 5-6 exchanges each, regardless of the section guidance saying "single question" or "brief reflection." The content type's inherent structure overrides the section-level instruction.

**Carmen R&C** and **Ana Exam** regressions persist because the prompt changes in #351 affect the section guidance text, but the AI still generates the wrong content type for these template-specific requirements (grammar block instead of reading passage; conversation instead of written exam tasks).

### Recommendation

These are structural issues for the **Pedagogical Quality** sprint to address:
1. **Content type selection per section**: The prompt or config should constrain which content type is generated per section, not just what guidance text is shown. A R&C Presentation should always generate a `reading` block; Exam Prep Production should generate `exercises` with written tasks.
2. **Section-aware conversation mode**: The conversation schema could support a "brief" mode (1 scenario, 2-3 exchanges) for WarmUp/WrapUp, vs the full mode (3 scenarios, 5-6 exchanges) for Practice/Production.

### Positive findings (protect these)

| Finding | Persona |
|---------|---------|
| No phantom media references | All 5 personas |
| No raw JSON visible | All 5 personas |
| Grammar blocks render correctly | All 5 personas |
| PDF export works | 4/5 (Sprint Reviewer timed out, non-blocking) |
| Student view renders correctly | All 5 personas |
| Presentation grammar quality is excellent | Marco B1, Carmen B2, Ana Exam B2 |
| Exercise variety is good across all personas | All 5 personas |
| L1 awareness is strong in Marco (Italian) | Marco B1 |
| Student personalization (interests, weaknesses) is good | All 5 personas |
| CEFR level boundaries respected (no C1 in B1/B2 lessons) | All 5 personas |

---

## From: triage-2026-04-02.md

### Fixed (verify these)

| ID | Finding | Fix | Issue | Deployed? |
|----|---------|-----|-------|-----------|
| CQ-NB2 | Nadia B2 AR: True/False item 1 is meta-reasoning with no source text; sourcePassage was empty | Added mandatory sourcePassage instruction to exercises prompt | #431 | Yes, merged this sprint |
| CQ-RC1 | Ricardo C1 PT: True/False item 3 states rule as absolute, contradicting Presentation nuance on indicativo | Added coherence constraint requiring trueFalse items to match Presentation nuance | #431 | Yes, merged this sprint |
| CQ-SA2 | Sophie A2.2 FR: Full irregular indefinido paradigm, perfecto/indefinido distinction, and imperfect continuous introduced in Practice with no Presentation coverage | Added grammar scope non-introduction constraint to exercises prompt | #431 | Yes, merged this sprint |
| CQ-WB1 | Sprint Reviewer B1: WarmUp roleB model phrase contains B2-level conditional perfect (habría dicho) | Added CEFR level constraint to WarmUp conversation prompt for all role phrases | #431 | Yes, merged this sprint |
