# Task 201: Teacher QA Remaining Personas + Sprint Reviewer

## Objective

Extend the Teacher QA agent from 2 personas (Ana A1.1, Marco B1.1) to 5 personas, fix two known bugs from the previous attempt, and document the QA user onboarding procedure in SKILL.md.

## Bugs to Fix

### Bug 1: findStudentByName parses array instead of paginated object

In `.claude/skills/teacher-qa/playwright/helpers/navigation.ts` line 62:
```ts
// WRONG
const students: Array<{ id: string; name: string }> = await studentsResponse.json()
```
The real API returns `{ items: Student[], totalCount, page, pageSize }`. Fix:
```ts
const body: { items: Array<{ id: string; name: string }> } = await studentsResponse.json()
const students = body.items
```

### Bug 2: auth.ts silently bypasses onboarding instead of failing

The current `createQAAuthContext` does not detect or handle the `/onboarding` redirect. Update it to:
- After `waitForURL`, check if the current URL contains `/onboarding`
- If yes: throw an error with a clear message directing the user to SKILL.md
- Do NOT automate onboarding inside the auth helper

## New Files to Create

### Persona 3: Carmen (B2.1, Reading, English L1)

File: `.claude/skills/teacher-qa/playwright/tests/carmen-b2.spec.ts`

```
Student: [QA] James, B2.1, native English, interests: politics, literature
Weakness: subjunctive mood
Template: Reading
Topic: "The Spanish political system"
```

### Persona 4: Ana Exam Prep (B2, DELE B2)

File: `.claude/skills/teacher-qa/playwright/tests/ana-exam-b2.spec.ts`

```
Student: [QA] Tom, B2, native English, preparing for DELE B2
Template: Exam Prep
Topic: "DELE B2 reading comprehension practice"
```

Note: The issue says "B2" (not "B2.1"). Check what CEFR level options exist in the app. If "B2" is not a valid option, use "B2.1" and document in the SKILL.md note.

### Persona 5: Sprint Reviewer (dynamic)

File: `.claude/skills/teacher-qa/playwright/tests/sprint-reviewer.spec.ts`

The sprint reviewer is different from the other personas:
- It does NOT generate a predefined lesson. Instead, it reads GitHub issues (closed + Ready to Test) from the active sprint.
- It picks the most recent sprint-relevant issues and designs a targeted test scenario that exercises those features together.
- It generates the integration test lesson based on that scenario.
- Output includes a "Sprint Integration Assessment" section.

Implementation approach:
- Use the `gh` CLI to fetch issues: `gh issue list --milestone "Curriculum & Personalization" --state closed --json number,title,labels` and `gh issue list --milestone "Curriculum & Personalization" --label "qa:ready" --json number,title,labels`
- The Playwright spec collects those issues from the environment (passed in via env var `QA_SPRINT_ISSUES_JSON`) and writes them to the metadata.
- The SKILL.md agent (Claude) reads the metadata, selects the scenario, and writes the Sprint Integration Assessment.

Since the sprint reviewer needs a lesson to test with, it generates a lesson that exercises sprint features:
- Student: [QA] Sprint, B1.1, English L1 (a general-purpose student)
- Template and topic are dynamically chosen by the SKILL.md agent after reading sprint issues

For the Playwright spec, it uses a stable default that tests a cross-cutting workflow:
- Student: [QA] Sprint Tester, B1.1, English L1
- Template: Grammar
- Topic: derived from sprint issues (env var QA_SPRINT_TOPIC, default: "everyday situations")
- The SKILL.md agent sets this env var before running the spec

## Files to Modify

### navigation.ts: fix findStudentByName

Fix the paginated response parsing at line 62.

### auth.ts: add onboarding guard detection

After `page.waitForURL`, add:
```ts
if (page.url().includes('/onboarding')) {
  throw new Error(
    'QA user has not been onboarded. The QA user must complete the 3-step onboarding wizard ' +
    'before running teacher-qa tests. See SKILL.md "One-Time QA User Onboarding" section.'
  )
}
```

