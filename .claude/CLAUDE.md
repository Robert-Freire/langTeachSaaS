# LangTeach SaaS -- Project Rules

## Worktree-First Workflow

**All task work MUST happen inside a git worktree.** This includes planning, plan review, implementation, testing, and PR creation. The worktree keeps the main working directory clean and prevents conflicts when multiple agents work in parallel.

Before starting any task:
1. `git fetch origin` and check out the **active sprint branch** (see Sprint Branch Workflow below): `git checkout sprint/<slug> && git pull origin sprint/<slug>`
   - **If the sprint branch does not exist yet**: STOP and ask the user. Do not create it yourself. Ask: should it be created from `main` or from the previous sprint branch? The answer depends on whether there's unmerged work in the previous sprint.
2. `EnterWorktree` with `name: "task-t<N>-<short-description>"` (e.g. `task-t21-export-pdf`)
   - A post-creation hook automatically copies env files from the main repo and runs `npm ci` + `dotnet restore`. If builds still fail, verify dependencies are installed manually: `cd frontend && npm ci` and `cd backend && dotnet restore`.
   - **Immediately after the worktree is created**, run `git merge origin/sprint/<slug> --no-edit` from inside the worktree to ensure it is fully up to date. Do this before writing the plan or reading any source files.
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

**This section applies when YOU (the agent) are starting the e2e stack directly** (e.g., running e2e tests, running Playwright). It does **NOT** apply when launching the `review-ui` agent, which manages its own stack internally. See the UI Review section in the Task Completion Protocol for that case.

**Before starting the e2e stack**, check if e2e containers are already running:
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

1. Sprint start: create `sprint/<slug>` from `main`, update "Current milestone" view filter on the Roadmap board in GitHub UI
2. During sprint: agents open PRs against the sprint branch. New sprint issues use `add-to-board.sh <url> <status>` to add to the Roadmap board
3. Robert periodically triggers merge action to sync sprint -> main (unless frozen)
4. Sprint close (three stages):
   - **Stage 1 (PM, main conversation):** Read the three backlog files (`plan/code-review-backlog.md`, `plan/ui-review-backlog.md`, `plan/observed-issues.md`). Triage each entry as FIX NOW / NEXT SPRINT / DELETE. Present triage to user. If FIX NOW items exist, those get implemented via normal worktree flow before proceeding. Batch NEXT SPRINT items into themed GitHub issues. Clear triaged entries from backlog files.
   - **Stage 2 (agent):** After user approves backlogs, run the `sprint-close` agent. It verifies board/issues, then runs a three-phase quality gate in order: (1) Teacher QA against the sprint branch, (2) prompt health review of `PromptService.cs` and `data/section-profiles/*.json` for redundancy/contradictions/negative bloat, (3) pedagogy review of Teacher QA output AND section profile guidance strings. Returns a READY/NOT READY verdict. Blockers: pedagogy RETHINK on a systemic issue, or critical prompt health findings (contradictions that actively produce wrong output).
   - **Stage 3 (cleanup, after user triggers merge action):** Close the milestone, delete the sprint branch, update memory (task status, sprint overviews), clear remaining backlog entries.
5. Next sprint: new `sprint/<slug>` from `main`, update milestone view filter

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

**Creating and editing issues:**
- Run `/qa` on every newly created issue before considering the work done
- Before editing a `qa:ready` issue: check it's not assigned (stop if it is), remove `qa:ready`, make the edit, re-run `/qa`, restore the label only if QA passes

**Adding issues to the project board:**
- Every new issue must be added to the board with a status. **Never use `gh project item-add` directly** (it leaves items in "No Status").
- Use the helper script: `./scripts/add-to-board.sh <issue-url> [status]`
- Status values: `backlog` (default), `ready`, `in-progress`, `ready-to-test`, `done`

**Closing issues via PR:**
- PR body must include `Closes #N` for documentation, but **auto-close only works when PRs target `main`**. Since sprint PRs target the sprint branch, auto-close will NOT trigger.
- Apply appropriate area/type labels when creating issues

**After PR is merged (when user confirms merge):**
- **Manually close the issue** (auto-close does not work for sprint-branch PRs): `gh issue close <N> --repo Robert-Freire/langTeachSaaS --reason completed`
- Move the issue to "Ready to Test" on the project board: `gh project item-edit --project-id PVT_kwHOAF1Pks4BSLsS --id <ITEM_ID> --field-id PVTSSF_lAHOAF1Pks4BSLsSzg_ysiA --single-select-option-id 530fcec2`
  - To find the item ID: `gh project item-list 2 --owner Robert-Freire --format json` and match by issue number
- Never move issues to "Done." The user does sanity checks and moves to Done manually.
- Exit and remove the worktree with `ExitWorktree(action: "remove")`

