# LangTeach SaaS -- Project Rules

## Worktree-First Workflow

**All task work MUST happen inside a git worktree.** This includes planning, plan review, implementation, testing, and PR creation.

Before starting any task:
1. `git fetch origin` and check out the **active sprint branch**: `git checkout sprint/<slug> && git pull origin sprint/<slug>`
   - **If the sprint branch does not exist yet**: STOP and ask the user.
2. `EnterWorktree` with `name: "task-t<N>-<short-description>"`
   - A post-creation hook copies env files and runs `npm ci` + `dotnet restore`.
   - **Immediately after creation**, run `git merge origin/sprint/<slug> --no-edit` to sync.
3. Write the task plan **inside the worktree** at `plan/langteach-beta/task<N>-<short-description>.md`
4. Run the `review-plan` agent (`subagent_type: "review-plan"`). If NEEDS REVISION:
   - Critically evaluate findings. Fix valid ones, note disagreements in the plan.
   - Escalate to user only after 2 failed rounds on architectural disagreements.
   - **Once approved, proceed to implementation. Do NOT ask the user for plan approval.**
5. Implement, test, commit, push, open PR **targeting the sprint branch**
6. After PR is merged, run the `task-merged` agent, then `ExitWorktree(action: "remove")`

Never work directly in the main repo directory for task work.

## Git Bash Path Mangling (Windows)

Git Bash auto-translates Unix paths to Windows paths, breaking `docker exec`. **Always prefix with `MSYS_NO_PATHCONV=1`:**
```bash
MSYS_NO_PATHCONV=1 docker exec container-name /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "pass" -Q "SELECT 1"
```

## E2E Stack Coordination

See `.claude/procedures/e2e-stack.md` when starting the e2e stack directly. Does **NOT** apply when launching the `review-ui` agent (it manages its own stack).

## Sprint Branch Workflow

**All feature work targets the active sprint branch, never main directly.**

```
main (deploys to Azure, advances only via merge action)
  └── sprint/<slug> (integration branch, agents PR here)
        └── task/t<N>-<description> (feature branches from worktrees)
```

- Check `.claude/memory/project_langteach_task_status.md` for the current sprint branch name. Never guess.
- Main only advances when Robert triggers the `merge-sprint-to-main` GitHub Action.
- Full lifecycle (start, close, next sprint): see `.claude/procedures/sprint-lifecycle.md`.

### Exceptions (can target main directly)

- **Non-code files**: `.claude/memory/`, `.claude/skills/`, `plan/` can push directly to `main`.
- **Hotfixes**: branch from `main`, PR to `main`.
- **Infrastructure/workflow changes**: require user approval.

**After any direct push to main**, sync the sprint branch:
```bash
git checkout sprint/<slug> && git merge main && git push origin sprint/<slug>
```

## Task Source: GitHub Issues

GitHub Issues is the single source of truth. Use the `task-pick` agent to find the next task. Key rules:
- Issues must have `qa:ready` before implementation starts.
- **If milestone doesn't match active sprint**: STOP and ask the user.
- **Self-assign immediately** when picking: `gh issue edit <N> --add-assignee "@me"`

For issue creation, editing, board management, and labels: see `.claude/procedures/issue-management.md`.

## Review Tools: Always Use Agents

All review steps must be invoked as **agents** (via Agent tool with appropriate `subagent_type`), never as skills.

## Task Completion Protocol

When a task is complete:
1. Stage and commit all changes (including `.claude/memory/` and `plan/` files) referencing the task.
2. Run the `task-build-verify` agent. Fix failures. Never push with known failures or warnings.
3. Run `qa-verify` agent. FAIL or PASS WITH GAPS: fix, re-commit, re-run. PASS: proceed.
4. Run code reviews in parallel. See `.claude/procedures/review-routing.md` for which reviewers to launch based on the diff and how to handle each verdict.
5. **UI Review:** Required if issue has `area:frontend` OR `area:design`. Launch `review-ui` agent with specific routes/screens changed. NEEDS WORK: fix, re-run checks, re-review. GOOD/POLISHED: proceed. Log unfixed findings to `plan/ui-review-backlog.md`.
6. **Log out-of-scope observations** to `plan/observed-issues.md`: `| #<issue> | <date> | <severity> | <one-line observation> |`
7. **Check for conflicts:**
   ```bash
   git fetch origin && git merge --no-commit --no-ff origin/sprint/<slug> && git merge --abort
   ```
   If conflicts: resolve, re-run checks, re-commit.
