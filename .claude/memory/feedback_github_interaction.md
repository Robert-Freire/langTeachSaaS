---
name: GitHub interaction quirks
description: Use GitHub MCP tools (not gh CLI) by default; use search_issues with milestone wildcards for filtering; use gh CLI only for self-assignment (@me)
type: feedback
originSessionId: 16259888-ac9c-4212-80e1-8b4865a397c7
---
## Default to MCP, with quirks

Use `mcp__github__*` tools instead of `gh` bash commands for GitHub operations. Exceptions below.

### Quirk 1: filtered queries use search_issues, not list_issues
`list_issues` has no milestone filter, returns 12k+ tokens of unfiltered noise. Use `search_issues` with the milestone in the query string:
```
mcp__github__search_issues(query: 'milestone:*Student-Aware* label:qa:ready', state: "OPEN", ...)
```
One targeted call, never a broad list followed by a filter.

### Quirk 2: multi-word milestone/label names need wildcard syntax
```
milestone:*Student-Aware*       (correct)
milestone:Student-Aware Curric  (wrong: "Curriculum" becomes a separate keyword, 0 results)
```
Wildcards are always safe. Quoting with `"..."` inside query strings is fragile depending on tool serialization. Same applies to labels: `label:*bug*`.

### Quirk 3: self-assignment uses gh CLI, not MCP
For self-assigning, always use:
```bash
gh issue edit <N> --add-assignee "@me"
```
The MCP tool has no concept of `@me`. Bots tend to pass `Robert-Freire` (repo owner) instead of the bot account `robertfreirebot-stack`. Result: issues look like Robert is working on them when a bot is.

### Quirk 4: pick-task agent uses gh CLI on purpose
Don't override its instructions to use MCP. Bulk `gh issue list --json` + `jq` is cheaper than MCP for that pattern.
