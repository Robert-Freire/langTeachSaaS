# Production Rollback Procedure

Use this when a sprint merge causes a critical regression in production and a quick code fix is not possible.

## Before you start

Confirm the problem is real:
```bash
az containerapp logs show --name app-langteach-api-dev --resource-group rg-langteach-dev --follow
```

If it is an activation failure (new revision never started), Container Apps already deactivated it automatically. The previous revision is still serving traffic. Nothing to do on the backend.

---

## Step 1: Freeze deploys

Do not trigger `merge-sprint-to-main` again until the issue is fixed. If a push to main is in flight, check GitHub Actions and cancel it.

---

## Step 2: Assess DB compatibility

This determines whether you can safely roll back the backend code.

Check the migration that ran:
```bash
ls backend/LangTeach.Api/Migrations/ | sort | tail -5
```

**Safe to roll back code** if the migration only:
- Added new nullable columns
- Added new tables (old code ignores them)
- Added new indexes

**NOT safe to roll back code** if the migration:
- Renamed or dropped columns the old code reads
- Changed column types
- Added NOT NULL columns without a default
- Dropped tables

If not safe, fix forward on the sprint branch (preferred path). Only proceed with code rollback if the problem is severe enough to warrant it and you have confirmed DB compatibility.

---

## Step 3: Backend rollback (Container Apps revision)

List recent revisions to find the last known-good one:
```bash
az containerapp revision list --name app-langteach-api-dev --resource-group rg-langteach-dev --query "[].{name:name,active:properties.active,state:properties.runningState,created:properties.createdTime}" --output table
```

Activate the previous revision (zero-downtime, traffic shifts immediately):
```bash
az containerapp revision activate --name app-langteach-api-dev --resource-group rg-langteach-dev --revision <previous-revision-name>
```

To roll back to a specific ACR image:
```bash
# stable-prev = the deploy before the current one (use this if the bug appeared after the most recent deploy)
az containerapp update --name app-langteach-api-dev --resource-group rg-langteach-dev --image crlangteachdev.azurecr.io/langteach-api:stable-prev

# stable = the current deploy's image (only useful if stable-prev is what you want to restore TO)
az containerapp update --name app-langteach-api-dev --resource-group rg-langteach-dev --image crlangteachdev.azurecr.io/langteach-api:stable
```

Tag lifecycle per deploy: `stable` is copied to `stable-prev` before each new build, then the new image is tagged `stable` only after its revision reaches Running state. "Running" means the container started, not that the feature is bug-free -- if a subtle bug surfaces hours later, `stable-prev` is still your clean rollback point.

Deactivate the broken revision:
```bash
az containerapp revision deactivate --name app-langteach-api-dev --resource-group rg-langteach-dev --revision <broken-revision-name>
```

---

## Step 4: Frontend rollback (Azure SWA)

SWA does not support revision activation. The only rollback path is a git revert.

Find the merge commit SHA:
```bash
git log --oneline main | head -5
```

Revert it:
```bash
git revert -m 1 <merge-commit-sha> --no-edit
git push origin main
```

This triggers `frontend.yml` which redeploys the reverted build. Takes 3-5 minutes.

If the sprint only changed the backend, skip this step.

---

## Step 5: Fix forward

After stabilizing production:

1. Create a hotfix branch from `main` (not the sprint branch).
2. Fix the root cause.
3. PR to `main` directly (hotfix exception in CLAUDE.md).
4. After merging, sync the sprint branch: `git checkout sprint/<slug> && git merge main && git push origin sprint/<slug>`.

---

## DB schema rollback (EF Core)

Every migration has a `Down()` method. To roll back all sprint migrations against your local DB:

```bash
cd backend && dotnet ef database update <LastMigrationBeforeSprint>
```

**Per-sprint rollback targets** (update this table at sprint close):

| Sprint | Last pre-sprint migration |
|--------|--------------------------|
| UI Redesign & Student Profile Polish | `AddTelegramLink` |

To verify the `Down()` methods work locally before a sprint merge to main:

```bash
# Roll back
cd backend && dotnet ef database update AddTelegramLink

# Confirm app still starts against the rolled-back schema
dotnet run --project LangTeach.Api

# Re-apply to get back to current state
dotnet ef database update
```

In production, the same logic applies but you run it against the Azure SQL connection string. This is a manual step -- there is no automated DB rollback. Confirm DB compatibility (Step 2 above) before activating a previous Container Apps revision.

## Reference: ACR image tags

| Tag | Meaning |
|-----|---------|
| `<git-sha>` | Immutable, every deploy |
| `latest` | Most recent build (may not be confirmed healthy) |
| `stable` | Current deploy's image (confirmed started, not necessarily bug-free) |
| `stable-prev` | Deploy before the current one -- first choice for rollback |
