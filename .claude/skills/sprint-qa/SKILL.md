---
name: sprint-qa
description: "QA issues for sprint readiness and add qa:ready. No args: all unready issues in current milestone. Number: specific issue. Quoted string: filter by milestone."
---

# Issue QA

Quality gate for GitHub issue definitions. Checks that an issue is well-defined enough for a bot to implement without ambiguity, then adds `qa:ready`.

## Arguments

- **No args**: review all open issues without `qa:ready` in the current milestone
- **Number** (e.g., `406`): review a specific issue
- **Quoted string** (e.g., `"Pedagogical Quality"`): review all unready issues in the named milestone

## Step 1: Fetch Issues

- **Specific issue**: `gh issue view <N> --json number,title,body,labels,milestone`
- **All in milestone (no args)**: run `gh milestone list --state open --json title,dueOn`, pick the milestone with the earliest due date, then `gh issue list --milestone "<name>" --state open --json number,title,body,labels,milestone --limit 100` filtered to those without `qa:ready`
- **Named milestone**: `gh issue list --milestone "<name>" --state open --json number,title,body,labels,milestone --limit 100` filtered to those without `qa:ready`

## Step 2: Apply Blocking Criteria

Every issue must pass all of these:

| Criterion | Pass condition |
|-----------|---------------|
| Problem statement | Body explains what changes and why. At least 2-3 sentences, not a title restatement. |
| Acceptance criteria | Has verifiable conditions: "Acceptance Criteria" section, `- [ ]` checklists, or numbered requirements. Vague phrases like "should work well" do not count. |
| Priority label | Exactly one of: `P0:blocker`, `P1:must`, `P2:should`, `P3:nice` |
| Area label | At least one of: `area:frontend`, `area:backend`, `area:e2e`, `area:infra`, `area:design`, `area:ai`, `area:testing` |
| Milestone | Has a milestone assigned |
| Focused scope | Addresses a single concern |
| T-shirt size | See Size Gate below |

**Exception for small issues:** if the issue body is under 200 characters and the scope is genuinely obvious, the title may serve as the problem statement.

## Step 3: Size Gate

Check the issue's Size field on the project board:

```bash
gh api graphql -f query='{ user(login: "Robert-Freire") { projectV2(number: 2) { items(first: 100) { nodes { id fieldValueByName(name: "Size") { ... on ProjectV2ItemFieldSingleSelectValue { name } } content { ... on Issue { number } } } } } } }'
```

Field ID: `PVTSSF_lAHOAF1Pks4BSLsSzg_7HpU` | Options: XS=`e261fbf6`, S=`6736aa38`, M=`5cfbe0a8`, L=`e072ac0f`, XL=`2115c351`

If Size is not set, use your judgement to assign one before proceeding.

| Size | Action |
|------|--------|
| XS / S / M | Proceed normally |
| L | Count distinct work areas in the ACs (new infra, new API endpoints, new UI components, new tests each count as one). If 3+ distinct areas: invoke PM for split/keep verdict. If fewer than 3: proceed. |
| XL | Always invoke PM for split/keep verdict before proceeding. |
| XXL | Automatic FAIL. Post a comment stating the issue must be split. Do not add `qa:ready`. |

## Step 4: Specialist Gates

Run only when the issue matches the trigger condition.

### Data model gate (Sophy)

**Trigger:** issue mentions any of: new table, new entity, schema, migration, JSON data file, content type, exercise type, `AppDbContext`, DTO, foreign key, data model.

Invoke Sophy via Agent tool (`subagent_type: "general-purpose"`) with this prompt:

```
You are Sophy, a retired software architect. Read .claude/agents/sophy.md for your full persona.

Review this GitHub issue definition for hidden data model implications before it gets approved for development.

Issue #<N>: <title>
<full issue body>

Check for:
1. Unstated data model assumptions that will surface during implementation
2. Missing entity relationships or FK decisions that should be explicit in the ACs
3. Config-vs-code boundary violations
4. Over-engineering risks (new entities that could be simpler)
5. Conflicts with existing data model patterns in the codebase

Verdict: APPROVE / NEEDS CLARIFICATION (list specific questions the issue must answer before development starts)

Final response under 1500 characters.
```

