# LangTeach SaaS -- Project Rules

## Worktree-First Workflow

**All task work MUST happen inside a git worktree.** This includes planning, plan review, implementation, testing, and PR creation. The worktree keeps the main working directory clean and prevents conflicts when multiple agents work in parallel.

Before starting any task:
1. `git fetch origin && git checkout main && git pull origin main`
2. `EnterWorktree` with `name: "task-t<N>-<short-description>"` (e.g. `task-t21-export-pdf`)
3. Write the task plan, run `/review-plan`, iterate until READY
4. Implement, test, commit, push, open PR (all from inside the worktree)
5. After the PR is merged, exit and remove the worktree with `ExitWorktree(action: "remove")`

Never work directly in the main repo directory for task work (including planning).

## E2E Stack Coordination

The e2e stack (`docker-compose.e2e.yml`) uses mock auth and fixed ports. It can run alongside the dev stack (different compose file, different ports, different auth), but **only one e2e stack instance can run at a time.**

**Before starting the e2e stack** (for e2e tests or review-ui), check if e2e containers are already running:
```bash
docker ps --filter "name=langteachsaas-e2e" --format "{{.Names}}"
```
- If containers are running: **stop and notify the user.** Do not tear them down, do not retry. Another agent or test run owns them.
- If no containers are running: proceed.

**Starting the stack:**
```bash
docker compose -f docker-compose.e2e.yml --env-file .env.e2e --profile test up --build --exit-code-from playwright
```

**Always tear down your own stack when done:**
```bash
docker compose -f docker-compose.e2e.yml --env-file .env.e2e down -v
```

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
- Move the issue to "Ready to Test" on the project board: `gh project item-edit --project-id PVT_kwHOAF1Pks4BSLsS --id <ITEM_ID> --field-id PVTSSF_lAHOAF1Pks4BSLsSzg_ysiA --single-select-option-id 530fcec2`
  - To find the item ID: `gh project item-list 2 --owner Robert-Freire --format json` and match by issue number
- Never move issues to "Done." The user does sanity checks and moves to Done manually.
- Exit and remove the worktree with `ExitWorktree(action: "remove")`

**Labels overview:**
- Priority: `P0:blocker`, `P1:must`, `P2:should`, `P3:nice` (mutually exclusive)
- Area: `area:frontend`, `area:backend`, `area:e2e`, `area:infra`, `area:design`, `area:ai` (stackable)
- Type: `type:polish`, `type:tech-debt`
- Workflow: `qa:ready`, `demo-sprint`

## Task Completion Protocol

When a task is marked complete:
1. Stage all relevant changes **including any modified files in `.claude/memory/` and `plan/`** and commit with a message referencing the task
2. Run pre-push checks (see below). Fix any failures before proceeding.
3. Run the `qa-verify` agent to verify all issue acceptance criteria are addressed (this is NOT the `/qa` skill, which checks issue readiness).
   - If verdict is **FAIL**: address unmet criteria or missing tests, re-commit, re-run checks and QA.
   - If verdict is **PASS WITH GAPS**: add missing test coverage, re-commit, re-run checks and QA.
   - If verdict is **PASS**: proceed to code review.
4. Run the `review` agent to perform a code review of all changes vs `main`.
   - If verdict is **FAIL**: fix all critical issues, re-commit, re-run checks and review.
   - If verdict is **PASS WITH NOTES**: address important items where reasonable, then proceed. Append any unfixed notes to `plan/code-review-backlog.md` with PR number, date, severity, and description.
   - If verdict is **PASS**: proceed to UI review (or push if not applicable).
5. **UI Review (review-ui agent):** Skip this step ONLY if the issue has NONE of these labels: `area:frontend`, `area:design`. If the issue has `area:frontend` OR `area:design` (either one is sufficient), you MUST run `review-ui`. **`area:frontend` alone triggers UI review. You do NOT need `area:design`.** Never ask the user whether to skip UI review; if the label is present, run it.
   - The review-ui agent manages its own e2e stack (`docker-compose.e2e.yml`). Do NOT start the dev stack for UI review. The agent handles stack startup and teardown automatically.
   - In the agent prompt, list the specific routes and screens the feature modified so the agent runs in **focused review mode** (screenshots of changed screens + regression check on dashboard/lesson editor). Example prompt: *"Review UI for lesson editor header redesign. Changed screens: /lessons/:id (editor view), /lessons/:id/study (study view). The header layout and metadata section were restructured."*
   - If verdict is **NEEDS WORK**: fix critical and important visual/UX issues, re-commit, re-run pre-push checks, and re-run UI review.
   - If verdict is **GOOD** or **POLISHED**: proceed to push.
   - **After the final verdict**, append any findings you did NOT fix (items you chose to skip or that were too minor to address) to `plan/ui-review-backlog.md` with PR number, date, severity, and a one-line description. Do not log findings you already fixed. Do not create GitHub issues for these individually; they get batched into polish tasks later.
6. Push the branch and open a PR against `main` with a summary of what was done and why
7. Start a CodeRabbit monitoring cron (every 5 minutes) that:
   - Checks CI build status (`gh pr checks`) and fetches all PR comments from CodeRabbit
   - If CI passes AND no unresolved comments: deletes the cron and notifies the user the PR is ready for their review
   - If CI fails: investigate the failure, fix locally, run pre-push checks, commit, and push
   - If unresolved comments exist: **critically evaluates** each one (is it valid? does it contradict project conventions? does it over-engineer?), fixes only what genuinely improves the code, replies explaining reasoning for declined suggestions, runs pre-push checks, commits, and pushes
   - Safety limits: max 3 fix-and-push rounds, stops on test failures or ambiguous/architectural comments, always notifies the user when stopping
8. Stop -- do NOT merge. The user reviews the PR and merges manually.

**Pre-push checks (must all pass before pushing):**
- `az bicep build --file infra/main.bicep` -- zero warnings, zero errors
- `cd backend && dotnet build` -- zero warnings, zero errors
- `cd backend && dotnet test` -- all tests pass
- `cd frontend && npm run build` -- zero errors
- `cd frontend && npm test` -- all unit tests pass
- If any check fails, fix it before pushing. Never push with known failures or warnings.

**Branch protection rules:**
- Feature branches (`task/*`): commit and push freely
- `main`: never commit or push directly unless the user explicitly asks in that message


## Memory

Claude's persistent memory for this project lives in `.claude/memory/`. These are not source files -- do not read, modify, or include them in code searches or codebase exploration. Memory is managed separately via the auto-memory system.
