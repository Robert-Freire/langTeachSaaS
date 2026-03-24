# Task 223 — CI step to validate required secrets exist in Key Vault before deploy

## Issue
#223 (P2, area:infra) — https://github.com/Robert-Freire/langTeachSaaS/issues/223

## Goal
Add a CI step that validates all required Key Vault secrets exist before deploying to Azure Container Apps.
Prevents the class of incident described in #217 (missing secret causes startup crash after deploy).

## Approach

### Key insight: use the ARM management-plane API, not data-plane
Azure Key Vault has two separate access planes:
- **Management plane** (`management.azure.com`): controlled by ARM RBAC (Contributor role, already granted to CI SP). Returns secret metadata but NOT values.
- **Data plane** (`vault.azure.net`): controlled by KV RBAC roles (Secrets User etc.). Not currently granted to CI SP.

By using `az rest` with the management-plane URL per secret, we can check existence without needing any new Azure permissions. No Bicep changes required.

### Acceptance criteria mapping

| AC | Implementation |
|---|---|
| Manifest file listing required secrets | `infra/required-secrets.json` |
| CI deploy job validates secrets before updating container app | `validate-secrets` job, `deploy` needs it |
| Pipeline fails with actionable error if secret missing | error message lists missing secrets + provisioning command |
| Manifest easy to maintain | one entry per line in JSON array |
| CI has permissions to read KV secret metadata | management-plane API, Contributor role already in place |

## Files changed

| File | Change |
|---|---|
| `infra/required-secrets.json` | New — manifest with 5 required secret names |
| `.github/workflows/backend.yml` | Add `validate-secrets` job; `deploy` needs `[ci, validate-secrets]` |

## Secret name mapping

.NET config key uses `:` separator; Key Vault secret name uses `--` separator:

| .NET config key | KV secret name |
|---|---|
| `ConnectionStrings:Default` | `ConnectionStrings--Default` |
| `Auth0:Domain` | `Auth0--Domain` |
| `Auth0:Audience` | `Auth0--Audience` |
| `Claude:ApiKey` | `Claude--ApiKey` |
| `AzureBlobStorage:ConnectionString` | `AzureBlobStorage--ConnectionString` |

These match what `StartupConfigValidator` (from #220) already validates at runtime.

## Key Vault name resolution
The KV name is generated dynamically by Bicep (`kv-lt-${env}-${uniqueString(...)}`), so it cannot be hardcoded. The `validate-secrets` job will look it up at runtime:
```bash
KV_NAME=$(az keyvault list --resource-group $RESOURCE_GROUP --query "[0].name" -o tsv)
```
This requires only ARM Contributor access (already in place). No new GitHub variable needed.

## Job gating and permissions
The `validate-secrets` job uses the same `if:` condition as `deploy`:
```
if: github.ref == 'refs/heads/main' && github.event_name == 'push' && vars.DEPLOY_FROZEN != 'true'
```
This prevents OIDC login attempts on sprint branch pushes.

The job also needs `permissions: id-token: write` for OIDC Azure login (same as the `deploy` job).

## Out of scope
- Bicep role changes (not needed with management-plane approach)
- Sprint branch runs (validate-secrets is gated to main only)