**Labels overview:**
- Priority: `P0:blocker`, `P1:must`, `P2:should`, `P3:nice` (mutually exclusive)
- Area: `area:frontend`, `area:backend`, `area:e2e`, `area:infra`, `area:design`, `area:ai` (stackable)
- Type: `type:polish`, `type:tech-debt`
- Workflow: `qa:ready`, `demo-sprint`
- Sprint: `sprint:active` (deprecated, no longer added to new issues)

## Review Tools: Always Use Agents

All review steps (`review-plan`, `qa-verify`, `review`, `architecture-reviewer`, `prompt-health-reviewer`, `review-ui`) must be invoked as **agents** (via the Agent tool with the appropriate `subagent_type`), never as skills or slash commands. This keeps the main context window clean and prevents review output from consuming token budget. The `/qa` skill is the only exception (it's for interactive issue review with the user, not part of the task completion pipeline).

## Task Completion Protocol

When a task is marked complete:
1. Stage all relevant changes **including any modified files in `.claude/memory/` and `plan/`** and commit with a message referencing the task
2. Run pre-push checks (see below). Fix any failures before proceeding.
3. Run the `qa-verify` agent to verify all issue acceptance criteria are addressed (this is NOT the `/qa` skill, which checks issue readiness).
   - If verdict is **FAIL**: address unmet criteria or missing tests, re-commit, re-run checks and QA.
   - If verdict is **PASS WITH GAPS**: add missing test coverage, re-commit, re-run checks and QA.
   - If verdict is **PASS**: proceed to code review.
4. Run the `review` agent and the `architecture-reviewer` agent **in parallel** (send both Agent tool calls in the same message). They have different lenses and do not depend on each other.
   - **If `backend/LangTeach.Api/AI/PromptService.cs` is in the diff**, also run the `prompt-health-reviewer` agent in the same parallel batch. Pass it: "Review the prompt template changes in this PR. Diff: <paste the PromptService.cs diff>. Check for redundant constraints, contradictions, negative bloat, stale patches, and duplication introduced by these changes. Cross-reference against structural enforcement in the codebase." If no changes to PromptService.cs, skip it.
   - **If the diff touches data** (files matching `**/Models/*.cs`, `**/Dtos/*.cs`, `**/*Dto.cs`, `**/Data/*.cs`, `**/Migrations/*.cs`, `data/**/*.json`, `**/contentTypes.ts`, or adds new entities/tables/FKs), also run a Sophy data model review in the same parallel batch. Use the Agent tool with `subagent_type: "general-purpose"` and prompt: "You are Sophy, a retired software architect. Read .claude/agents/sophy.md for your full persona. Review this PR diff for data model soundness: <paste relevant diff sections>. Check for: unstated assumptions, missing entity relationships, config-vs-code violations, over-engineering, conflicts with existing patterns. Verdict: APPROVE / NEEDS CLARIFICATION. Final response under 1500 characters."
   - Sophy verdict **NEEDS CLARIFICATION**: address her questions before pushing. Data model issues caught in review are much cheaper than fixing them post-merge.
   - Sophy verdict **APPROVE**: proceed.
   - **If the diff touches pedagogy config files** (files matching `data/pedagogy/*.json`, `data/section-profiles/*.json`, `data/pedagogy/cefr-level-rules/*.json`), also run the `pedagogy-reviewer` agent (Isaac) in the same parallel batch. Pass it: "Review the pedagogy config changes in this PR for pedagogical soundness. Changed files: <list files>. Diff: <paste relevant diff sections>. Read `data/pedagogy/AUTHORING.md` first for the additive model rules. Verify: override strings follow the authoring guide rules (focus not format, specific enough to exclude wrong interpretations, 1-3 sentences max), exercise type references are valid, CEFR level boundaries are respected, no contradictions between section profiles and template overrides. Verdict: SOUND / ADJUST / RETHINK."
   - Isaac verdict **RETHINK**: fix the pedagogical issues before pushing. Pedagogy errors in config files propagate to every lesson generated with that template/level.
   - Isaac verdict **ADJUST**: address the specific corrections, re-commit, re-run Isaac review.
   - Isaac verdict **SOUND**: proceed.
   - `review` verdict **FAIL**: fix all critical issues, re-commit, re-run checks and review.
   - `review` verdict **PASS WITH NOTES**: address important items where reasonable, then proceed. Append any unfixed notes to `plan/code-review-backlog.md` with PR number, date, severity, and description.
   - `architecture-reviewer` verdict **NEEDS REVISION**: fix pattern violations and convention breaks, re-commit, re-run checks, and re-run the architecture reviewer.
   - `architecture-reviewer` verdict **PASS WITH NOTES**: address items where reasonable, then proceed. Minor notes not worth fixing go to `plan/code-review-backlog.md`.
   - `prompt-health-reviewer` verdict **URGENT** or any critical finding: fix before pushing. Contradictory or redundant prompt instructions must not ship.
   - `prompt-health-reviewer` verdict **NEEDS CLEANUP** with no critical findings: address important items, log the rest in `plan/code-review-backlog.md`.
   - `prompt-health-reviewer` verdict **CLEAN**: proceed.
   - All agents at **PASS** or equivalent (after addressing or logging notes): proceed to UI review (or push if not applicable).
5. **UI Review (review-ui agent):** Skip this step ONLY if the issue has NONE of these labels: `area:frontend`, `area:design`. If the issue has `area:frontend` OR `area:design` (either one is sufficient), you MUST run `review-ui`. **`area:frontend` alone triggers UI review. You do NOT need `area:design`.** Never ask the user whether to skip UI review; if the label is present, run it.
   - The review-ui agent manages its own e2e stack (`docker-compose.e2e.yml`). Do NOT start the dev stack for UI review. The agent handles stack startup and teardown automatically. **Do NOT check for running e2e containers before launching review-ui.** The E2E Stack Coordination section does not apply here. Just launch the agent directly.
   - In the agent prompt, list the specific routes and screens the feature modified so the agent runs in **focused review mode** (screenshots of changed screens + regression check on dashboard/lesson editor). Example prompt: *"Review UI for lesson editor header redesign. Changed screens: /lessons/:id (editor view), /lessons/:id/study (study view). The header layout and metadata section were restructured."*
   - If verdict is **NEEDS WORK**: fix critical and important visual/UX issues, re-commit, re-run pre-push checks, and re-run UI review.
   - If verdict is **GOOD** or **POLISHED**: proceed to push.
   - **After the final verdict**, append any findings you did NOT fix (items you chose to skip or that were too minor to address) to `plan/ui-review-backlog.md` with PR number, date, severity, and a one-line description. Do not log findings you already fixed. Do not create GitHub issues for these individually; they get batched into polish tasks later.
6. **Log out-of-scope observations.** During implementation, you may notice issues unrelated to the current task (e.g., similar bugs in other components, naming inconsistencies, missing error handling elsewhere, UX rough edges on other screens). Do NOT fix them (that's scope creep) and do NOT silently ignore them. Append each observation to `plan/observed-issues.md` with the issue number you were working on, date, and a one-line description. These get batched into future issues by the PM. Format:
   ```
   | #<issue> | <date> | <severity> | <one-line observation> |
   ```
7. **Check for conflicts** before pushing. Run:
   ```bash
   git fetch origin
   git merge --no-commit --no-ff origin/sprint/<slug>
   git merge --abort
   ```
   If the merge step exits non-zero (conflict), resolve all conflicts, re-run pre-push checks, and re-commit before continuing. Never open a PR with unresolved conflicts.
8. Push the branch and open a PR against the **active sprint branch** with a summary of what was done and why. Immediately after creating the PR, post a comment with `@coderabbitai review` to trigger CodeRabbit (it only auto-reviews PRs targeting main, so sprint branch PRs need a manual trigger).
8. Start a CodeRabbit monitoring cron (every 5 minutes) that invokes the `task-pr-check` agent each tick (keeps the main context clean). Based on the agent's STATUS:
   - **WAITING_CI**: do nothing, wait for next tick
   - **READY** (CI pass + no actionable comments): delete the cron and notify the user the PR is ready for review
   - **NEEDS_FIXES** (CI fail or actionable comments): delete the cron, investigate inside the worktree, fix, run the `task-build-verify` agent, commit, push, re-start the cron
   - For each actionable comment: **critically evaluate** (is it valid? does it contradict project conventions? does it over-engineer?), fix only what genuinely improves the code, reply to declined comments explaining the reasoning
   - Safety limits: max 3 fix-and-push rounds, stop on test failures or ambiguous/architectural comments, always notify the user when stopping
9. Stop -- do NOT merge. The user reviews the PR and merges manually.

**Pre-push checks (must all pass before pushing):**

Run the `task-build-verify` agent (use the Agent tool with `subagent_type: "task-build-verify"`), passing the absolute worktree path. It runs all 6 checks and returns a compact PASS/FAIL report:
- `az bicep build` -- zero warnings, zero errors
- `dotnet build` -- zero warnings, zero errors
- `dotnet test` -- all tests pass
- `npm run lint` -- zero errors
- `npm run build` -- zero errors
- `npm test` -- all unit tests pass

If VERDICT is FAIL, fix the reported issues and re-run the agent. Never push with known failures or warnings.

**Branch protection rules:**
- Feature branches (`task/*`): commit and push freely
- Sprint branches (`sprint/*`): merge via PR only, never commit directly
- `main`: never commit or push directly. Main advances only via the `merge-sprint-to-main` GitHub Action or user-approved hotfixes


## Memory

Claude's persistent memory for this project lives in `.claude/memory/`. These are not source files -- do not read, modify, or include them in code searches or codebase exploration. Memory is managed separately via the auto-memory system.
