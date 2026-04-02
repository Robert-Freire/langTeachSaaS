# Spike: PermissionRequest Hook for Async Approval Routing

**Date:** 2026-04-02
**Issue:** #394
**Status:** Complete

## Summary

Claude Code exposes a `PermissionRequest` hook that fires before any sensitive tool
execution. This spike documents the hook mechanics, compares available approaches for
routing approvals to a phone, builds a minimal working prototype, and recommends whether
to wire this into our standard agent lifecycle.

---

## 1. Hook Mechanics

### What fires the hook
The hook fires when Claude Code is about to call a tool that requires approval under the
current permission mode. In `default` mode (no `--dangerously-skip-permissions`), Bash
commands, file writes, and other sensitive tools trigger it unless already auto-approved
by the user's settings.

### Input schema (passed to hook via stdin as JSON)
```json
{
  "session_id": "abc123",
  "hook_event_name": "PermissionRequest",
  "tool_name": "Bash",
  "tool_input": {
    "command": "git push --force origin main"
  },
  "permission_suggestions": []
}
```

Key fields:
- `tool_name`: which tool is being called (`Bash`, `Edit`, `Write`, etc.)
- `tool_input`: the full arguments that would be passed to the tool
- `session_id`: identifies the Claude Code session

### Response format (stdout JSON from hook)
```json
{
  "behavior": "allow"
}
```
or
```json
{
  "behavior": "deny",
  "message": "Destructive push to main rejected. Requires manual approval.",
  "interrupt": true
}
```

Key response fields:
- `behavior` (required): `"allow"` or `"deny"`
- `message`: shown to Claude on denial (optional but useful)
- `interrupt`: if `true`, stops the entire agent session (not just this tool call)
- `updatedInput`: mutates tool args before execution (allow only -- useful for
  sanitizing commands)
- `updatedPermissions`: adds permission grants to the session (allow only)

### Configuration in settings.json
```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/permission-logger.sh"
          }
        ]
      }
    ]
  }
}
```

`matcher` supports tool names (`"Bash"`, `"Edit"`) or `""` to match all tools.
`type` can be `"command"` (local script) or `"http"` (external endpoint with `url`,
`timeout`, `headers`).

---

## 2. Approach Comparison: HTTP Hook vs Channels vs Remote Control

| Approach | What it does | Phone approval? | Effort |
|---|---|---|---|
| **HTTP hook** | Calls a local or remote endpoint; returns allow/deny | Yes, with a custom server | Medium: need a web server that blocks until you respond |
| **Channels** | MCP bridge to Telegram/Discord/iMessage; two-way dialogue | Yes, natively | Low: config only, no server code |
| **Remote Control** | Mirrors the Claude Code UI to claude.ai/code | Effectively yes | Low: built-in feature, no hook code |

### HTTP hook
The hook process must return synchronously (Claude blocks until it exits). For phone
approval you need to either:
a) Have the hook POST to a server, then long-poll or SSE until a response comes back, or
b) Use a messaging API (Telegram bot) and block the hook script while waiting for a reply

This works but requires infrastructure: a relay server or a Telegram bot with a webhook
that writes back to a queue the hook script polls.

### Channels (recommended for remote approval)
The Channels feature is a first-class MCP server that bridges Claude Code to Telegram,
Discord, or iMessage. It has built-in permission relay:

1. Configure the channel in `~/.claude/settings.json` under `mcpServers`
2. Claude sends a message: "approve `yes a1b2c` / deny `no a1b2c`?"
3. You reply `yes a1b2c` from your phone
4. Claude proceeds

Request IDs are 5 lowercase letters (no `l` to avoid phone OCR errors). Sender gating
ensures only your account can approve. No custom server needed.

### Remote Control
Not what we need. Remote Control lets you control an existing Claude Code session from
another device via the Claude app UI. It mirrors the interactive prompt -- you type
commands, see output. It does NOT route permission prompts to your phone automatically.
It is useful for: resuming in-progress work from a different device.

---

## 3. Stop Hook

The `Stop` hook fires when Claude finishes responding (naturally or after an error). It
receives:
```json
{
  "hook_event_name": "Stop",
  "session_id": "...",
  "stop_hook_active": false
}
```

Response: `{ "decision": "block", "reason": "..." }` prevents Claude from stopping.
This is the mechanism for auto-resume: if a background agent stalls (permission denied,
unexpected error), a Stop hook could re-invoke Claude with a recovery prompt.