- **NEEDS CLARIFICATION**: route Sophy's questions through the PM agent to update the issue body. Do not add `qa:ready` until resolved.
- **APPROVE**: note "Sophy: approved" in the QA comment and proceed.

### AI generation traceability gate

**Trigger:** issue changes AI generation behavior (prompt engineering, template changes, PromptService, exercise or content types, pedagogy config files).

Check whether the ACs include an item requiring the agent to update `prior-findings.md` after merge:

```
- [ ] After PR merge, update .claude/skills/teacher-qa/output/prior-findings.md: set Fix to <what changed>, Issue to #<N> (PR #<M>), Deployed? to "Yes, merged YYYY-MM-DD"
```

- **Issue originates from a Teacher QA triage** (references a triage file or finding IDs like CQ-1, GAP-1): this item is required. If missing, route through PM to add it before approving.
- **New AI quality change not from triage**: flag to the user: "This changes AI generation behavior. Should a row be added to prior-findings.md?" If yes, add the AC item before approving.

### Visual test coverage gate

**Trigger:** issue has `area:frontend` label.

Check which screens/routes the issue will modify (from the ACs and body). For each screen:

1. Does a `@visual` spec exist in `e2e/tests/visual/` for that route?
2. Does the `DemoSeeder.cs` create the data needed for that screen to render?

Reference the screen-to-route table in `e2e/README-visual.md` (once it exists) or the route definitions in `frontend/src/App.tsx`.

- **All screens covered:** note "Visual coverage: all screens have specs and seed data" in the QA comment.
- **Gaps found:** list each gap in the QA comment:
  - `VISUAL SPEC GAP: no @visual spec for <route>`
  - `VISUAL DATA GAP: <route> needs <data> not in DemoSeeder`

  These are **non-blocking for `qa:ready`** but must be flagged so the sprint plan can sequence the work (e.g., add a prerequisite task to create the missing spec/seed, or include it in the issue scope).

## Step 5: Handle Findings

**No blocking gaps:** add `qa:ready` label and post QA comment.

**Blocking content gaps** (missing ACs, weak problem statement, scope issues, size):
Invoke the PM agent with this prompt:

```
QA has reviewed issue #<N> (<title>) and found these gaps:

<list of findings>

Issue body:
<full issue body>

For each finding:
A) ACCEPT: write the exact text to add to the issue body
B) REFUTE: explain why this is not a gap

For size findings: should this issue be split, or is it acceptable at this size?
```

Apply accepted changes via `gh issue edit <N> --body-file /tmp/issue-body.md` (write body to temp file first to avoid shell escaping issues with markdown).

**Disagreement rules:**
- Structural criteria (labels, milestone): non-negotiable regardless of PM opinion.
- Content criteria (ACs, problem statement, scope): defer to PM. If PM refutes, note it but do not block `qa:ready`.

**Structural gaps remain after PM:** post comment noting the gaps, do NOT add `qa:ready`, defer to user.

## Step 6: Post QA Comment

Post this on every reviewed issue:

```markdown
## QA Review

### Checklist
- [x] Problem statement
- [x] Acceptance criteria
- [x] Priority label
- [x] Area label(s)
- [x] Milestone
- [x] Scope
- [x] T-shirt size: <size>

### Specialist Gates
- Sophy: N/A | approved | NEEDS CLARIFICATION (questions added to body)
- AI traceability: N/A | traceability AC present | AC added
- Visual coverage: N/A | all screens covered | GAPS (list below)

### PM Coordination
(Only include if PM was consulted)
- Finding: <description> → PM: accepted / refuted (<reason>)

### Recommendations (non-blocking)
- Edge cases: <assessment>
- E2E scenario: <assessment>
- Technical approach: <assessment>

### Result
READY (labeled `qa:ready`) | NEEDS WORK (see gaps above)
```

Use `[x]` for passing criteria, `[!] <criterion>: <what's missing>` for failing criteria.

## Batch Mode

Process each issue independently. Output a summary table at the end:

```markdown
## QA Batch Review

| Issue | Title | Size | Result | Findings |
|-------|-------|------|--------|----------|
| #406 | Visual test infra | M | READY | None |
| #407 | Group classes | XL | NEEDS WORK | PM: split recommended |
```
