---
name: Process changes go to agents and rules first, then sync dev-workflow doc
description: When updating bot behavior, change agent definitions and CLAUDE.md first (memory does not change behavior), then mirror to docs/dev-workflow.md
type: feedback
originSessionId: 16259888-ac9c-4212-80e1-8b4865a397c7
---
## Priority order for process changes
1. **Agent definitions** (`.claude/agents/*.md`) — what bots actually execute
2. **CLAUDE.md and procedures** (`.claude/procedures/*.md`) — rules bots read before acting
3. **docs/dev-workflow.md** — human-readable mirror
4. **Memory** — only context that doesn't fit above

Memory is a note to yourself; it does NOT change bot behavior. Writing a memory instead of updating an agent definition means the process stays broken for every future bot invocation.

**Why:** Triggered by failure to update `task-merged` agent when told sprint-branch PRs don't auto-close issues. Went to memory first instead of the agent that actually runs post-merge.

## docs/dev-workflow.md must stay in sync
Whenever you modify CLAUDE.md, `.claude/procedures/`, `.claude/agents/`, or `.claude/skills/`, also update `docs/dev-workflow.md`. It's the human-readable version of the same rules; drift between them confuses Robert and reviewers. This has been missed multiple times (sprint branch workflow, observed-issues step, agent output changes).
