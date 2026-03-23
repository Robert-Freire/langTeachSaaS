# Task 224: Container App Auto-Rollback + ActivationFailed Alerting

## Problem

In Single revision mode (current default), when `az containerapp update` deploys a new revision:
- The new revision immediately receives 100% traffic
- If it enters `ActivationFailed`, it stays at 100% with 0 replicas
- The previous healthy revision no longer serves requests
- No alert fires — Robert only finds out when a user reports a 404

## Solution

### Part A: Rollback via CI/CD health gate (Bicep + workflow)

Switch the Container App to **Multiple revisions mode** (`activeRevisionsMode: 'Multiple'`). In Multiple mode:
- New revisions are created with 0% traffic by default
- The CI workflow explicitly shifts traffic to the new revision only after a health check passes
- If health check fails, the workflow fails and old revision keeps 100% traffic

This is the correct model for zero-downtime deployments. "Auto-rollback" in ACA does not exist as a native platform feature — it must be implemented in the deployment pipeline.

**Workflow changes (`backend.yml`):**
1. After `az containerapp update` (creates new revision, no traffic), capture the new revision name
2. Poll revision provisioning state (up to ~2 min) for `Provisioned` or `ActivationFailed`
3. If `Provisioned`: run `az containerapp ingress traffic set` to send 100% to new revision; deactivate old
4. If `ActivationFailed` or timeout: fail the job with a clear message; do NOT shift traffic; old revision continues serving

**Bicep changes (`containerapp.bicep`):**
- Add `activeRevisionsMode: 'Multiple'` to `configuration`
- No traffic block needed in Bicep (CI controls traffic at deploy time)

### Part B: ActivationFailed alert (Bicep)

Add to `containerapp.bicep`:
1. **Action Group** (`microsoft.insights/actionGroups`) — sends email to `alertEmail` param
2. **Scheduled Query Rule** (`microsoft.insights/scheduledQueryRules`) — queries `ContainerAppSystemLogs` in Log Analytics every 5 minutes for `ActivationFailed` events; fires the action group when found

Alert query:
```kusto
ContainerAppSystemLogs
| where TimeGenerated > ago(6m)
| where EnvironmentName == 'cae-<appName>'
| where Reason == 'ActivationFailed' or Message has 'ActivationFailed'
```

**New parameter in `main.bicep`:** `alertEmail string` (required, no default)
**New parameter in `containerapp.bicep`:** `alertEmail string`
**Add to `dev.bicepparam` and `prod.bicepparam`:** `param alertEmail = 'robert.freire@gmail.com'` (actual email to confirm with user)

## Files Modified

| File | Change |
|------|--------|
| `infra/modules/containerapp.bicep` | `activeRevisionsMode: 'Multiple'`; action group + scheduled query rule |
| `infra/main.bicep` | Add `alertEmail` param; pass to containerApp module |
| `infra/parameters/dev.bicepparam` | Add `alertEmail` |
| `infra/parameters/prod.bicepparam` | Add `alertEmail` |
| `.github/workflows/backend.yml` | Health-gate + traffic-shift logic after update |

## No new modules / files needed

All alert resources go in `containerapp.bicep` since they depend on the Log Analytics workspace and Container App defined there.

## Acceptance Criteria Mapping

| AC | Implementation |
|----|---------------|
| Container App revision policy — failed revisions do not receive traffic | `activeRevisionsMode: 'Multiple'` + workflow only shifts traffic after health gate |
| Previous healthy revision automatically serves when new revision fails | Old revision retains 100% traffic because workflow never shifts; job fails visibly |
| Alert fires when revision enters `ActivationFailed` | Scheduled Query Rule on Log Analytics ContainerAppSystemLogs |
| Alert reaches Robert | Action Group with email |

## Testing

- `az bicep build --file infra/main.bicep` must produce zero warnings/errors
- Backend build + tests unchanged (no backend code changes)
- No frontend changes
- Manual verification: can only be confirmed by deploying a bad revision, which is out of scope for automated tests. The workflow logic is the safety net.
