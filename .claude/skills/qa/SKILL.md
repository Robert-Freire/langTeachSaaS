---
name: qa
description: "Review GitHub issues for quality and readiness. No args: all open issues without qa:ready in current milestone. Number: specific issue. Quoted string: filter by milestone."
---

# QA Issue Review

Review GitHub issues for completeness and quality before implementation. This skill is the quality gate that decides whether an issue gets the `qa:ready` label.

## Argument Parsing

- **No arguments**: review all open issues without `qa:ready` in the current milestone
- **Number** (e.g., `75`): review a specific issue by number
- **Quoted string** (e.g., `"Demo 1 (internal)"`): review all open issues without `qa:ready` in the named milestone

## Process

### Step 1: Fetch Issues

Based on the argument:

- **Specific issue**: `gh issue view <N> --json number,title,body,labels,milestone`
- **All in milestone (no args)**: first determine current milestone from `gh milestone list`, then `gh issue list --milestone "<name>" --state open --json number,title,body,labels,milestone --limit 100`, filter out those already labeled `qa:ready`
- **Named milestone**: `gh issue list --milestone "<name>" --state open --json number,title,body,labels,milestone --limit 100`, filter out those already labeled `qa:ready`

### Step 2: Evaluate Each Issue

Apply the quality rubric to each issue.

**Must-have criteria (blocking):**

| Criterion | How to check |
|-----------|-------------|
| Problem statement | Issue body explains what changes and why (not just a title restatement). Must be at least 2-3 sentences describing the current state and desired outcome. |
| Acceptance criteria | Has a section or checklist with verifiable conditions. Look for "Acceptance Criteria", "AC", `- [ ]` checklists, or numbered requirements. Vague phrases like "should work well" or "improve the UX" do not count. |
| Priority label | Has exactly one of: `P0:blocker`, `P1:must`, `P2:should`, `P3:nice` |
| Area label | Has at least one of: `area:frontend`, `area:backend`, `area:e2e`, `area:infra`, `area:design`, `area:ai` |
| Milestone | Has a milestone assigned |
| Focused scope | Issue addresses a single concern. Multiple unrelated changes in one issue is a finding. |

**Recommended criteria (non-blocking):**

| Criterion | How to check |
|-----------|-------------|
| Edge cases | Are empty states, error conditions, or mobile considerations mentioned? |
| E2E derivable | Could you write a Playwright test from the acceptance criteria alone? |
| Technical approach | Is there a sketch of the implementation direction? |

### Step 3: Handle Findings

**If no must-have findings:**
1. Add `qa:ready` label: `gh issue edit <N> --add-label "qa:ready"`
2. Post a summary comment on the issue (see comment format below)
3. Done

**If must-have findings exist:**
1. Invoke the PM agent with the following prompt:

```
QA has reviewed issue #<N> (<title>) and found these gaps:

<list of must-have findings>

Issue body:
<full issue body>

For each finding, either:
A) ACCEPT: write the missing content and I'll update the issue
B) REFUTE: explain why this finding is not actually a gap

For accepted findings, provide the exact text to add to the issue body. For structural findings (missing labels/milestone), just confirm they should be added.
```

2. Apply PM's accepted changes:
   - For label/milestone fixes: `gh issue edit <N> --add-label "<label>"` or `gh issue edit <N> --milestone "<name>"`
   - For body content: `gh issue edit <N> --body "<updated body>"` (preserve existing content, append new sections)
3. For refuted content findings: note as "PM declined, flagged for user review" in the comment. Do NOT block `qa:ready` for PM-refuted content findings.
4. For refuted structural findings (labels, milestone): these are non-negotiable. Keep as a gap.

**QA-PM disagreement rule:**
- Structural criteria (labels, milestone) are non-negotiable regardless of PM opinion
- Content criteria (acceptance criteria quality, problem statement, scope) defer to PM. If PM refutes, note it but do not block.

### Step 4: Re-evaluate and Label

After PM coordination:
- If all remaining must-have gaps are resolved or PM-declined content: add `qa:ready` label and post comment
- If structural gaps remain: post comment noting remaining items, do NOT add `qa:ready`, defer to user

## Issue Comment Format

Post this comment on every reviewed issue:

```markdown
## QA Review

### Checklist
- [x] Problem statement (or [!] Problem statement: <what's missing>)
- [x] Acceptance criteria
- [x] Priority label
- [x] Area label(s)
- [x] Milestone
- [x] Scope

### PM Coordination
(Only include this section if PM was consulted)
- Finding: <description> -> PM: accepted/refuted (<reason>)

### Recommendations (non-blocking)
- Edge cases: <assessment>
- E2E scenario: <assessment>
- Technical approach: <assessment>

### Result
READY (labeled `qa:ready`) | NEEDS WORK (see gaps above)
```

Use `[x]` for passing criteria and `[!]` for failing criteria. If PM was not consulted (all passed), omit the PM Coordination section.

## Batch Mode

When reviewing multiple issues, process each one independently. Output a summary table at the end:

```markdown
## QA Batch Review

| Issue | Title | Result | Findings |
|-------|-------|--------|----------|
| #75 | Export PDF | READY | None |
| #101 | Group Class | NEEDS WORK | Missing AC, no area label |
```

## Important

- Never add `qa:ready` to an issue with unresolved structural gaps (missing labels or milestone)
- Be strict on acceptance criteria: "Add feature X" with no conditions is not verifiable
- Be lenient on scope for small issues (under 200 chars): a tightly scoped title can serve as both problem statement and scope if the change is genuinely small and obvious
- Do not rewrite issues yourself. Content changes go through the PM agent.
