---
name: Dev workflow overview document
description: Human-readable explanation of the full dev loop at docs/dev-workflow.md; must be updated whenever CLAUDE.md workflow rules change
type: reference
---

## File

`docs/dev-workflow.md`

## Purpose

Explains the end-to-end development process (idea to merged PR) for a non-technical or new audience. Robert uses it to explain the system to others.

## Maintenance rule

Whenever a workflow rule changes in `.claude/CLAUDE.md`, `.claude/agents/`, or `.claude/skills/sprint-qa/SKILL.md`, check if `docs/dev-workflow.md` needs a corresponding update to stay accurate. The doc is the "public-facing" version of the rules; CLAUDE.md is the machine-enforced version.
