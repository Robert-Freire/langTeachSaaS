---
name: Backlog files for deferred findings
description: Three backlog files that accumulate during sprints; PM reviews at sprint end or when user says "check backlogs"
type: reference
---

When the user asks to "check backlogs" or "review backlog logs", read all three files:

| File | Contents | Source |
|------|----------|--------|
| `plan/code-review-backlog.md` | Unfixed findings from the `review` agent (code quality, conventions) | Code review step in Task Completion Protocol |
| `plan/ui-review-backlog.md` | Unfixed findings from the `review-ui` agent (visual/UX issues) | UI review step in Task Completion Protocol |
| `plan/observed-issues.md` | Out-of-scope observations agents noticed during implementation | Implementation step in Task Completion Protocol |

At sprint end, the PM batches related items into `type:polish` or `type:tech-debt` GitHub issues. Items are never converted one-to-one into issues.
