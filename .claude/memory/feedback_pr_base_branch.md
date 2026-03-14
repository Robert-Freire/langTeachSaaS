---
name: PR base branch — always target main
description: PRs must always target main, even when a task depends on a prior task branch
type: feedback
---

When a task depends on another task (e.g. T5 depends on T4), do NOT set the PR base to the dependency branch.

Always open PRs against `main`.

If the dependency branch is not yet merged, note it in the PR description and remind the user to merge T4 first — but still target `main`.

Reason: this mistake has happened twice. Setting the base to a feature branch means the PR must be manually retargeted after the dependency is merged, causing extra friction.
