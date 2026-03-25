---
name: Prefer GitHub MCP over gh CLI
description: Always use mcp__github__* tools instead of gh bash commands for GitHub operations; use search_issues for filtered queries
type: feedback
---

When performing GitHub operations (viewing issues, creating PRs, adding comments, updating project boards, etc.), always use the available `mcp__github__*` MCP tools instead of running `gh` commands via Bash. The MCP tools are the preferred interface.

**Targeted queries matter.** The `list_issues` MCP tool has no milestone filter, so it returns all matching issues across every milestone (easily 12k+ tokens). When you need issues filtered by milestone, use `search_issues` instead with the milestone in the query string:

```
mcp__github__search_issues(query: 'milestone:"Student-Aware Curriculum" label:qa:ready', owner: "Robert-Freire", repo: "langTeachSaaS", state: "OPEN")
```

Never do a broad `list_issues` call followed by a second filtered query. One targeted call, not two wasteful ones.

**Exception: the `pick-task` agent uses `gh` CLI on purpose.** Do not override its instructions by adding MCP to the prompt when invoking it. The agent fetches issue bodies + does dependency checks in bulk; `gh issue list --json` with `jq` is cheaper than MCP for that pattern.
