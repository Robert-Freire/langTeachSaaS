# LangTeach SaaS — Project Rules

## Task Completion Protocol

When a task is marked complete:
1. Create a feature branch named `task/<task-id>-<short-description>` (e.g. `task/t2-azure-infra`)
2. Stage all relevant changes and commit with a message referencing the task
3. Push the branch and open a PR against `main` with a summary of what was done and why
4. Stop — do NOT merge. The user reviews the PR and merges manually.

**Pre-push checks (must all pass before pushing):**
- `az bicep build --file infra/main.bicep` — zero warnings, zero errors
- `cd backend && dotnet build` — zero warnings, zero errors
- `cd backend && dotnet test` — all tests pass
- `cd frontend && npm run build` — zero errors
- If any check fails, fix it before pushing. Never push with known failures or warnings.

**Branch protection rules:**
- Feature branches (`task/*`): commit and push freely
- `main`: never commit or push directly unless the user explicitly asks in that message
