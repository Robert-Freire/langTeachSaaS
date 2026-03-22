# Teacher QA Agent + Sprint Branch Workflow

> **Goal**: Add a quality gate between agent development and main. Agents merge to a sprint branch, a Teacher QA agent tests the integrated result with real auth and real AI, findings get triaged before anything hits main.
>
> **Why now**: The team ships faster than one person can review. 7/10 sprint issues closed in ~2 days. Without a quality gate, invisible debt accumulates. We need a "teacher eye" on generated content, not just "does the button work."
>
> **Deliverable to Jordi**: NOT "please test this." Instead: (1) a polished email with screenshots of what's new, (2) a short curated list of pedagogical questions from triage.

---

## Part 1: Sprint Branch Workflow

### Convention

```
main (stable, normally in sync with the active sprint branch)
  └── sprint/<milestone-slug> (integration branch, agents merge here)
        └── task/t<N>-<description> (feature branches, PRs target sprint branch)
```

- Each active milestone gets one sprint branch: `sprint/curriculum-personalization`
- Agents create PRs targeting the sprint branch instead of `main`
- Teacher QA agent tests the sprint branch (locally via e2e stack or against Azure)
- Robert reviews the sprint branch as a whole, merges to main when satisfied

### Deployment model

- **Main is the only branch that deploys to Azure.** The existing CD pipeline (main -> Azure) stays unchanged.
- A GitHub Action merges the sprint branch into main (on demand, triggered by Robert). This is the quality gate.
- After merge, the existing CD pipeline picks up the change and deploys automatically.
- **Freeze = don't trigger the merge action.** Sprint branch keeps receiving work, main stays stable, Azure stays on the last good state. No config variables, no special flags.
- **Unfreeze = trigger the merge action when ready.**

This means:
1. Sprint branch is where work and testing happen
2. Main only advances when Robert explicitly approves (triggers the merge action)
3. Azure always reflects main (no changes to deployment infra)
4. One quality gate, one button, no ambiguity

### Branch lifecycle

1. At sprint start: create `sprint/<slug>` from `main`
2. During sprint: agents open PRs against the sprint branch
3. Periodically: merge sprint branch to main (unless frozen)
4. At sprint end: final QA pass, merge to main, delete the sprint branch
5. Next sprint: new `sprint/<slug>` from `main`

### CLAUDE.md changes needed

- PR target changes from `main` to `sprint/<current-milestone-slug>`
- Task status memory tracks the current sprint branch name and freeze state
- Post-merge workflow (project board move, worktree cleanup) stays the same
- Deploy freeze simplified: freeze = Robert doesn't trigger the sprint-to-main merge action (replaces DEPLOY_FROZEN variable)

---

## Part 2: Teacher QA Agent

### What it is

A Claude-based agent that acts as a language teacher using the app. It doesn't just verify UI flows work (existing e2e tests do that). It evaluates whether the generated content is **pedagogically sound** and whether the UX makes sense from a teacher's daily workflow perspective.

### What it is NOT

- Not a replacement for Jordi's feedback (ceiling on AI evaluating AI)
- Not a traditional test suite (no assertions on DOM elements)
- Not automated CI (runs on-demand or per-sprint, not per-commit)

### Infrastructure

**Auth**: Dedicated Auth0 account for the QA agent (e.g., `teacher-qa@langteach.test`). This is a unique identity, separate from the e2e test user, so QA data (students, lessons, generated content) persists across runs without being cleaned up by e2e test teardown. Real JWT, real /api/auth/me registration flow. No mock auth.

**AI**: Real Claude API calls. The whole point is evaluating actual generated content, not mocked responses.

**Stack**: Uses the e2e docker-compose stack built from the sprint branch. The agent checks out the sprint branch code, builds the stack, and tests against it.

