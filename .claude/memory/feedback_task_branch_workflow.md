---
name: Task start workflow — pull and branch
description: Before starting any task, always pull latest main and create the feature branch from it
type: feedback
---

Before starting implementation on any task:
1. `git fetch origin && git checkout main && git pull origin main`
2. `git checkout -b task/t<N>-<short-description>`

Never start a task on an outdated local main or on a leftover branch from a previous session.
