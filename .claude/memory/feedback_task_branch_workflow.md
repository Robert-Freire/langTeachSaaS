---
name: Task start workflow — worktree-first, plan inside worktree
description: Always use EnterWorktree for ALL task work including planning; verify dependencies merged, pull main first
type: feedback
---

Before starting any task (including planning):

1. Check that all dependency tasks are merged to main:
   `git branch -r --merged origin/main | grep task/t<dep>`
   If the dependency branch is NOT merged, stop and tell the user: "T<N> isn't merged yet, please merge it and I'll start from a clean main."

2. Pull latest main:
   `git fetch origin && git checkout main && git pull origin main`

3. Enter a worktree using the `EnterWorktree` tool with `name: "task-t<N>-<short-description>"`.
   This creates an isolated copy of the repo with its own branch. The main directory stays clean.

4. **Inside the worktree:** Write the detailed task plan file (e.g. `plan/langteach-beta/task21-export-pdf.md`) with
   step-by-step implementation, file list, and verification checklist. The high-level description
   in `plan.md` is NOT sufficient, a dedicated task file is required before moving on.

5. **Inside the worktree:** Run `/review-plan` (pass the task file path as argument) to validate the plan against the
   actual codebase. Fix any MAJOR GAPS or NEEDS REVISION findings before writing any code.

6. **Inside the worktree:** Implement, test, commit, push, open PR.

The entire task lifecycle (plan, review-plan, implement, test, PR) happens inside the worktree. Never work directly in the main repo directory.

Never create stacked branches (branching off an unmerged feature branch). Every task branch comes off main. Every PR targets main.

## E2E Test Isolation

When multiple agents work in parallel, each must use a unique Docker project name for e2e tests to avoid conflicts:
```bash
docker compose -f docker-compose.e2e.yml --project-name langteachsaas-e2e-<worktree-name> --env-file .env.e2e --profile test up --build --exit-code-from playwright
```

## Pre-push: code review step required

After committing and passing all pre-push checks, run `/review` before pushing.
Use the Skill tool: `Skill("review")`, do NOT delegate this to a subagent or Agent call.
- Verdict **FAIL**: fix all critical issues, re-commit, re-run checks and review.
- Verdict **PASS WITH NOTES**: address important items where reasonable, then push.
- Verdict **PASS**: push immediately.

This is step 4 in the task completion protocol in `.claude/CLAUDE.md`.

Reason: worktrees keep the main directory clean, prevent accidental work on the wrong branch, and enable parallel agent work. Stacked branches require PR retargeting after the dependency merges, which has caused friction twice.

## After PR is merged

Use `ExitWorktree(action: "remove")` to clean up the worktree and its branch.

## PR Body Must Include Issue Close Link

Always include `Closes #N` in the PR body when a task has a corresponding GitHub issue.
This auto-closes the issue the moment the PR is merged, the user only needs to approve and merge, nothing else.
