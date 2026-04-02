# Task 317: Add Teacher QA Personas — A2 French, C1 Portuguese, B2 Arabic, A1 German

## Goal

Add 4 new Playwright spec files to the Teacher QA skill, following the same pattern as the existing 5 personas. Update SKILL.md to include them in the `full` run.

## Files to Create/Modify

### New spec files (`.claude/skills/teacher-qa/playwright/tests/`)

1. `sophie-a2.spec.ts` — A2.2 Conversation, French L1
   - Teacher: Sophie
   - Student: [QA] Claire, A2.2, native French, interests: cooking, cinema
   - Lesson: Conversation, "describing your neighborhood"

2. `ricardo-c1.spec.ts` — C1.1 Grammar, Portuguese L1
   - Teacher: Ricardo
   - Student: [QA] Paulo, C1.1, native Portuguese, interests: economics, travel, weakness: false cognates (exquisito, polvo, embarazada)
   - Lesson: Grammar, "subjunctive in concessive and conditional clauses"

3. `nadia-b2.spec.ts` — B2.1 Conversation, Arabic L1
   - Teacher: Nadia
   - Student: [QA] Youssef, B2.1, native Arabic, interests: architecture, history, weakness: article gender and written accent marks
   - Lesson: Conversation, "debating urban development and heritage conservation"

4. `hans-a1.spec.ts` — A1.2 Grammar, German L1
   - Teacher: Hans
   - Student: [QA] Lena, A1.2, native German, interests: music, sports, weakness: article gender (der/die/das vs el/la)
   - Lesson: Grammar, "articles and gender in everyday nouns"

### Modified files

- `SKILL.md`: update arg parsing docs (full = 9 personas), add persona descriptions, add run commands for each

## Implementation

All 4 specs copy the structure from `ana-a1.spec.ts` exactly: PERSONA object, single test, upsertStudent → createLesson → triggerFullGeneration → screenshots → extractLessonContent → saveRunOutput.

No logic changes. No helper changes. Pure data variation.

## Acceptance Criteria

- 4 new spec files created
- Each runs successfully against the QA stack
- `full` runs all 9 personas
- SKILL.md updated with new persona descriptions and run commands