**Tooling**: Playwright for browser automation (reuse existing e2e helpers for navigation, extend with QA-specific flows). Claude for content evaluation (separate from the app's own Claude usage, the agent itself calls Claude to evaluate the generated output).

### Teacher Personas

Each persona represents a real teaching scenario. The agent adopts a persona, creates the corresponding student and lesson, generates content, and evaluates the result.

All personas are **Spanish teachers for foreigners** (ELE, Espanol como Lengua Extranjera). This matches Jordi's expertise and the curriculum data we have. Different L1 backgrounds test the personalization and L1 interference handling.

**Persona 1: Ana (beginner, English L1)**
- Teaches Spanish to English speakers
- Student: "Emma", A1.1, native English, interests: travel, food
- Creates a Conversation template lesson, topic: "ordering at a restaurant"
- Curriculum check: A1.1 in Jordi's data covers present tense regular verbs, basic vocabulary (food, numbers, greetings). The lesson should stay within these bounds.
- Expected: simple vocabulary (fewer than 15 items), short dialogues (3-4 exchanges), no subjunctive, no complex grammar, warm-up is an icebreaker not a drill

**Persona 2: Marco (intermediate, Italian L1)**
- Teaches Spanish to Italian speakers
- Student: "Luca", B1.1, native Italian, interests: football, movies, weakness: ser/estar confusion
- Creates a Grammar template lesson, topic: "ser vs estar in context"
- Curriculum check: B1.1 should cover contrasting ser/estar in present + past. Italian L1 is a key test because Italian "essere" covers both, so L1 interference is strong.
- Expected: exercises targeting the specific weakness, L1 interference awareness, difficulty appropriate for B1, no C1 structures

**Persona 3: Carmen (advanced, English L1)**
- Teaches Spanish to English speakers
- Student: "James", B2.1, native English, interests: politics, literature, weakness: subjunctive mood
- Creates a Reading template lesson, topic: "Spanish political system"
- Curriculum check: B2.1 should handle complex texts with abstract topics, subjunctive in subordinate clauses, formal register.
- Expected: authentic-feeling text (not simplified), comprehension questions at B2 depth, vocabulary appropriate for the topic, exercises that challenge without overwhelming

**Persona 4: Ana again (exam prep, English L1)**
- Same teacher as Persona 1
- Student: "Tom", B2, native English, preparing for DELE B2
- Creates an Exam Prep template lesson, topic: "DELE B2 reading comprehension practice"
- Expected: exam-format exercises, timed practice awareness, formal register, test-taking strategies

**Persona 5: Sprint Reviewer (dynamic, sprint-focused)**

Unlike the other personas which are fixed scenarios, this persona is generated per sprint. Before running, the agent:

1. Reads the sprint's completed and ready-to-test issues from GitHub (closed issues + issues in "Ready to Test" column on the project board)
2. Identifies what features were added or changed (e.g., "difficulty targeting", "curriculum templates", "auto-fill language/level")
3. Designs a test scenario that specifically exercises those features together

For example, if the current sprint delivered:
- #157 AI-Powered Difficulty Targeting
- #164 Curriculum templates
- #150 Filter difficulties by target language

The Sprint Reviewer would:
- Create a student with specific structured difficulties (ser/estar, pronunciation of /rr/)
- Select a curriculum template for B1 Spanish
- Generate a lesson and verify the content actually targets those difficulties
- Check that the difficulty filter correctly limits to the target language
- Verify curriculum template data flows through to generation

This persona catches **integration issues**: individual features work in isolation (the regular e2e tests cover that), but do they work together coherently? Does difficulty targeting actually influence what the curriculum template generates? Does auto-fill set the right level before generation runs?

The Sprint Reviewer also evaluates from the teacher's perspective: "I just got 3 new features this sprint. As a teacher, do they make my workflow better or more confusing? Is there a new button I wouldn't understand? An empty state that leaves me stranded?"

**Output**: In addition to the standard rubric findings, the Sprint Reviewer produces a "Sprint Integration Assessment" section rating:
- Feature coherence: do the new features play well together?
- Workflow impact: does the teacher's daily loop improve or get more complex?
- Regression check: did the new features break the feel of existing flows?
- Missing pieces: anything the sprint should have included but didn't?

### Evaluation Rubric

The agent evaluates each generated lesson against these criteria, organized by section type and content type.

#### Section-Level Criteria

**Warm-Up (all templates)**
- [ ] Is an icebreaker or conversation starter, NOT a vocabulary drill or grammar exercise
- [ ] Relates to the lesson topic loosely (thematic connection, not direct teaching)
- [ ] Appropriate length (2-5 minutes of class time worth of content)
- [ ] Low pressure, builds confidence (no right/wrong answers)
- Jordi reference: "warm-up is never vocabulary, it's more like break the ice, talk a bit, lose fear"

**Presentation**
- [ ] Introduces new material clearly with examples
- [ ] Appropriate amount of new items for the level (A1: 8-12, B1: 12-18, B2: 15-25)
- [ ] Uses context and examples, not just definitions
- [ ] For grammar: shows the rule with clear, varied examples before drilling

**Practice**
- [ ] Exercises are controlled (guided practice with scaffolding)
- [ ] Difficulty matches the stated CEFR level
- [ ] Variety of exercise types (not all fill-in-the-blank)
- [ ] Exercises reference the presentation content (not random unrelated vocabulary)

**Production**
- [ ] Free practice, less controlled than Practice section
- [ ] Communicative tasks (role-plays, discussions, writing prompts)
- [ ] Student produces language, not just recognizes it
- [ ] Realistic scenario the student might encounter

**Wrap-Up**
- [ ] Brief review or reflection activity
- [ ] Does not introduce new material
- [ ] Provides closure (summary, self-assessment, preview of next class)

#### Content-Type Criteria

**Vocabulary blocks**
- [ ] Number of items appropriate for level
- [ ] All items have translations
- [ ] Example sentences use the word in context
- [ ] No items significantly above or below the stated level
- [ ] No duplicate or near-duplicate items

**Exercise blocks**
- [ ] Clear instructions
- [ ] All exercises have correct answers defined
- [ ] No references to non-existent media (images, audio, video files)
- [ ] Answer explanations present (not just "correct/incorrect")
- [ ] Mix of exercise types within a section

**Conversation/Dialogue blocks**
- [ ] Natural-sounding dialogue (not textbook-stilted)
- [ ] Appropriate for the student's level (sentence length, vocabulary)
- [ ] Cultural context is accurate
- [ ] Speaker roles are clear

**Reading blocks**
- [ ] Text length appropriate for level (A1: 80-150 words, B1: 200-400, B2: 400-700)
- [ ] Topic matches the lesson topic
- [ ] Comprehension questions test understanding, not just word-spotting
- [ ] No anachronisms or factual errors in the text

**Grammar blocks**
- [ ] Rule explanation is clear and concise
- [ ] Examples illustrate the rule, not exceptions
- [ ] For L1-specific issues: acknowledges L1 interference pattern

#### Curriculum Alignment (validated against Jordi's data)

The agent loads the extracted curriculum JSONs (from #163) and cross-references:

- [ ] **Grammar scope**: generated grammar matches what Jordi's curriculum maps to this CEFR sublevel (e.g., A1.1 should NOT include subjunctive, B1.1 should include ser/estar contrasts)
- [ ] **Vocabulary themes**: generated vocabulary topics align with the curriculum's thematic areas for this level
- [ ] **Competency balance**: the lesson covers the right competencies for its template type (a Conversation lesson should emphasize speaking/listening, not just reading)
- [ ] **Progression respect**: content doesn't assume knowledge from higher sublevels (e.g., a B1.1 lesson shouldn't require B2 vocabulary)

This is not just QA, it's validating that the AI generation pipeline actually uses the curriculum data correctly. If Jordi's curriculum says A1.2 introduces past tense and the AI generates past tense exercises for an A1.1 student, that's a real bug.

#### Pedagogical Intention Traceability

Each lesson has a stated objective (topic, target grammar, target skills). The agent evaluates whether the generated content actually serves that objective:

- [ ] **Objective-exercise alignment**: every exercise in the lesson connects to the stated pedagogical intention (not tangential or off-topic content)
- [ ] **Coverage completeness**: the stated objective is actually practiced, not just mentioned. If the lesson says "learn past tense irregular verbs," there should be exercises that specifically drill irregular forms, not just a vocabulary list that happens to include past tense.
- [ ] **Traceability map**: for each exercise/activity, the agent identifies what it teaches. Output example: "Exercise 1 (fill-in-the-blank) -> practices irregular preterite conjugation. Exercise 2 (dialogue) -> uses irregular preterites in context. Vocabulary block -> 4/12 items are irregular preterite verbs."
- [ ] **Drift detection**: flag cases where the AI generated content that's interesting but doesn't serve the lesson's stated goal (e.g., a great cultural reading that doesn't practice the target grammar)