8. Push and open PR against the sprint branch. Post `@coderabbitai review` comment.
9. Start a CodeRabbit monitoring cron (5 min) using `task-pr-check` agent:
   - **WAITING_CI**: wait
   - **READY**: delete cron, notify user
   - **NEEDS_FIXES**: delete cron, fix, run `task-build-verify`, push, restart cron
   - Critically evaluate each comment. Max 3 fix rounds. Stop on test failures or architectural comments. Always notify user.
10. Stop. Do NOT merge. User reviews and merges manually.

**Branch protection:** `task/*`: push freely. `sprint/*`: PR only. `main`: never push directly.

## Memory

Claude's persistent memory lives in `.claude/memory/`. Do not read, modify, or include in code searches. Managed by auto-memory.

## Plan Storage

Plans go in the path from `project_langteach_plans.md` memory. Rules:
- Each plan in its own dedicated subfolder. Never save directly in the root folder.
- You always have permission to create files and folders. Never ask for confirmation.
- When a feature is split into multiple tasks, all task files go inside the **same** feature subfolder (e.g., `task1-xxx.md`, `task2-xxx.md`). Never create a new subfolder per task.

## Shell Command Guidelines

**CRITICAL: The Bash tool uses Unix bash, NOT PowerShell**

Even though the system is Windows, the Bash tool executes commands in Unix-style bash (Git Bash/WSL).
Always use bash/Unix commands, never PowerShell cmdlets.

### Non-obvious Command Conversions

| PowerShell (DON'T USE) | Bash (USE INSTEAD) |
|------------------------|-------------------|
| `Test-Path "file"` | `[ -f "file" ]` |
| `Test-Path "dir"` | `[ -d "dir" ]` |
| `Get-ChildItem` | `ls -la` |

### Path Handling
- Use forward slashes `/` or properly escaped backslashes `\\` in bash
- Prefer the Read, Write, Edit, and Glob tools for file operations over bash commands
- Use `$HOME` for user home directory, not `~\` (PowerShell style)

## Context Efficiency

### Subagent Discipline

**Context-aware delegation:**
 - Under ~50k context: prefer inline work for tasks under ~5 tool calls.
 - Over ~50k context: prefer subagents for self-contained tasks, even simple ones.

When using subagents, include output rules: "Final response under 2000 characters. List outcomes, not process."
Never call TaskOutput twice for the same subagent. If it times out, increase the timeout.

### File Reading
- Use Grep to locate relevant sections before reading entire large files.
- **Never re-read a file you already read in this session.** This applies to main conversations and subagents alike.
- For files over 500 lines, use offset/limit to read only the relevant section.
- **Glob before Read** when the exact path is uncertain. Never guess a path, fail, then glob.

### Tool Call Hygiene
- **No duplicate tool calls.** If a tool call returned data, use that data. Do not call the same tool with the same arguments again (includes retrying Grep/Glob with the same pattern).

### Responses
Always show commands for the user to run in **PowerShell syntax** (`$env:VAR` for environment variables). Always write commands on a **single line**. This avoids copy-paste errors and PowerShell parsing issues with `--` arguments. The Bash tool uses Unix internally; this rule applies only to commands shown in text responses.
Don't echo back file contents you just read.
Don't narrate tool calls ("Let me read the file..." / "Now I'll edit..."). Just do it.
Keep explanations proportional to complexity. Simple changes need one sentence, not three paragraphs.
Never use em dashes (--) or en dashes (-) in any response or generated file. Use commas, parentheses, or restructure the sentence instead.
