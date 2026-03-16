# LangTeach SaaS — Project Rules

## Plan Review Protocol

Before starting implementation of any task plan:
1. Run `/review-plan` (optionally pass the plan file path as argument).
2. If verdict is **MAJOR GAPS**: revise the plan before writing any code.
3. If verdict is **NEEDS REVISION**: fix the flagged issues in the plan, then start.
4. If verdict is **READY**: proceed to implementation.

## Task Completion Protocol

When a task is marked complete:
1. Create a feature branch named `task/<task-id>-<short-description>` (e.g. `task/t2-azure-infra`)
2. Stage all relevant changes **including any modified files in `.claude/memory/` and `plan/`** and commit with a message referencing the task
3. Run pre-push checks (see below). Fix any failures before proceeding.
4. Run `/review` to perform a code review of all changes vs `main`.
   - If verdict is **FAIL**: fix all critical issues, re-commit, re-run checks and review.
   - If verdict is **PASS WITH NOTES**: address important items where reasonable, then proceed.
   - If verdict is **PASS**: proceed to push.
5. Push the branch and open a PR against `main` with a summary of what was done and why
6. Stop — do NOT merge. The user reviews the PR and merges manually.

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