**Why this matters beyond QA**: Jordi specifically asked for the ability to tell a student "in this lesson you learned X, through these exercises." This traceability map is the data that enables that future feature. For now, the QA agent validates it; later, the app surfaces it to teachers.

**Future feature note**: Pedagogical traceability as a first-class app feature (show teacher: "This lesson covers: irregular preterite [exercises 1, 2, 4], restaurant vocabulary [vocab block, exercise 3], spoken fluency [dialogue, production activity]"). Tracked here as a roadmap item, not a sprint task.

#### Cross-Cutting Criteria

- [ ] **No phantom references**: no mentions of images, audio files, video links, or materials that don't exist in the lesson
- [ ] **CEFR coherence**: vocabulary, grammar structures, and text complexity all match the stated level (not just the vocabulary list)
- [ ] **L1 awareness**: content acknowledges the student's native language where relevant (false friends, interference patterns)
- [ ] **Student personalization**: content references the student's interests, goals, or weaknesses where the persona specifies them
- [ ] **Section flow**: the lesson reads as a coherent progression, not 5 independent blocks
- [ ] **No excessive repetition**: across sections, the same words/structures aren't drilled identically
- [ ] **Professional appearance**: a teacher could show this to a student or parent without embarrassment

### Agent Output Format

The agent produces a structured report per persona run:

```markdown
## Teacher QA Report: [Persona Name] - [Date]

### Persona
- Teacher: [name], teaches [language]
- Student: [name], [level], L1: [language], interests: [list]
- Lesson: [template] - [topic]

### Verdict: PASS | ISSUES FOUND | NEEDS REVIEW

### Findings

#### Bugs (broken functionality)
- [B1] [Section: Warm-Up] Description of the bug

#### Content Quality Issues (pedagogically wrong)
- [C1] [Section: Practice] Exercises reference "the image above" but no image exists
- [C2] [Section: Vocabulary] 3 items are C1 level in a B1 lesson: [list]

#### Gaps (something expected is missing)
- [G1] No L1 interference notes despite student being Italian learning Spanish
- [G2] Wrap-up section is empty

#### Suggestions (not wrong, but could be better)
- [S1] Warm-up could be more engaging, currently feels like a vocabulary preview
- [S2] Production section could include a real-world scenario

### Screenshots
[Attached: lesson-editor.png, student-view.png, pdf-export.png]
```

### How to Run

Invoked on demand via Claude Code skill (`/teacher-qa`) or agent. Robert or PM decides when to run it (typically: after several PRs merge to sprint branch, before syncing sprint to main, or when something feels off).

**Modes:**
- `/teacher-qa full` : runs all 5 personas (fixed 4 + sprint reviewer). Full assessment.
- `/teacher-qa sprint` : runs only Persona 5 (Sprint Reviewer). Quick check of what's new.
- `/teacher-qa <persona>` : runs a specific persona (e.g., `/teacher-qa ana-a1`). Targeted check.

