# LangTeach SaaS -- Project Rules

## Worktree-First Workflow

**All task work MUST happen inside a git worktree.** This includes planning, plan review, implementation, testing, and PR creation. The worktree keeps the main working directory clean and prevents conflicts when multiple agents work in parallel.

Before starting any task:
1. `git fetch origin` and check out the **active sprint branch** (see Sprint Branch Workflow below): `git checkout sprint/<slug> && git pull origin sprint/<slug>`
   - **If the sprint branch does not exist yet**: STOP and ask the user. Do not create it yourself. Ask: should it be created from `main` or from the previous sprint branch? The answer depends on whether there's unmerged work in the previous sprint.
2. `EnterWorktree` with `name: "task-t<N>-<short-description>"` (e.g. `task-t21-export-pdf`)
   - A post-creation hook automatically copies env files from the main repo and runs `npm ci` + `dotnet restore`. If builds still fail, verify dependencies are installed manually: `cd frontend && npm ci` and `cd backend && dotnet restore`.
3. Write the task plan **inside the worktree** at `plan/langteach-beta/task<N>-<short-description>.md` — never write plan files to the main repo directory
4. Run the `review-plan` agent (use the Agent tool with `subagent_type: "review-plan"`, NOT the `/review-plan` skill). Always use agents for all review steps to keep context clean. If the reviewer says NEEDS REVISION:
   - Critically evaluate each finding: is it valid given the codebase and project context, or is the reviewer being overly cautious / missing context?
   - Fix findings you agree with, update the plan, and re-run the `review-plan` agent
   - For findings you disagree with, note your reasoning in the plan and proceed
   - Only stop and escalate to the user if the reviewer and you fundamentally disagree on approach (e.g., architectural direction, scope interpretation) after 2 review rounds
   - **Once the review-plan agent approves (or you resolve all findings), proceed immediately to implementation. Do NOT stop to ask the user for plan approval. The review-plan agent's approval IS the plan approval.** This overrides the global "wait for approval" rule in the PersonalOS CLAUDE.md.
5. Implement, test, commit, push, open PR **targeting the sprint branch** (all from inside the worktree)
6. After the PR is merged, exit and remove the worktree with `ExitWorktree(action: "remove")`

Never work directly in the main repo directory for task work (including planning).

## Git Bash Path Mangling (Windows)

Git Bash automatically translates Unix absolute paths to Windows paths (e.g., `/opt/bin/tool` becomes `C:/Program Files/Git/opt/bin/tool`). This breaks `docker exec` commands that pass paths meant for inside a container. **Always prefix `docker exec` commands containing Linux paths with `MSYS_NO_PATHCONV=1`:**
```bash
MSYS_NO_PATHCONV=1 docker exec container-name /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "pass" -Q "SELECT 1"
```

## E2E Stack Coordination

The e2e stack (`docker-compose.e2e.yml`) uses mock auth and fixed ports. It can run alongside the dev stack (different compose file, different ports, different auth), but **only one e2e stack instance can run at a time.**

**Before starting the e2e stack** (for e2e tests or review-ui), check if e2e containers are already running:
```bash
docker ps --filter "name=langteachsaas-e2e" --format "{{.Names}}"
```
- If containers are running: **stop and notify the user.** Do not tear them down, do not retry. Another agent or test run owns them. Then start a cron that checks every 5 minutes whether the e2e stack has been freed:
  ```bash
  docker ps --filter "name=langteachsaas-e2e" --format "{{.Names}}"
  ```
  When the containers are gone, the cron deletes itself and notifies the user that the e2e stack is now available so the agent can proceed with UI review or e2e tests.
- If no containers are running: proceed.

**Starting the stack:**
```bash
docker compose -f docker-compose.e2e.yml --env-file .env.e2e --profile test up --build --exit-code-from playwright
```

**Always tear down your own stack when done:**
```bash
docker compose -f docker-compose.e2e.yml --env-file .env.e2e down -v
```

## Sprint Branch Workflow

**All feature work targets the active sprint branch, never main directly.**

```
main (deploys to Azure, advances only via merge action)
  └── sprint/<milestone-slug> (integration branch, agents PR here)
        └── task/t<N>-<description> (feature branches from worktrees)
```

### How it works

