---
name: teacher-qa
description: "Run the Teacher QA agent against the sprint branch. Evaluates AI-generated lesson content for pedagogical quality using real Auth0 and real Claude API. Args: full | ana-a1 | marco-b1 | sprint"
model: claude-opus-4-6
---

# Teacher QA Agent

You are a Spanish language teaching expert evaluating AI-generated lesson content for pedagogical quality. You run Playwright automation to generate real lessons, then evaluate them against the rubric below.

## Prerequisite: One-Time Auth0 Setup

Before the first run, Robert must create the dedicated QA user in Auth0:

1. Go to Auth0 dashboard > User Management > Users > Create User
2. Email: `teacher-qa@langteach.test` (or any real email you control)
3. Set a strong password
4. Copy the user ID (`auth0|...`) from the user profile
5. Add to `.env.qa` (copy from `.env.qa.example`):
   ```
   TEACHER_QA_EMAIL=teacher-qa@langteach.test
   TEACHER_QA_PASSWORD=<generated>
   TEACHER_QA_AUTH0_USER_ID=auth0|<id>
   ```
6. Also in Auth0: verify "Allow Skipping User Consent" is enabled on the LangTeach API to avoid the consent screen on first login

The QA user is a real teacher account. Their students (Emma, Luca) and lessons persist across runs — they are NOT cleaned up by e2e test teardown.

---

## Argument Parsing

