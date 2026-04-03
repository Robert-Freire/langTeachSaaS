---
name: Always add issues to the project board when setting a milestone
description: Every issue assigned to a milestone MUST be added to the LangTeach Roadmap board in the same step. Never set milestone without board.
type: feedback
---

## The Rule

**Milestone and board are a single atomic operation.** Every time you create an issue with a milestone, move an issue to a milestone, or update an issue's milestone, you MUST also add it to the LangTeach Roadmap board. No exceptions. Do both in the same set of tool calls.

Board project ID: `PVT_kwHOAF1Pks4BSLsS`

Steps:
1. Set the milestone (via `mcp__github__issue_write` or `gh issue edit`)
2. Get the issue node ID: `gh api graphql -f query='{ repository(owner:"Robert-Freire", name:"langTeachSaaS") { issue(number:N) { id } } }'`
3. Add to board: `gh api graphql -f query='mutation { addProjectV2ItemById(input: {projectId: "PVT_kwHOAF1Pks4BSLsS", contentId: "NODE_ID"}) { item { id } } }'`

## Why

This has been flagged multiple times (2026-03-27, 2026-04-03). Issues with a milestone but not on the board are invisible in the sprint view. Bots and humans both use the board to find work. An issue not on the board is effectively lost.

**How to apply:** Treat "set milestone" and "add to board" as inseparable. If you're writing code that sets a milestone, the next line adds to board. Never report an issue as "moved to milestone X" without confirming it's on the board.