- Each active milestone has one sprint branch (e.g., `sprint/curriculum-personalization`)
- Agents create PRs targeting the sprint branch instead of `main`
- The sprint branch is where integration testing and Teacher QA runs happen
- **Main only advances when Robert triggers the `merge-sprint-to-main` GitHub Action** (manual workflow_dispatch)
- The existing CD pipeline (main -> Azure) deploys automatically after merge

### Active sprint branch

Check `.claude/memory/project_langteach_task_status.md` for the current sprint branch name. Always use the branch name from memory, never guess.

### Deploy freeze

Freeze = Robert does not trigger the merge action. The sprint branch keeps receiving work, main stays stable, Azure stays on the last good state. No config variables or special flags needed.

### Branch lifecycle

1. Sprint start: create `sprint/<slug>` from `main`
2. During sprint: agents open PRs against the sprint branch
3. Robert periodically triggers merge action to sync sprint -> main (unless frozen)
4. Sprint end: final merge to main, delete the sprint branch
5. Next sprint: new `sprint/<slug>` from `main`

### Exceptions (can target main directly)

- **Non-code files**: `.claude/memory/`, `.claude/skills/`, `plan/` files can be committed and pushed directly to `main`. These are documentation/configuration, not application code, and don't need the sprint branch quality gate.
- **Hotfixes** to production: branch from `main`, PR to `main`.
- **Infrastructure/workflow changes** that affect how agents work may target `main` directly if the user approves.

**After any direct push to main**, merge main into the active sprint branch so agents see the changes immediately:
```bash
git checkout sprint/<slug> && git merge main && git push origin sprint/<slug>
```
This keeps the sprint branch in sync with any memory, skill, or rule updates.

## Task Source: GitHub Issues

GitHub Issues is the single source of truth for task tracking. Plan files remain as design documents.

**Picking tasks:**
- Work from GitHub Issues, highest priority (`P0` > `P1` > `P2`) in the current milestone
- An issue must have the `qa:ready` label before implementation starts
- **Never hardcode or guess milestone names.** Always query first: `gh milestone list --state open --json title` and use the exact title from the output. Milestone names change between sprints.
- **Check the active sprint in `.claude/memory/project_langteach_task_status.md`** to know which milestone is current. Only pick issues from the active sprint milestone.
- **If the issue's milestone does not match the active sprint: STOP and ask the user for confirmation before proceeding.** Do not silently pick work from other milestones. Explain which milestone the issue belongs to and why you're considering it (e.g., "no unassigned issues left in the active sprint").
- Use `gh issue list --milestone "<milestone>" --label "qa:ready"` to find ready work
- **Skip already-assigned issues** — only pick issues with no assignee. Check the `assignees` field in the list output, or filter with `gh issue list ... --assignee ""` (no assignee)
- **Immediately self-assign the issue when you pick it** (before worktree, before plan): `gh issue edit <number> --add-assignee "@me"` — this signals to other agents that the issue is taken

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

## Review Tools: Always Use Agents

