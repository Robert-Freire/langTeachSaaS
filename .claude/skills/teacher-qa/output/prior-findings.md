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
