---
name: Self-assign issues via gh CLI only
description: Always use gh CLI for self-assignment, never the MCP tool — MCP doesn't support @me and picks the wrong account
type: feedback
---

## The Rule

When self-assigning an issue, always use the gh CLI:
```bash
gh issue edit <number> --add-assignee "@me"
```

Never use `mcp__github__issue_write` with `assignees` for self-assignment. The MCP tool requires an explicit username and bots tend to pass `Robert-Freire` (the repo owner) instead of `robertfreirebot-stack` (the bot account).

## Why

The active gh CLI account is `robertfreirebot-stack`. The `@me` token resolves correctly to the bot. The MCP tool has no concept of `@me` and needs a hardcoded username, which is error-prone.

## Result of Getting This Wrong

Issues end up assigned to Robert-Freire instead of the bot, making it look like Robert is working on something when a bot is.