Use case for us: if an overnight cron agent hits a permission wall and gets denied +
interrupted, the Stop hook could log the failure and notify us so we can intervene.

---

## 4. Prototype

A minimal prototype is at `.claude/hooks/permission-logger.sh`. It:
1. Reads the JSON from stdin
2. Logs it to `~/.claude/logs/permission-requests.log` with a timestamp
3. Returns `{ "behavior": "allow" }` unconditionally

This proves the hook fires and shows what data arrives. It is safe for local use (always
allows) and useful for building intuition about which tool calls trigger it.

**To register it:** add to `~/.claude/settings.json`:
```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/permission-logger.sh"
          }
        ]
      }
    ]
  }
}
```

**To test it:** run any Claude Code command in a non-dangerously-skip-permissions session
that involves a Bash or file write tool. Then check `~/.claude/logs/permission-requests.log`.

---

## 5. Evaluation: Fit for Our Workflow

### Agents that would benefit
- **PR monitoring cron** (`/loop` or `/schedule`): runs overnight, hits push or merge
  actions. Today it blocks waiting for approval. With a Channel or Stop hook it could
  notify and wait asynchronously, or auto-resume after a set delay.
- **Overnight batch work**: same pattern. Long-running agents that hit destructive ops
  (git reset, force push) stall silently today.

### Recommendation
1. **Short term:** wire the Channels feature (Telegram or iMessage) for phone-based
   approval. No server needed, low risk, immediately useful for the PR cron and any
   overnight task. Config change only.
2. **Medium term:** add a logging-only `PermissionRequest` hook to all agent sessions so
   we have an audit trail of what was auto-approved vs. blocked. Useful for debugging
   silent stalls.
3. **Stop hook:** add alongside PermissionRequest. Fires on unexpected stop; logs session
   ID and last tool to `~/.claude/logs/stops.log`. This closes the observability gap for
   stalled agents.
4. **Do NOT wire a blocking HTTP hook** for real approval until a relay server exists.
   The synchronous blocking behavior means any network hiccup stalls the agent.

### Issues to open (if we proceed)
- Wire Telegram/iMessage Channel for permission relay (config-only change, no code PR)
- Add Stop hook logging to cron agent sessions
- Consider wrapping destructive git ops in an "unsafe actions" matcher so only those
  go to phone approval, not every Bash call

---

## 6. Telegram Setup (Recommended Path)

Telegram via Claude Code's native Channels feature is the easiest phone-based approval
path. No relay server, no ngrok, no Twilio account -- config only.

### One-time setup (2 minutes)

**Step 1: Create a Telegram bot**

1. Open Telegram, search for `@BotFather`
2. Send `/newbot` and follow the prompts (pick a name and username)
3. BotFather returns a bot token like `7123456789:AAF...` -- save it
4. Start a chat with your new bot (tap "Start") so it can message you
5. Message `@userinfobot` to get your personal chat ID (a number like `123456789`)

**Step 2: Add to `~/.claude/settings.json`**

```json
{
  "mcpServers": {
    "claude-channels": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/claude-channels"],
      "env": {
        "CLAUDE_CHANNELS_TELEGRAM_BOT_TOKEN": "your-bot-token",
        "CLAUDE_CHANNELS_TELEGRAM_CHAT_ID": "your-chat-id"
      }
    }
  }
}
```

That's it. Restart Claude Code for the MCP server to load.

### How approval works at runtime

When Claude hits a permission prompt, your phone receives a Telegram message:

```
Claude wants to run Bash:
git push --force origin main

Reply: yes a1b2c / no a1b2c
```

Reply `yes a1b2c` to allow or `no a1b2c` to deny. Request IDs are 5 lowercase letters
(no `l` to avoid phone OCR errors). Only your registered chat ID can approve -- sender
gating is built in.

### Notes
- Channels is a first-class MCP server maintained by Anthropic (`@anthropic-ai/claude-channels`)
- iMessage works the same way on Mac (different env keys); not available on Windows
- Discord is also supported if you prefer it over Telegram
- For our workflow: scope the matcher to destructive ops only (force push, reset --hard)
  so routine Bash calls don't spam your phone

---

## References
- Official hooks docs: `https://docs.anthropic.com/en/docs/claude-code/hooks`
- Channels reference: `https://docs.anthropic.com/en/docs/claude-code/channels`
- Boris Cherny tips: `https://github.com/shanraisshan/claude-code-best-practice/blob/main/tips/claude-boris-15-tips-30-mar-26.md`
