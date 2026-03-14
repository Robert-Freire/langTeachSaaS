---
name: Task start workflow — branch from main, check dependencies merged
description: Before starting any task, verify dependencies are merged to main, then branch from main
type: feedback
---

Before starting implementation on any task:

1. Check that all dependency tasks are merged to main:
   `git branch -r --merged origin/main | grep task/t<dep>`
   If the dependency branch is NOT merged, stop and tell the user: "T<N> isn't merged yet — please merge it and I'll start from a clean main."

2. Pull latest main and create the feature branch from it:
   `git fetch origin && git checkout main && git pull origin main`
   `git checkout -b task/t<N>-<short-description>`

Never create stacked branches (branching off an unmerged feature branch). Every task branch comes off main. Every PR targets main.

Reason: stacked branches require PR retargeting after the dependency merges, which has caused friction twice. The user reviews and merges PRs — waiting for that merge before starting the next task is the intended workflow.