### SKILL.md: add remaining personas and update argument parsing

Update sections:
1. **Argument Parsing**: add `carmen`, `ana-exam`, `sprint` modes; update `full` to include all 5 personas
2. **Execution Flow**: update Step 3 to reference the 3 new specs
3. **Personas**: add Personas 3-5 with full descriptions
4. **Notes for Future Personas**: remove (no longer needed)
5. **One-Time QA User Onboarding**: new section documenting the manual onboarding procedure

## One-Time QA User Onboarding (not automated)

This is a manual procedure that must be run once before teacher-qa tests work. Document in SKILL.md:

1. Ensure `.env.qa` is set up and the QA stack is running
2. Start the stack: `docker compose -f docker-compose.qa.yml --env-file .env.qa up -d --build`
3. Navigate to `http://localhost:5175` in a browser (not Playwright)
4. Log in with the TEACHER_QA_EMAIL/PASSWORD from `.env.qa`
5. Complete the onboarding wizard:
   - Step 1 (Profile): display name "QA Teacher", teaching language Spanish, style preference (any)
   - Step 2 (Student): create a student (will become [QA] Emma or similar)
   - Step 3 (Lesson): create a lesson (can be any)
6. After completion, the auth helper will no longer detect `/onboarding` and tests will proceed.

Note in SKILL.md: the onboarding is persistent. Once done, it survives stack restarts (data is in the db volume). Only `docker compose down -v` would require re-onboarding.

## Sprint Reviewer SKILL.md Steps

Add to SKILL.md under Execution Flow, before the Sprint Reviewer persona runs:

```
When arg is `sprint`:
1. Fetch sprint issues:
   gh issue list --milestone "Curriculum & Personalization" --state closed --json number,title,labels | jq .
   gh issue list --milestone "Curriculum & Personalization" --label "qa:ready" --json number,title,labels | jq .
2. Analyze the issues and select the 3-5 most impactful features to test together
3. Set QA_SPRINT_TOPIC env var to a topic that exercises those features
4. Run sprint-reviewer.spec.ts
5. After the run, write Sprint Integration Assessment in the report
```

## Report Format Addition

Sprint Reviewer report includes an extra section:
```markdown
### Sprint Integration Assessment
- **Sprint Issues Tested**: [list of issue numbers and titles]
- **Test Scenario**: [what lesson was generated and why it exercises those features]
- **Feature Coherence**: [do the features work well together?]
- **Workflow Impact**: [do new features improve or complicate the teacher workflow?]
- **Regression**: [any features from previous sprints that seem broken?]
- **Missing Pieces**: [gaps that prevent a coherent end-to-end workflow]
- **Rating**: COHERENT | FRAGMENTED | NEEDS WORK
```

## Implementation Order

1. Fix `navigation.ts` (findStudentByName paginated parsing)
2. Fix `auth.ts` (onboarding guard detection)
3. Create `carmen-b2.spec.ts`
4. Create `ana-exam-b2.spec.ts`
5. Create `sprint-reviewer.spec.ts`
6. Update `SKILL.md` (argument parsing, personas 3-5, onboarding section)

## Pre-push Checks

These are `.claude/skills/` files only (TypeScript). Run:
- `cd .claude/skills/teacher-qa/playwright && npm install && npx tsc --noEmit` -- no TypeScript errors
- `cd backend && dotnet build` -- zero warnings (unchanged)
- `cd frontend && npm run build` -- zero errors (unchanged)
- `cd frontend && npm test` -- all unit tests pass (unchanged)
- `az bicep build --file infra/main.bicep` -- zero warnings

No new frontend/backend code, so the main pre-push checks are for unchanged code health + TypeScript compilation of the teacher-qa helpers.

## Out of Scope

- The actual one-time QA user onboarding (manual, user must do this)
- Running the teacher-qa test against the QA stack (that is issue #202)
- Any changes to frontend or backend code
