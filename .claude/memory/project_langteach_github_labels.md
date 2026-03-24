---
name: LangTeach GitHub label taxonomy
description: Complete label system for GitHub Issues with colors, meanings, and usage rules
type: project
---

## Label Taxonomy (created 2026-03-19)

### Priority Labels (mutually exclusive, every issue gets exactly one)

| Label | Color | Hex | Meaning |
|-------|-------|-----|---------|
| `P0:blocker` | Red | #B60205 | Blocks current demo/milestone or breaks existing functionality. Drop everything. |
| `P1:must` | Orange | #D93F0B | Required for current milestone. Must be done before milestone closes. |
| `P2:should` | Yellow | #FBCA04 | Improves quality. Do if time allows within the milestone, otherwise rolls to next. |
| `P3:nice` | Green | #0E8A16 | Backlog/future. Good idea, no urgency. |

### Area Labels (can stack, at least one per issue)

| Label | Color | Hex | Meaning |
|-------|-------|-----|---------|
| `area:frontend` | Blue | #1D76DB | React, Vite, Tailwind, shadcn/ui, frontend components |
| `area:backend` | Purple | #5319E7 | .NET API, EF Core, controllers, services |
| `area:e2e` | Dark teal | #006B75 | Playwright e2e tests, test infrastructure |
| `area:infra` | Light blue | #BFD4F2 | CI/CD, Docker, Azure, Bicep, GitHub Actions |
| `area:design` | Lavender | #D4C5F9 | UX/UI design, layout, visual polish |
| `area:ai` | Peach | #F9D0C4 | AI generation, Claude API, prompts, content types |

### Type Labels (optional, for non-obvious categorization)

| Label | Color | Hex | Meaning |
|-------|-------|-----|---------|
| `bug` | Red | #d73a4a | Something is broken (GitHub default, kept) |
| `enhancement` | Teal | #a2eeef | New feature or capability (GitHub default, kept) |
| `type:polish` | Light blue | #C5DEF5 | UX improvements, loading states, visual fixes, empty states |
| `type:tech-debt` | Lavender | #D4C5F9 | Refactoring, cleanup, test improvements, no user-visible change |

### Workflow Labels (process markers)

| Label | Color | Hex | Meaning |
|-------|-------|-----|---------|
| `qa:ready` | Dark blue | #0052CC | Issue passed QA quality gate (Checkpoint 1): acceptance criteria are specific, testable, and complete. Agent can pick this up. |
| `demo-sprint` | Gold | #FFCC00 | Part of the current demo sprint scope. |
| `sprint:active` | Purple | #7057FF | **Deprecated.** Was used for sprint board filtering, but milestones work correctly for this purpose. Still exists on old issues but no longer added to new ones. |

### Deleted Default Labels

These GitHub defaults were removed as they don't fit the workflow:
`documentation`, `duplicate`, `good first issue`, `help wanted`, `invalid`, `question`, `wontfix`

### Usage Rules

1. Every issue gets exactly ONE priority label.
2. Every issue gets at least ONE area label.
3. `bug` or `enhancement` are optional type classifiers.
4. `qa:ready` is added by the QA reviewer agent (or manually) after acceptance criteria pass review.
5. `demo-sprint` is added to issues scoped into the current demo checkpoint.
