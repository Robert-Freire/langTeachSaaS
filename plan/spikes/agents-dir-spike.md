# Spike: .claude/agents/ as Agent Definition Mechanism

**Issue:** #393  
**Date:** 2026-04-02  
**Status:** Complete

---

## TL;DR: Already Adopted

We already fully migrated to `.claude/agents/`. The 12 agents defined there are the exact source of the `subagent_type` values exposed in the Agent tool. This doc records findings from evaluating the feature set and identifies untapped capabilities worth adding.

---

## What We Found

### Format

Each agent is a Markdown file with YAML frontmatter:

```markdown
---
name: review
description: When to delegate to this agent (Claude reads this)
model: opus
tools: Read, Grep, Glob, Bash      # optional allowlist
disallowedTools: Write, Edit       # optional denylist
permissionMode: plan               # optional
---

System prompt goes here.
```

Only `name` and `description` are required. Full field reference: [sub-agents docs](https://code.claude.com/docs/en/sub-agents).

### Scope hierarchy

| Location | Priority | Notes |
|---|---|---|
| Managed settings | 1 (highest) | org-wide, overrides all |
| `--agents` CLI flag | 2 | session-only JSON |
| `.claude/agents/` | 3 | **this is us** |
| `~/.claude/agents/` | 4 | user-level, cross-project |
| plugin `agents/` | 5 | lowest |

### Invocation

Two modes:

1. **Subagent** (our current use): `Agent tool with subagent_type: "<name>"`. Runs in its own context window, returns a result, cannot spawn further subagents.
2. **Session agent**: `claude --agent <name>`. The whole session runs as that agent (its system prompt, tool restrictions, model). Useful for dedicated review or QA sessions.

### Relationship to subagent_type

The Agent tool's `subagent_type` parameter **directly maps to the `name` field** in `.claude/agents/` files. The agent descriptions shown in the Agent tool's built-in description are auto-generated from the `description` frontmatter fields in those files. Changing a `description` field changes what the tool shows; adding a new agent file makes it available as a new `subagent_type`.

---

## Current Usage vs Available Features

We use: `name`, `description`, `model`, system prompt body.

We do NOT use any of the following, though several are relevant:

| Field | Status | Relevance |
|---|---|---|
| `tools` | unused | Could make review agents genuinely read-only |
| `disallowedTools` | unused | Safer denylist approach for the same goal |
| `permissionMode` | unused | `plan` mode is the built-in read-only mode |
| `isolation` | unused | `worktree` gives isolated file copy per invocation |
| `skills` | unused | Inject relevant skill content into subagent context at startup |
| `memory` | unused | Persistent cross-session knowledge for review agents |
| `hooks` | unused | Lifecycle hooks scoped to this agent only |
| `mcpServers` | unused | Scope MCP servers to a specific agent |
| `maxTurns` | unused | Prevent runaway agents |
| `background` | unused | Force background execution |

---

## Test Results

Verified by running the `review` agent (subagent_type: "review") on a live PR during the pedagogical-quality sprint. It diffed correctly against the sprint branch, applied the checklist, and returned a PASS/FAIL verdict. The agent's `description` field appeared correctly in the Agent tool's parameter description. Invocation is reliable.

The `--agent review` CLI flag was also tested: it starts a full session under the review agent's system prompt. Useful for a standalone review session without launching a full subagent.

---

## Recommendation: Adopt Tool Restrictions for Review Agents

**Decision: Partial adoption enhancement.** The base mechanism is already in use. We should add `disallowedTools` to pure review agents to enforce their read-only nature as a hard constraint rather than a convention.

### Agents that should be read-only

These agents have no legitimate reason to write files:

| Agent | Proposed change |
|---|---|
| `review` | `disallowedTools: Write, Edit, NotebookEdit` |
| `architecture-reviewer` | `disallowedTools: Write, Edit, NotebookEdit` |
| `review-plan` | `disallowedTools: Write, Edit, NotebookEdit` |
| `qa-verify` | `disallowedTools: Write, Edit, NotebookEdit` |
| `pedagogy-reviewer` | `disallowedTools: Write, Edit, NotebookEdit` |
| `prompt-health-reviewer` | `disallowedTools: Write, Edit, NotebookEdit` |
| `sophy` | `disallowedTools: Write, Edit, NotebookEdit` |
| `pm` | `disallowedTools: Write, Edit, NotebookEdit` |

**Why denylist over allowlist:** allowlists require exhaustive enumeration of every tool (Read, Glob, Grep, Bash, WebFetch, WebSearch, all MCP tools, Agent...). A denylist on Write/Edit is narrower and more maintainable as new tools are added.

### The review-ui Docker boundary

The issue asked whether tool restrictions could help enforce the `review-ui` boundary. Answer: **no, not via tool restrictions.** The `review-ui` agent legitimately needs Bash to manage the Docker stack. Restricting tools would break it. The boundary is enforced by the agent's system prompt ("The agent starts and stops the e2e Docker stack itself") and by CLAUDE.md instruction not to manage the stack manually when using this agent.

### Deferred (possible future improvements)

- **`memory: project` for `review` agent**: would let it accumulate project-specific patterns across reviews (e.g., recurring issues, validated patterns). Low priority until we have more review history.
- **`isolation: worktree` for `qa-verify`**: would give it an isolated file copy, reducing risk of side effects. Add when qa-verify starts making file changes.
- **`skills` injection for `pedagogy-reviewer`**: could preload the AUTHORING.md skill directly into context rather than having the agent read it every time. Add if pedagogy-reviewer reviews get slow due to context loading.

---

## Migration Plan (for adopted changes)

1. Add `disallowedTools: Write, Edit, NotebookEdit` to the 8 agents listed above.
2. No CLAUDE.md changes needed: `subagent_type` references remain identical.
3. No skills files affected.
4. Test: run `review` agent on a PR and confirm it cannot write files.

This is a small targeted change. Tracked in issue #393.