All review steps (`review-plan`, `qa-verify`, `review`, `architecture-reviewer`, `review-ui`) must be invoked as **agents** (via the Agent tool with the appropriate `subagent_type`), never as skills or slash commands. This keeps the main context window clean and prevents review output from consuming token budget. The `/qa` skill is the only exception (it's for interactive issue review with the user, not part of the task completion pipeline).

## Task Completion Protocol

When a task is marked complete:
1. Stage all relevant changes **including any modified files in `.claude/memory/` and `plan/`** and commit with a message referencing the task
2. Run pre-push checks (see below). Fix any failures before proceeding.
3. Run the `qa-verify` agent to verify all issue acceptance criteria are addressed (this is NOT the `/qa` skill, which checks issue readiness).
   - If verdict is **FAIL**: address unmet criteria or missing tests, re-commit, re-run checks and QA.
   - If verdict is **PASS WITH GAPS**: add missing test coverage, re-commit, re-run checks and QA.
   - If verdict is **PASS**: proceed to code review.
4. Run the `review` agent and the `architecture-reviewer` agent **in parallel** (send both Agent tool calls in the same message). They have different lenses and do not depend on each other.
   - `review` verdict **FAIL**: fix all critical issues, re-commit, re-run checks and review.
   - `review` verdict **PASS WITH NOTES**: address important items where reasonable, then proceed. Append any unfixed notes to `plan/code-review-backlog.md` with PR number, date, severity, and description.
   - `architecture-reviewer` verdict **NEEDS REVISION**: fix pattern violations and convention breaks, re-commit, re-run checks, and re-run the architecture reviewer.
   - `architecture-reviewer` verdict **PASS WITH NOTES**: address items where reasonable, then proceed. Minor notes not worth fixing go to `plan/code-review-backlog.md`.
   - Both at **PASS** or **PASS WITH NOTES** (after addressing or logging notes): proceed to UI review (or push if not applicable).
5. **UI Review (review-ui agent):** Skip this step ONLY if the issue has NONE of these labels: `area:frontend`, `area:design`. If the issue has `area:frontend` OR `area:design` (either one is sufficient), you MUST run `review-ui`. **`area:frontend` alone triggers UI review. You do NOT need `area:design`.** Never ask the user whether to skip UI review; if the label is present, run it.
   - The review-ui agent manages its own e2e stack (`docker-compose.e2e.yml`). Do NOT start the dev stack for UI review. The agent handles stack startup and teardown automatically.
   - In the agent prompt, list the specific routes and screens the feature modified so the agent runs in **focused review mode** (screenshots of changed screens + regression check on dashboard/lesson editor). Example prompt: *"Review UI for lesson editor header redesign. Changed screens: /lessons/:id (editor view), /lessons/:id/study (study view). The header layout and metadata section were restructured."*
   - If verdict is **NEEDS WORK**: fix critical and important visual/UX issues, re-commit, re-run pre-push checks, and re-run UI review.
   - If verdict is **GOOD** or **POLISHED**: proceed to push.
   - **After the final verdict**, append any findings you did NOT fix (items you chose to skip or that were too minor to address) to `plan/ui-review-backlog.md` with PR number, date, severity, and a one-line description. Do not log findings you already fixed. Do not create GitHub issues for these individually; they get batched into polish tasks later.
6. **Log out-of-scope observations.** During implementation, you may notice issues unrelated to the current task (e.g., similar bugs in other components, naming inconsistencies, missing error handling elsewhere, UX rough edges on other screens). Do NOT fix them (that's scope creep) and do NOT silently ignore them. Append each observation to `plan/observed-issues.md` with the issue number you were working on, date, and a one-line description. These get batched into future issues by the PM. Format:
   ```
   | #<issue> | <date> | <severity> | <one-line observation> |
   ```
7. Push the branch and open a PR against the **active sprint branch** with a summary of what was done and why. Immediately after creating the PR, post a comment with `@coderabbitai review` to trigger CodeRabbit (it only auto-reviews PRs targeting main, so sprint branch PRs need a manual trigger).
8. Start a CodeRabbit monitoring cron (every 5 minutes) that:
   - Checks CI build status (`gh pr checks`) and fetches all PR comments from CodeRabbit
   - If CI passes AND no unresolved comments: deletes the cron and notifies the user the PR is ready for their review
   - If CI fails: investigate the failure, fix locally, run pre-push checks, commit, and push
   - If unresolved comments exist: **critically evaluates** each one (is it valid? does it contradict project conventions? does it over-engineer?), fixes only what genuinely improves the code, replies explaining reasoning for declined suggestions, runs pre-push checks, commits, and pushes
   - Safety limits: max 3 fix-and-push rounds, stops on test failures or ambiguous/architectural comments, always notifies the user when stopping
9. Stop -- do NOT merge. The user reviews the PR and merges manually.

**Pre-push checks (must all pass before pushing):**
- `az bicep build --file infra/main.bicep` -- zero warnings, zero errors
- `cd backend && dotnet build` -- zero warnings, zero errors
- `cd backend && dotnet test` -- all tests pass
- `cd frontend && npm run build` -- zero errors
- `cd frontend && npm test` -- all unit tests pass
- If any check fails, fix it before pushing. Never push with known failures or warnings.

**Branch protection rules:**
- Feature branches (`task/*`): commit and push freely
- Sprint branches (`sprint/*`): merge via PR only, never commit directly
- `main`: never commit or push directly. Main advances only via the `merge-sprint-to-main` GitHub Action or user-approved hotfixes


## Memory

Claude's persistent memory for this project lives in `.claude/memory/`. These are not source files -- do not read, modify, or include them in code searches or codebase exploration. Memory is managed separately via the auto-memory system.
