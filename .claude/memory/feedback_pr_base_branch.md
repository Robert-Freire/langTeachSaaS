---
name: PR base branch — always target the sprint branch
description: PRs must target the active sprint branch (not main), with dependency noted in PR body if needed
type: feedback
---

When opening a PR for task work, always target the **active sprint branch** (e.g., `sprint/curriculum-personalization`), never `main` directly.

If a task depends on another task (e.g., T5 depends on T4), do NOT set the PR base to the dependency branch. Target the sprint branch and note the dependency in the PR description.

Exceptions that can target `main` directly (per CLAUDE.md):
- Non-code files (`.claude/memory/`, `.claude/skills/`, `plan/`)
- Hotfixes to production
- Infrastructure/workflow changes (with user approval)

Reason: the sprint branch workflow replaced direct-to-main PRs. The original feedback (always target main) was given before the sprint branch convention existed.
