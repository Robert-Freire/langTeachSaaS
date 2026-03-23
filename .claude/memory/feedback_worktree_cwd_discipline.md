---
name: Worktree CWD discipline
description: Agents must use worktree paths for all file edits and commands, never the main repo absolute path. Observed failure: agent memorizes project root from initial context and defaults to it instead of the worktree CWD.
type: feedback
---

When working inside a worktree, **all file edits and bash commands must use the worktree path**, not the main repo path.

**Failure pattern observed (task #202):** The agent created a worktree at `.claude/worktrees/task-t202-teacher-qa-triage/` and wrote plan files there correctly, but when it started running Playwright tests and fixing selectors, it used absolute paths to the main repo (`/c/ws/PersonalOS/03_Workspace/langTeachSaaS/.claude/skills/...`) instead of the worktree path. All edits landed in the main repo's working tree, polluting the sprint branch with uncommitted changes.

**Root cause:** The agent "knows" the project root from initial context and defaults to it, especially when constructing `cd` commands or using tool paths.

**Rule:** After entering a worktree, verify that your CWD and all absolute paths point to the worktree directory before editing files or running commands. If using absolute paths, they must start with the worktree root (e.g., `.claude/worktrees/task-xxx/`), not the main repo root.

**Rebase conflict resolution rule:** When rebasing a task branch onto sprint and plan/backlog files conflict, **merge both sides** (not `--theirs`). These files are additive — both sides likely have valid entries and accepting only one side loses content. Use `--theirs` only for generated or compiled files where only one authoritative version should exist.
