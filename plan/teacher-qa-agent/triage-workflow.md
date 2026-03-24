# Teacher QA Triage Workflow

## Overview

After each QA run, findings are triaged into one of five categories. Each category has a defined action. The goal is to ensure every finding becomes either a GitHub issue, a Jordi question, or a documented decision — never silently dropped.

---

## Finding Categories

### Bug
**Definition:** The app behaves incorrectly. Content that should be there is missing, content appears in the wrong section, or the generation flow fails.

**Examples:**
- Warm-up section generates a vocabulary drill instead of a conversation starter
- Exercise block has no correct answers defined
- Section renders as raw JSON in the editor

**Action:**
- Create a GitHub issue with labels: `area:ai` (or `area:backend`/`area:frontend` as appropriate), `P1:must` or `P0:blocker` depending on severity
- Assign to current milestone
- Add to project board with status `ready`

---

### Content Quality
**Definition:** The app works correctly but the generated content is pedagogically weak, inappropriate for the level, or inconsistent with good teaching practice.

**Examples:**
- Vocabulary list has 30 items for an A1 lesson (too many)
- Production section is another controlled exercise, not free practice
- Dialogue sounds like a textbook, not natural speech
- B1 grammar explanation skips examples and goes straight to a rule

**Action:**
- Create a GitHub issue with labels: `area:ai`, `type:ai-quality`, appropriate priority
- Issue body should include: the specific finding, the expected behavior (citing the rubric), and the persona/lesson type where it was observed
- Assign to current milestone

---

### Gap
**Definition:** A feature or content type that is missing but wasn't in scope for the current sprint. The QA surfaced a need, not a failure.

**Examples:**
- Exam Prep template doesn't include timed practice awareness
- No way to regenerate a single section without regenerating the whole lesson
- Sprint Reviewer finds a feature that was shipped but has no empty state

**Action:**
- Evaluate: is this a prompt fix (quick, can be a `type:ai-quality` issue) or a feature addition (needs planning)?
- Prompt fixes: create issue with `area:ai`, `type:ai-quality`, `P2:should` or `P3:nice`
- Feature additions: create issue with appropriate labels, assign to a future milestone (not current sprint unless P0/P1)

---

### Suggestion
**Definition:** An improvement idea that doesn't indicate a failure. Quality is acceptable but could be better.

**Examples:**
- Warm-up could include a cultural curiosity question to make it more engaging
- Vocabulary examples are correct but feel generic; more student-interest-aligned examples would be better
- The homework block is technically correct but Jordi might prefer a different format

**Action:**
- Batch suggestions. Do NOT create one issue per suggestion.
- Collect suggestions in `plan/teacher-qa-agent/suggestion-backlog.md` (create if needed)
- Periodically review with Robert to decide which are worth filing as issues

---

### Ask Jordi
**Definition:** A pedagogical question where the rubric doesn't give us enough signal. We need a teacher's judgment, not a rule.

**Examples:**
- "When you teach warm-ups for B1, do you ever include a quick vocabulary preview, or is it always pure conversation?"
- "For exam prep lessons, should we include timed practice cues (e.g., 'you have 5 minutes') or is that too prescriptive for a lesson plan?"
- "The Sprint Reviewer noticed the lesson doesn't include a cultural element. Is that intentional for this template type?"

**Action:**
- Add to `plan/teacher-qa-agent/jordi-questions.md` using the batching format
- Do NOT send raw QA reports or screenshots to Jordi
- Questions are curated, specific, and phrased so a teacher can answer in 2-3 sentences
- Batch: send to Jordi at most once per sprint (or when Robert triggers the email)

---

## Triage Process

1. After each QA run, collect all rubric failures and observations into a single list
2. For each finding, assign a category (Bug / Content Quality / Gap / Suggestion / Ask Jordi)
3. Present the categorized list to Robert for approval
4. File issues for Bug and Content Quality findings (Robert may re-categorize)
5. Add Suggestions to suggestion-backlog.md
6. Add Ask Jordi items to jordi-questions.md
7. Update the QA run record in `plan/teacher-qa-agent/run-log.md` (create if needed)

---

## Labels Reference

- `area:ai` — prompt-driven content issues
- `type:ai-quality` — specifically AI-generated content quality (subset of area:ai)
- `P0:blocker` — blocks a demo or makes the app unusable
- `P1:must` — fix in current sprint
- `P2:should` — fix if time allows
- `P3:nice` — nice to have, future backlog
