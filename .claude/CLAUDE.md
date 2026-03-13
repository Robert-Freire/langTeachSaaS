# LangTeach SaaS — Project Rules

## Task Completion Protocol

When a task is marked complete:
1. Create a feature branch named `task/<task-id>-<short-description>` (e.g. `task/t2-azure-infra`)
2. Stage all relevant changes and commit with a message referencing the task
3. Push the branch and open a PR against `main` with a summary of what was done and why
4. Stop — do NOT merge. The user reviews the PR and merges manually.

**Branch protection rules:**
- Feature branches (`task/*`): commit and push freely
- `main`: never commit or push directly unless the user explicitly asks in that message
