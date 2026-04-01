# Task 318: Add Teacher QA Persona for Writing Skills Template

## Problem

The Writing Skills template has no Teacher QA persona testing it. All other templates have coverage:

| Template | Persona |
|---|---|
| Conversation | Ana A1, Sophie A2, Nadia B2 |
| Grammar Focus | Marco B1, Ricardo C1, Hans A1 |
| Reading & Comprehension | Carmen B2 |
| Exam Prep | Ana Exam B2 |
| Writing Skills | **none** |

## Solution

Add a new dedicated persona "Isabel" using the Writing Skills template at B1 level. Writing tasks are most differentiated at B1-B2 (process-writing: model analysis -> final product), making this a meaningful test.

## New Persona: Isabel (B1.1, Writing Skills, English L1)

- **Teacher**: Isabel, teaches Spanish to English speakers
- **Student**: [QA] Alex, B1.1, native English, interests: travel, food writing
- **Lesson**: Writing Skills template, topic "writing a formal complaint letter"
- **Curriculum scope (B1.1)**: formal register, past tense narration, discourse connectors, polite request structures. English L1 key test: direct tone interference (English complaints are often more direct than Spanish formal letters).
- **Expected**: model text analysis section, guided writing stages, B1-appropriate vocabulary and structures, formal register throughout

## Files to Change

1. **Create** `.claude/skills/teacher-qa/playwright/tests/isabel-b1.spec.ts`
   - Follows same pattern as sophie-a2.spec.ts
   - Template: "Writing Skills", CEFR: B1, L1: English
   - Topic: "writing a formal complaint letter"

2. **Edit** `.claude/skills/teacher-qa/SKILL.md`
   - Add Isabel to the Argument Parsing section (new arg `isabel`)
   - Add Isabel to the full run list (10 personas total)
   - Add execution command for Isabel
   - Add Persona 10 description block
   - Update curriculum file mapping (B1.1 -> `data/curricula/iberia/B1.1.json`)

## Acceptance Criteria

- [ ] `isabel-b1.spec.ts` exists and follows the same pattern as other persona specs
- [ ] SKILL.md lists `isabel` as a valid arg
- [ ] SKILL.md `full` run includes Isabel (10 personas)
- [ ] Persona description covers Writing Skills template expectations
