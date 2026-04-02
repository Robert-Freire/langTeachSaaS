# Task 394 Plan: PermissionRequest Hook Spike

## Goal

Investigate Claude Code's `PermissionRequest` hook for async approval routing. Understand
the hook schema, prototype a minimal working implementation, and evaluate fit for our
unattended agent workflows (PR monitoring cron, overnight batch tasks).

## What We Learned in Pre-Research

**PermissionRequest hook input schema:**
```json
{
  "session_id": "...",
  "hook_event_name": "PermissionRequest",
  "tool_name": "Bash",
  "tool_input": { "command": "..." },
  "permission_suggestions": [...]
}
```

**Response format (HTTP hook):**
- `behavior: "allow"` or `behavior: "deny"` (required)
- `message`: explanation (deny only)
- `interrupt: true`: stops Claude immediately (deny only)
- `updatedInput`: modify tool args before execution (allow only)

**Config example (settings.json):**
```json
{
  "hooks": {
    "PermissionRequest": [{
      "matcher": "Bash",
      "hooks": [{ "type": "http", "url": "http://localhost:8080/hook", "timeout": 30 }]
    }]
  }
}
```

**Remote Control:** Unrelated to permission hooks. It mirrors the UI to claude.ai/code for
remote session control. Not what we need.

**Stop hook:** Fires when Claude finishes responding. `decision: "block"` prevents stopping.
Could be used to auto-resume stalled agents.

**Channels feature:** Two-way MCP bridge to Telegram/Discord/iMessage. Has built-in
permission relay: bot asks "approve? yes/no", you reply `yes <request_id>`. This is likely
a better fit than a raw HTTP hook for phone-based approval.

## Implementation Steps

### Step 1: Write findings doc
File: `plan/spikes/permission-hook-spike.md`

Cover:
- Hook mechanics (schema, response format, config)
- Remote Control vs. Channels vs. raw HTTP hook comparison
- Stop hook mechanics
- Recommendation on which approach fits our workflow

### Step 2: Build minimal prototype
File: `.claude/hooks/permission-logger.sh` (or `.py`)

Simplest viable prototype: a script that logs every permission request to a file, then
returns `behavior: "allow"`. This proves the hook fires.

Register it in `~/.claude/settings.json` for the `PermissionRequest` event with a
`Bash` matcher.

Manual test: run any Claude Code command that triggers a Bash tool call. Verify the log
file gets an entry.

### Step 3: Evaluate and recommend
Based on findings, answer:
- Which agents benefit most? (PR monitoring cron, overnight batch)
- HTTP hook vs. Channels: which is simpler to wire up for phone approval?
- Is the Stop hook worth adding alongside PermissionRequest?

## Acceptance Criteria

- [ ] `plan/spikes/permission-hook-spike.md` written with findings + recommendation
- [ ] Minimal prototype works (log file gets entries when hook fires)
- [ ] Recommendation on whether to wire into standard agent lifecycle

## Notes

- No production changes. This is personal exploration.
- The prototype goes in `.claude/hooks/` (not the repo src/), so it is personal config.
- Target branch: main (non-code files exception per CLAUDE.md).
