# Task 323: Create L1 influence, course rules, and style substitution JSON files

## Goal
Create three new JSON files in `data/pedagogy/` encoding language family adjustments, cross-session variety rules, and learning style substitution paths.

## Source Documents
- Isaac's spec: `plan/pedagogy-specification/pedagogy-model-spec.md` Sections 5, 5.4, 6
- Sophy's architecture: `plan/pedagogy-specification/pedagogy-config-architecture.md` Layers 5, 6, and Additional Layers

## Files to Create

### 1. `data/pedagogy/l1-influence.json`
Language family + specific language rules. Architecture doc Layer 5 has the full content:
- 5 families: romance, germanic, sinitic-japonic, slavic, arabic
- 4 specific languages: italian, french, persian, mandarin
- Persian has `family: null` (NOT in arabic family, has 6 vowels like Spanish)

### 2. `data/pedagogy/course-rules.json`
Cross-session variety and skill distribution. Architecture doc Layer 6 has the full content:
- varietyRules: practiceTypeCombination, productionTypeAlternation, warmUpFormat, competencyCoverage, exerciseTypeCoverage
- skillDistribution: general + conversational
- grammarProgression: spiral model with valid/lazy recycling examples

### 3. `data/pedagogy/style-substitutions.json`
Learning style substitution paths. Architecture doc Additional Layers section has the full content:
- 4 entries: role-play, long writing, mechanical grammar, listening
- Each: rejects, label, substituteWith, neverSubstituteWith, rule

## No Backend Changes Needed
These are pure data files. PedagogyConfigService (issue #324) will load them. No code changes in this task.

## Acceptance Criteria Checklist
- [ ] l1-influence.json: 5 families + 4 specific languages
- [ ] Persian family is null (not arabic)
- [ ] course-rules.json: variety rules + skill distribution (general + conversational) + grammar progression (spiral + valid/lazy examples)
- [ ] style-substitutions.json: 4 substitution entries
- [ ] Each substitution preserves competency (no oral-to-written replacement)