**Execution flow:**

1. Checks out the sprint branch, builds and starts the e2e stack
2. Logs in with the dedicated QA Auth0 user
3. For each selected persona:
   a. Creates the student profile (or reuses if exists from prior run)
   b. Creates a lesson with the specified template and topic
   c. Triggers AI generation (real Claude API)
   d. Waits for generation to complete
   e. Screenshots the teacher view (editor)
   f. Screenshots the student view (if available)
   g. Exports PDF and checks it
   h. Evaluates all content against the rubric
   i. Produces the findings report
4. For Sprint Reviewer (Persona 5): also produces the Sprint Integration Assessment
5. Tears down the stack
6. Returns the combined report for triage

---

## Part 3: Triage Workflow

### After each QA run

1. Teacher QA agent produces report(s)
2. Robert + PM review findings together
3. Each finding gets categorized:

| Category | Action |
|----------|--------|
| **Bug** | Create GitHub issue, add to current sprint if P1, backlog if P2+ |
| **Content quality issue** | Create GitHub issue with `type:ai-quality` label, prioritize based on frequency |
| **Gap** | Evaluate: is this a missing feature or a prompt improvement? File accordingly |
| **Suggestion** | Collect into a batch, discuss with PM, decide if worth pursuing |
| **Ask Jordi** | Add to the "Jordi questions" batch for the next email |

### Jordi Communication Cadence

- **After each sprint merge to main**: send Email 1 (screenshots + what's new)
- **When 3-5 pedagogical questions accumulate**: send Email 2 (curated questions, structured for easy response)
- **Never**: send raw QA reports, bug lists, or technical details
- **Format**: short, visual, specific. "When you teach a warm-up for B1, do you ever include a quick vocabulary preview, or is it always pure conversation? Here's what our AI generated: [screenshot]"

---

## Implementation Plan

### Task 1: Sprint Branch Convention (half day)
- Update CLAUDE.md with sprint branch rules
- Create `sprint/curriculum-personalization` from current `main`
- Update task status memory with sprint branch name
- Retarget any open PRs to the sprint branch

### Task 2: Teacher QA Agent Skill (2-3 days)
- Create `.claude/skills/teacher-qa/SKILL.md` with the full rubric and persona definitions
- Build Playwright automation for the persona workflow (create student, create lesson, generate, evaluate)
- Build the evaluation logic (Claude evaluates the generated content against the rubric)
- Build the report output format
- Test with one persona first, expand to all four

### Task 3: Triage Process Documentation (half day)
- Document the triage categories and workflow in `plan/teacher-qa-agent/triage-workflow.md`
- Create a `type:ai-quality` label in GitHub for content quality issues
- Set up a "Jordi Questions" tracking file for batched communication

### Task 4: First Full QA Run (1 day)
- Run all 4 personas against the current sprint branch
- Produce the first report
- Do the first triage with Robert
- File issues as appropriate

### Order: Task 1 -> Task 2 -> Task 3 -> Task 4 (Task 3 can parallel with Task 2)

---

## Decisions (confirmed with Robert, 2026-03-22)

1. **Deployment**: Main is the only branch that deploys. A GitHub Action merges sprint to main on demand (Robert triggers it). Freeze = don't trigger. Existing CD pipeline unchanged.
2. **Auth0 test user**: Dedicated unique account for the QA agent. Separate from e2e test user so QA data persists.
3. **QA frequency**: At will (on demand). Not scheduled, not per-commit. Robert or the PM triggers a QA run when they want to check the sprint branch state.
4. **Personas**: 4 fixed personas + 1 dynamic Sprint Reviewer that adapts to whatever was built in the current sprint.

---

*Created: 2026-03-22 | Status: Draft, decisions captured, ready for final review*
