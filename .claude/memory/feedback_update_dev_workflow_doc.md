---
name: Update dev-workflow.md when workflow changes
description: Any change to CLAUDE.md rules, agent definitions, or skill files must also update docs/dev-workflow.md to stay in sync
type: feedback
---

Whenever you modify workflow rules in `.claude/CLAUDE.md`, agent definitions in `.claude/agents/`, or skill files in `.claude/skills/`, also update `docs/dev-workflow.md` to reflect the change. The dev-workflow doc is the human-readable version of the same rules, and they must stay aligned.

This has been missed before (sprint branch workflow, observed-issues step, agent output changes were all added to CLAUDE.md but not to the doc).
