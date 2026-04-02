---
name: Token usage tracking
description: How to check Claude Code token consumption per session and per agent
type: reference
---

Token usage is automatically tracked via hooks and saved to `~/.claude/logs/usage-log.jsonl` (one line per session).

Full instructions and ready-to-run Python snippets are in `~/.claude/usage-guide.md`.

## Quick summary check (last session)
```bash
python3 -c "
import json
from pathlib import Path
line = Path.home().joinpath('.claude/logs/usage-log.jsonl').read_text().splitlines()[-1]
d = json.loads(line)
print('Session:', d['session_id'][:8], '|', d['start'][:16], '->', d['end'][:16])
t = d['totals']
print(f'  input={t[\"input_tokens\"]:,}  output={t[\"output_tokens\"]:,}  cache_read={t[\"cache_read_tokens\"]:,}  cache_create={t[\"cache_creation_tokens\"]:,}')
for a in d['agents']:
    at = a.get('totals', {})
    models = '/'.join(set(a.get('usage_by_model', {}).keys()))
    print(f'  {a[\"subagent_type\"]:<25} {models:<25} total={sum(at.values()):,}')
"
```

## What is tracked
- Session start/end time and CWD
- Each agent launched: name, type, start/end time, token breakdown
- Session-level totals by model
- Per-agent totals by model (input, output, cache_read, cache_creation)

## How it works
Hooks in `~/.claude/settings.json` call `~/.claude/hooks/cost-tracker.py` on:
- SessionStart, SessionEnd, PreToolUse(Agent), PostToolUse(Agent)

No LLM calls involved — pure Python parsing of transcript JSONL files.