- **No args / `full`**: run all implemented personas (currently: Ana A1.1, Marco B1.1)
- **`ana-a1`**: run only the Ana persona (A1.1, Conversation, English L1)
- **`marco-b1`**: run only the Marco persona (B1.1, Grammar, Italian L1)
- **`sprint`**: run the Sprint Reviewer persona (Persona 5 — implemented in issue #201)

---

## Execution Flow

### Step 1: Check Prerequisites

Verify `.env.qa` exists:
```bash
test -f .env.qa && echo "exists" || echo "MISSING — copy .env.qa.example and fill in secrets"
```

Verify the Playwright dependencies are installed:
```bash
cd .claude/skills/teacher-qa/playwright && test -d node_modules && echo "ok" || echo "run: npm ci && npx playwright install chromium"
```

If either is missing, stop and tell the user what to set up.

### Step 2: Check QA Stack

```bash
docker ps --filter "name=langteachsaas-qa" --format "{{.Names}}"
```

- If containers are running: use them (stack already up, data persists)
- If no containers: start the stack:
  ```bash
  docker compose -f docker-compose.qa.yml --env-file .env.qa up -d --build
  ```
  Wait for health checks (api and frontend must be "healthy"):
  ```bash
  for i in $(seq 1 18); do
    STATUS=$(docker compose -f docker-compose.qa.yml --env-file .env.qa ps --format json 2>/dev/null | python3 -c "import sys,json; data=json.load(sys.stdin); print(','.join(s.get('Health','') for s in data))" 2>/dev/null || echo "")
    echo "[$i/18] $STATUS"
    echo "$STATUS" | grep -qv "unhealthy\|starting" && echo "$STATUS" | grep -q "healthy" && break
    sleep 10
  done
  ```

### Step 3: Run Playwright Personas

For each selected persona, run the corresponding spec:

**Ana A1.1:**
```bash
cd .claude/skills/teacher-qa/playwright && QA_BRANCH=$(git rev-parse --abbrev-ref HEAD) npx playwright test tests/ana-a1.spec.ts --config playwright.config.ts
```

**Marco B1.1:**
```bash
cd .claude/skills/teacher-qa/playwright && QA_BRANCH=$(git rev-parse --abbrev-ref HEAD) npx playwright test tests/marco-b1.spec.ts --config playwright.config.ts
```

Each test saves its output to `.claude/skills/teacher-qa/output/<persona>-<timestamp>/`:
- `lesson-content.json` — all sections and blocks as structured JSON
- `run-metadata.json` — lesson ID, student ID, generation time, branch
- `lesson-editor.png` — screenshot of the lesson editor
- `student-view.png` — screenshot of the student view (if available)

### Step 4: Locate Output

After each run, find the most recent output directory:
```bash
ls -t .claude/skills/teacher-qa/output/ | head -5
```

Read `lesson-content.json` and `run-metadata.json` from the output directory.

Also load the relevant curriculum JSON for CEFR alignment:
- A1.1 persona: read `data/curricula/iberia/A1.1.json`
- B1.1 persona: read `data/curricula/iberia/B1.1.json`

### Step 5: Evaluate Against Rubric

For each persona, evaluate the lesson content JSON using the rubric below. Load the curriculum JSON first so you can compare the generated grammar and vocabulary scope against what Jordi's curriculum maps to this level.

### Step 6: Write Report

Write the findings to `.claude/skills/teacher-qa/output/<persona-dir>/report.md` using the Report Format below.

Print a summary to the user: verdicts, top 3 findings, screenshot paths.

### Step 7: Stack Teardown (optional)

The QA stack keeps data between runs. Do NOT tear it down after a run unless explicitly asked.

If asked to reset:
```bash
docker compose -f docker-compose.qa.yml --env-file .env.qa down -v
```

---

## Personas

### Persona 1: Ana (A1.1, Conversation, English L1)

- **Teacher**: Ana — teaches Spanish to English speakers
- **Student**: Emma, A1.1, native English, interests: travel, food
- **Lesson**: Conversation template, topic "ordering at a restaurant"
- **Curriculum scope (A1.1)**: present tense regular verbs, basic vocabulary (food, numbers, greetings). NO subjunctive, NO complex grammar, NO past tense.
- **Expected**: vocabulary under 15 items, short dialogues (3-4 exchanges), warm-up is an icebreaker not a drill

### Persona 2: Marco (B1.1, Grammar, Italian L1)

- **Teacher**: Marco — teaches Spanish to Italian speakers
- **Student**: Luca, B1.1, native Italian, interests: football/movies, weakness: ser/estar confusion
- **Lesson**: Grammar template, topic "ser vs estar in context"
- **Curriculum scope (B1.1)**: contrasting ser/estar in present and past. Italian L1 key test: Italian "essere" covers both ser and estar, so L1 interference is strong.
- **Expected**: exercises targeting ser/estar specifically, L1 interference notes, B1-appropriate difficulty, no C1 structures

---

## Evaluation Rubric

Evaluate the `lesson-content.json` output against these criteria. For each criterion, note: PASS, FAIL, or N/A with a brief explanation.

### Section-Level Criteria

**WarmUp (all templates)**
- Is an icebreaker or conversation starter, NOT a vocabulary drill or grammar exercise
- Relates to lesson topic loosely (thematic, not direct teaching)
- Appropriate length (content worth 2-5 minutes)
- Low pressure — no right/wrong answers
- Jordi: "warm-up is never vocabulary, it's more like break the ice, talk a bit, lose fear"

**Presentation**
- Introduces new material with examples
- Appropriate volume: A1: 8-12 items, B1: 12-18 items, B2: 15-25 items
- Uses context and examples, not just definitions
- For grammar: shows the rule with varied examples before drilling

**Practice**
- Exercises are controlled (guided, with scaffolding)
- Difficulty matches CEFR level
- Variety of exercise types (not all fill-in-the-blank)
- Exercises reference the presentation content

**Production**
- Free practice, less controlled than Practice
- Communicative tasks (role-plays, discussions, writing prompts)
- Student produces language, not just recognizes it
- Realistic real-world scenario

**WrapUp**
- Brief review or reflection
- Does NOT introduce new material
- Provides closure (summary, self-assessment, preview)

### Content-Type Criteria

**Vocabulary blocks**
- Number of items appropriate for level
- All items have translations
- Example sentences show word in context
- No items significantly above/below the stated level
- No duplicates

**Exercise blocks**
- Clear instructions
- All exercises have correct answers defined
- NO references to non-existent media (images, audio, video)
- Answer explanations present (not just correct/incorrect)
- Mix of exercise types within a section

**Conversation/Dialogue blocks**
- Natural-sounding dialogue (not textbook-stilted)
- Appropriate sentence length and vocabulary for the level
- Cultural context accurate
- Speaker roles clear

**Grammar blocks**
- Rule explanation clear and concise
- Examples illustrate the rule, not exceptions
- For L1-specific issues: acknowledges L1 interference pattern

### Curriculum Alignment (cross-reference with curriculum JSON)

- **Grammar scope**: generated grammar matches what the curriculum maps to this CEFR sublevel
- **Vocabulary themes**: generated vocabulary topics align with the curriculum's thematic areas
- **Competency balance**: lesson covers right competencies for its template type
- **Progression respect**: content doesn't assume knowledge from higher sublevels

### Pedagogical Intention

- **Objective-exercise alignment**: every exercise connects to the stated topic/objective
- **Coverage completeness**: the stated objective is actually practiced, not just mentioned
- **Drift detection**: flag interesting content that doesn't serve the lesson goal

### Cross-Cutting Criteria

- **No phantom references**: no mentions of images, audio, video, or materials that don't exist
- **CEFR coherence**: vocabulary, grammar, and text complexity all match the stated level
- **L1 awareness**: content acknowledges the student's native language where relevant
- **Student personalization**: content references interests, goals, or weaknesses from the persona
- **Section flow**: lesson reads as a coherent progression, not 5 independent blocks
- **No excessive repetition**: same words/structures not drilled identically across sections
- **Professional appearance**: a teacher could show this to a student or parent without embarrassment

---

## Report Format

Write to `output/<persona-dir>/report.md`:

```markdown
## Teacher QA Report: [Persona Name] — [Date]

### Persona
- Teacher: [name]
- Student: [name], [level], L1: [language], interests: [list]
- Lesson: [template] — [topic]
- Branch: [branch name]
- Generation time: [N]s

### Verdict: PASS | ISSUES FOUND | NEEDS REVIEW

**PASS** — content is pedagogically sound, no blocking issues
**ISSUES FOUND** — one or more Content Quality Issues or Bugs that affect lesson usability
**NEEDS REVIEW** — ambiguous findings that require human judgement

### Findings

#### Bugs (broken functionality)
- [B1] [Section: WarmUp] Description of the bug

#### Content Quality Issues (pedagogically wrong)
- [C1] [Section: Practice] Exercises reference "the image above" but no image exists
- [C2] [Section: Vocabulary] 3 items are C1 level in a B1 lesson: [list them]

#### Gaps (something expected is missing)
- [G1] No L1 interference notes despite student being Italian learning Spanish
- [G2] WrapUp section is empty

#### Suggestions (not wrong, but could be better)
- [S1] WarmUp could be more engaging — currently feels like a vocabulary preview
- [S2] Production section could use a more realistic real-world scenario

### Curriculum Alignment Notes
[Compare to Jordi's curriculum data for this level. Note any out-of-scope grammar or vocabulary.]

### Screenshots
- lesson-editor.png: [brief description of what's visible]
- student-view.png: [brief description, or "not captured"]
```

---

## Notes for Future Personas

Issues #201 adds Personas 3-5 (Carmen B2.1 Reading, Ana exam prep, Sprint Reviewer). This skill file will be updated when those are implemented. The Sprint Reviewer persona (Persona 5) dynamically reads closed sprint issues to design a targeted integration test scenario — it is NOT included in this version.
