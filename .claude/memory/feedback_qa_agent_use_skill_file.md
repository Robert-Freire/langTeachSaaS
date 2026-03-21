---
name: QA agent must read SKILL.md, not inline prompt
description: When launching background QA agents, always reference the skill file directly instead of duplicating logic inline
type: feedback
---

## Rule

When launching a QA agent via the Agent tool, the prompt must instruct the agent to read and follow `.claude/skills/qa/SKILL.md` rather than duplicating the QA rules inline.

**Wrong (duplicates and diverges from SKILL.md):**
```
For each issue: check problem statement, AC, labels... add qa:ready if passes...
```

**Correct:**
```
Read .claude/skills/qa/SKILL.md and follow it exactly to review issues #X, #Y, #Z.
Report back: one line per issue with verdict and action taken.
```

## Why

Inline prompts diverge from the canonical skill definition. Any updates to SKILL.md (e.g. new gates like XXL/XL size rules) are invisible to agents launched with inline rules. The skill file is the single source of truth for QA logic.
