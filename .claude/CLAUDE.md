# LangTeach SaaS -- Project Rules

## Worktree-First Workflow

**All task work MUST happen inside a git worktree.** Planning, implementation, testing, PR, all of it.

Before starting any task:
1. `git fetch origin && git checkout sprint/<slug> && git pull origin sprint/<slug>`. If sprint branch missing: STOP, ask user.
2. `EnterWorktree` with `name: "task-t<N>-<short-description>"`. Post-creation hook handles env files + `npm ci` + `dotnet restore`. Then `git merge origin/sprint/<slug> --no-edit`.
3. Write plan inside worktree at `plan/langteach-beta/task<N>-<short-description>.md`.
4. Run `review-plan` agent. Revision flow, infra-gap rule, architectural-decision rule: see `.claude/procedures/worktree-workflow.md`. Once approved, implement; do NOT ask user for plan approval.
5. Implement, test, commit, push, open PR **targeting the sprint branch**.
6. After PR merged: `python3 .claude/scripts/task-merged.py <N>`, then `ExitWorktree(action: "remove")`.

Never work directly in the main repo directory for task work.

## E2E Stack Coordination

See `.claude/procedures/e2e-stack.md` when starting the e2e stack directly. Does NOT apply to the `review-ui` agent (manages its own stack).

## Sprint Branch Workflow

All feature work targets the active sprint branch, never main directly. Hierarchy: `main` ← `sprint/<slug>` ← `task/t<N>-*`.

- Active sprint branch name: check `.claude/memory/project_langteach_task_status.md`. Never guess.
- Main only advances via the `merge-sprint-to-main` GitHub Action (Robert triggers).
- Full lifecycle: `.claude/procedures/sprint-lifecycle.md`.

### Exceptions (can target main directly)

- Non-code: `.claude/memory/`, `.claude/skills/`, `plan/`.
- Hotfixes: branch from main, PR to main.
- Infra/workflow changes: require user approval.

After any direct push to main: `git checkout sprint/<slug> && git merge main && git push origin sprint/<slug>`.

## Task Source: GitHub Issues

GitHub Issues is the single source of truth. Run `python3 .claude/scripts/task-pick.py` (from repo root) to find the next task.

- Issues need `qa:ready` before implementation.
- If milestone doesn't match active sprint: STOP, ask user.
- Self-assign on pick: `gh issue edit <N> --add-assignee "@me"`.
- **At most one `area:frontend` task in flight.** Docker frontend is fixed port (5173); concurrent frontend worktrees conflict.
- Chrome extension for UI work: launch with `claude --chrome` for live visual feedback. Does NOT replace Playwright e2e or `review-ui`. Setup: `docs/dev-workflow.md`.
- UI/UX standards: `docs/design-system.md` is authoritative (visual + interaction patterns). Read before any frontend screen.

Issue creation, editing, board management, labels: `.claude/procedures/issue-management.md`.

## Review Tools: Always Use Agents

Reviews are invoked as **agents** (Agent tool with `subagent_type`), never as skills.

## Task Completion Protocol

1. Stage and commit all changes (incl. `.claude/memory/`, `plan/`) referencing the task.
2. `python3 .claude/scripts/task-build-verify.py <worktree-path>`. Fix all failures/warnings.
3. `qa-verify` agent. FAIL or PASS WITH GAPS: fix, re-commit, re-run.
4. Code reviews **sequentially** (no parallel background agents). Before launching: check issue labels (`gh issue view <N> --json labels`) + diff to determine required reviewers per `.claude/procedures/review-routing.md`. Run all of them, including conditional ones.
5. **UI Review (before pushing):** required if issue has `area:frontend` OR `area:design`. Launch `review-ui` agent with specific routes/screens changed. Agent manages its own Docker stack. NEEDS WORK: fix, re-run, re-review. Log unfixed findings to `plan/ui-review-backlog.md`. For screens with student data, consult `.claude/procedures/review-ui-scenarios.md` and pass scenario student name(s).

   **Trivial-frontend exemption.** May skip `review-ui` if **all** apply: diff <20 lines, single file, CSS/styling-only (no component logic, no new elements, no state changes). Rely on CodeRabbit + dev-server smoke check instead. **When skipping, you MUST append a row to `plan/ui-review-skipped.md`** (`| #<issue> | <date> | <PR> | <one-line: what changed and why review-ui was skipped> |`). The sprint-close procedure audits this log.
6. Log out-of-scope observations to `plan/observed-issues.md`: `| #<issue> | <date> | <severity> | <one-line> |`.
7. Conflict check: `git fetch origin && git merge --no-commit --no-ff origin/sprint/<slug> && git merge --abort`. Resolve if needed.
8. Push, open PR against sprint branch. Post `@coderabbitai review` comment.
9. `python3 .claude/scripts/task-pr-check.py <PR_NUMBER>` once. Dismissed CodeRabbit findings (out-of-scope/pre-existing) → `plan/observed-issues.md`. Then stop.
10. **Final summary to user:** PR link + one consolidated table (`Reviewer | Finding | Action`) covering every finding from every reviewer (qa-verify, code review, architecture, prompt-health, pedagogy, Sophy, UI review, CodeRabbit). Action = **Fixed**, **Deferred** (with issue #), or **Dismissed** (with reason). Then stop. Do NOT merge; user merges manually.

**Branch protection:** `task/*` push freely; `sprint/*` PR only; `main` never push directly.

## Plan Storage

Path: see `project_langteach_plans.md` memory. Each plan in its own subfolder (never root). Multi-task features: all task files in the **same** feature subfolder (`task1-*.md`, `task2-*.md`).

**Per-task plans are gitignored** (`plan/**/task*-*.md`, `plan/**/t[0-9]*-*.md`). They exist in the worktree, `review-plan` reads them locally, and they vanish when the worktree is removed after merge. Do NOT try to commit task plans; the "why" lives in the PR description and code, not in a stale plan file. Cross-task documents (sprint scopes, design notes, behavior docs, backlogs) stay tracked as before.

## Shell

Bash tool = bash in WSL Ubuntu (Linux). Standard Unix commands throughout.

## Context & Subagents

- Under ~50k context: prefer inline for tasks under ~5 tool calls. Over ~50k: prefer subagents even for simple self-contained tasks.
- All review/task agents run **sequentially in foreground**. Never `run_in_background: true` for them (notifications unreliable).
- Subagent prompts must include: "Final response under 2000 characters. List outcomes, not process."
- Never call `TaskOutput` twice for the same subagent. If timeout, increase the timeout.
- Never re-read a file already read this session (applies to subagents too).
- Glob before Read when path uncertain.

## Response Style

- Never use em dashes (--) or en dashes (-) in responses or generated files. Use commas, parentheses, or restructure.
