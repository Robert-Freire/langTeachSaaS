# LangTeach SaaS — Project Rules

## Worktree-First Workflow

**All task work MUST happen inside a git worktree.** This includes planning, plan review, implementation, testing, and PR creation. The worktree keeps the main working directory clean and prevents conflicts when multiple agents work in parallel.

Before starting any task:
1. `git fetch origin && git checkout main && git pull origin main`
2. `EnterWorktree` with `name: "task-t<N>-<short-description>"` (e.g. `task-t21-export-pdf`)
3. Write the task plan, run `/review-plan`, iterate until READY
4. Implement, test, commit, push, open PR (all from inside the worktree)
5. After the PR is merged, exit and remove the worktree with `ExitWorktree(action: "remove")`

Never work directly in the main repo directory for task work (including planning).

## E2E Test Isolation (Parallel Agents)

When running `docker-compose.e2e.yml` from a worktree, use `--project-name` to avoid conflicts with other agents running e2e tests simultaneously:
```bash
docker compose -f docker-compose.e2e.yml --project-name langteachsaas-e2e-<worktree-name> --env-file .env.e2e up --build --exit-code-from playwright
```
This gives each worktree its own Docker network and volumes. Teardown uses the same project name:
```bash
docker compose -f docker-compose.e2e.yml --project-name langteachsaas-e2e-<worktree-name> --env-file .env.e2e down -v
```
If only one agent is running, the default project name (`langteachsaas-e2e`) is fine.

## Task Source: GitHub Issues

GitHub Issues is the single source of truth for task tracking. Plan files remain as design documents.

**Picking tasks:**
- Work from GitHub Issues, highest priority (`P0` > `P1` > `P2`) in the current milestone
- An issue must have the `qa:ready` label before implementation starts
- Use `gh issue list --milestone "<milestone>" --label "qa:ready"` to find ready work

**Closing issues via PR:**
- PR body must include `Closes #N` to auto-close the issue on merge
- Apply appropriate area/type labels when creating issues

**After PR is merged (when user confirms merge):**
- Move the issue to "Done" on the project board: `gh project item-edit --project-id PVT_kwHOAF1Pks4BSLsS --id <ITEM_ID> --field-id PVTSSF_lAHOAF1Pks4BSLsSzg_ysiA --single-select-option-id 61f69a4c`
  - To find the item ID: `gh project item-list 2 --owner Robert-Freire --format json` and match by issue number
- Exit and remove the worktree with `ExitWorktree(action: "remove")`

**Labels overview:**
- Priority: `P0:blocker`, `P1:must`, `P2:should`, `P3:nice` (mutually exclusive)
- Area: `area:frontend`, `area:backend`, `area:e2e`, `area:infra`, `area:design`, `area:ai` (stackable)
- Type: `type:polish`, `type:tech-debt`
- Workflow: `qa:ready`, `demo-sprint`

## Task Completion Protocol

When a task is marked complete:
1. Stage all relevant changes **including any modified files in `.claude/memory/` and `plan/`** and commit with a message referencing the task
3. Run pre-push checks (see below). Fix any failures before proceeding.
4. Run the `review` agent to perform a code review of all changes vs `main`.
   - If verdict is **FAIL**: fix all critical issues, re-commit, re-run checks and review.
   - If verdict is **PASS WITH NOTES**: address important items where reasonable, then proceed.
   - If verdict is **PASS**: proceed to push.
5. Push the branch and open a PR against `main` with a summary of what was done and why
6. Start a CodeRabbit monitoring cron (every 5 minutes) that:
   - Fetches all PR comments from CodeRabbit
   - If no unresolved comments and review is clean: deletes the cron and notifies the user the PR is ready for their review
   - If unresolved comments exist: **critically evaluates** each one (is it valid? does it contradict project conventions? does it over-engineer?), fixes only what genuinely improves the code, replies explaining reasoning for declined suggestions, runs pre-push checks, commits, and pushes
   - Safety limits: max 3 fix-and-push rounds, stops on test failures or ambiguous/architectural comments, always notifies the user when stopping
7. Stop — do NOT merge. The user reviews the PR and merges manually.

**Pre-push checks (must all pass before pushing):**
- `az bicep build --file infra/main.bicep` — zero warnings, zero errors
- `cd backend && dotnet build` — zero warnings, zero errors
- `cd backend && dotnet test` — all tests pass
- `cd frontend && npm run build` — zero errors
- `cd frontend && npm test` — all unit tests pass
- If any check fails, fix it before pushing. Never push with known failures or warnings.

**Branch protection rules:**
- Feature branches (`task/*`): commit and push freely
- `main`: never commit or push directly unless the user explicitly asks in that message


## Memory

Claude's persistent memory for this project lives in `.claude/memory/`. These are not source files — do not read, modify, or include them in code searches or codebase exploration. Memory is managed separately via the auto-memory system.
