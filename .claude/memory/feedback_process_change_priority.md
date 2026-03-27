---
name: Process changes go to agents and rules first, not memory
description: When updating how bots work, change agent definitions and CLAUDE.md first; memory is not a substitute for fixing the actual process
type: feedback
---

When told to update a process, the correct priority order is:

1. Agent definitions (`.claude/agents/*.md`) - what bots actually execute
2. CLAUDE.md - the rules bots read before acting
3. docs/dev-workflow.md - human-readable documentation
4. Memory - only for context that doesn't fit in the above

Memory is a note to yourself. It does not change bot behavior. Writing a memory instead of updating an agent definition means the process stays broken for every future bot invocation.

Triggered by: failing to update `task-merged` agent when told sprint-branch PRs don't auto-close issues. Went to memory first instead of the agent that actually runs post-merge.
