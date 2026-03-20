---
name: Agent transcript location
description: Where to find subagent reasoning logs (JSONL transcripts) when user asks about agent status or progress
type: reference
---

## Subagent Transcript Files

When the user asks about the status or progress of a running/completed agent (e.g., review-ui, qa-verify, review), the reasoning log is stored at:

```
~/.claude/projects/<project-dir>/<session-id>/subagents/agent-<agent-id>.jsonl
```

**How to find the right file:**
1. Identify the worktree the agent is running in (e.g., `task-t136-capitalize-dropdowns`)
2. Map it to the project directory: `~/.claude/projects/C--ws-PersonalOS-03-Workspace-langTeachSaaS--claude-worktrees-<worktree-name>/`
3. Inside, there's a session UUID folder, then `subagents/` with `.jsonl` files
4. The largest/most recently modified `.jsonl` file is typically the main agent transcript

**JSONL structure:**
- Each line is a JSON object with keys: `parentUuid`, `type`, `message`, `sessionId`, `agentId`, etc.
- `type: "assistant"` entries have a `message.content` array with `text`, `tool_use`, or `thinking` blocks
- `type: "user"` entries contain tool results
- `type: "progress"` entries are status updates
- Must be read with `encoding='utf-8'` on Windows

**Quick status check command:**
```python
python3 -c "
import json
path = '<path-to-jsonl>'
with open(path, encoding='utf-8') as f:
    lines = f.readlines()
for line in lines[-20:]:
    obj = json.loads(line.strip())
    msg = obj.get('message', {})
    if msg.get('role') == 'assistant':
        for c in msg.get('content', []):
            if isinstance(c, dict) and c.get('type') == 'text':
                print(c['text'][:500])
"
```
