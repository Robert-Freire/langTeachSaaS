# Disaster Recovery Guide

## Recovery Objectives

| Tier | Component | RPO | RTO |
|------|-----------|-----|-----|
| CRITICAL | SQL database | 24h (weekly BACPAC) / 7 days geo-backup | 2h |
| CRITICAL | Auth0 tenant config | latest commit | 30min |
| HIGH | Blob storage (materials) | hours (GRS async) | 1h |
| HIGH | Secrets (Key Vault) | latest committed infra | 30min |
| LOW | Container image | latest stable tag in ACR | 15min |

## Important Notes

- **Key Vault purge protection is irreversible.** Once `enablePurgeProtection: true` is applied it cannot be disabled. The vault and its secrets cannot be permanently deleted within the 90-day soft-delete retention window. This is intentional and correct.
- **GRS replication lag.** After enabling GRS on the storage account, the secondary replica may take several hours to reach full parity with the primary. The first RPO window after enabling GRS is longer than steady-state.
- **BACPAC consistency.** `az sql db export` runs against the live database and captures a transactionally consistent snapshot via SQL Server's internal mechanism. At low-traffic periods (02:00 UTC Sunday) this is acceptable; it is not equivalent to a quiesced dump.

## Applying IaC Changes Without a Full Bicep Redeploy

The bicep modules are the source of truth for future full deploys. To apply individual changes safely to the running prod environment without risking secret overwrites, use these targeted CLI commands.

```bash
# 1. SQL geo-redundant backup
az sql db update \
  --name langteachdb \
  --server langteach-sql-prod \
  --resource-group rg-langteach-prod \
  --backup-storage-redundancy Geo

# 2. Storage: upgrade to GRS
az storage account update \
  --name stlangteachprod \
  --resource-group rg-langteach-prod \
  --sku Standard_GRS

# 3. Storage: enable blob soft-delete (14-day retention)
az storage blob service-properties delete-policy update \
  --account-name stlangteachprod \
  --enable true \
  --days-retained 14

# 4. Storage: create backups container (idempotent)
az storage container create \
  --name backups \
  --account-name stlangteachprod

# 5. Key Vault: enable purge protection (IRREVERSIBLE)
#    Look up the actual KV name first:
KV=$(az keyvault list --resource-group rg-langteach-prod --query "[0].name" -o tsv)
echo "Key Vault: $KV"
az keyvault update \
  --name "$KV" \
  --resource-group rg-langteach-prod \
  --enable-purge-protection true
```

After applying step 5, update `KEY_VAULT_NAME` in `.github/workflows/db-backup.yml` with the actual vault name and commit.

## Resource Inventory

| Resource | Name | Resource Group |
|----------|------|----------------|
| SQL Server | `langteach-sql-prod` | `rg-langteach-prod` |
| SQL Database | `langteachdb` | `rg-langteach-prod` |
| Storage Account | `stlangteachprod` | `rg-langteach-prod` |
| Key Vault | `kv-lt-prod-<hash>` (look up in Azure portal) | `rg-langteach-prod` |
| Container App | `app-langteach-api-prod` | `rg-langteach-prod` |
| ACR | `crlangteachprod` | `rg-langteach-prod` |
| Static Web App | `swa-langteach-prod` | `rg-langteach-prod` |

Credentials: stored in Bitwarden under "LangTeach" collection.

---

## Scenario 1: Full Environment Rebuild

Use when the entire resource group is lost or corrupted.

### Prerequisites

Set environment variables before deploying:

```powershell
$env:LANGTEACH_SQL_PASSWORD   = "<from Bitwarden: LangTeach SQL Admin>"
$env:LANGTEACH_AUTH0_DOMAIN   = "<Auth0 prod domain>"
$env:LANGTEACH_AUTH0_AUDIENCE = "https://api.langteach.io"
$env:LANGTEACH_SWA_URL_PROD   = "<prod SWA URL>"
```

### Steps

1. Create resource group if missing:
   ```bash
   az group create --name rg-langteach-prod --location northeurope
   ```

2. Deploy bicep:
   ```bash
   az deployment group create \
     --resource-group rg-langteach-prod \
     --template-file infra/main.bicep \
     --parameters infra/parameters/prod.bicepparam
   ```

3. Provision Key Vault secrets (done automatically by bicep for connection strings and Auth0 values). Verify with `validate-secrets` GitHub Actions job.

4. Restore SQL database (see Scenario 2).

5. Push latest container image:
   - Trigger backend CI/CD by pushing a commit to `main`, or manually via `workflow_dispatch`.

6. Restore blob storage (see Scenario 3).

7. Reconfigure Static Web App deployment token:
   - Get new token from Azure portal > SWA > Manage deployment token.
   - Update `AZURE_STATIC_WEB_APPS_API_TOKEN` GitHub secret.

---

## Scenario 2: SQL Database Restore

### Option A: From geo-redundant backup (Azure-managed, last 7 days)

In Azure portal: SQL server > Databases > Restore, choose a restore point. Or:

```bash
az sql db restore \
  --dest-name langteachdb-restored \
  --name langteachdb \
  --server langteach-sql-prod \
  --resource-group rg-langteach-prod \
  --time "<ISO8601 timestamp>"
```

Then rename/swap once validated.

### Option B: From weekly BACPAC (backups container in storage)

1. Find the latest BACPAC in `stlangteachprod/backups/`:
   ```bash
   az storage blob list \
     --account-name stlangteachprod \
     --container-name backups \
     --query "reverse(sort_by([], &properties.lastModified))[0].name" \
     -o tsv
   ```

2. Download locally:
   ```bash
   az storage blob download \
     --account-name stlangteachprod \
     --container-name backups \
     --name "<blob-name>" \
     --file restore.bacpac
   ```

3. Import into SQL:
   ```bash
   az sql db import \
     --admin-user langteachadmin \
     --admin-password "<SQL password>" \
     --auth-type Sql \
     --storage-key "<storage key>" \
     --storage-key-type StorageAccessKey \
     --storage-uri "https://stlangteachprod.blob.core.windows.net/backups/<blob-name>" \
     --resource-group rg-langteach-prod \
     --server langteach-sql-prod \
     --name langteachdb
   ```

---

## Scenario 3: Blob Storage Restore

Storage uses GRS; Azure fails over automatically for availability events. For data corruption:

1. Access the secondary endpoint (read-only until failover):
   `https://stlangteachprod-secondary.blob.core.windows.net`

2. For a full account failover (causes potential data loss of async-replicated writes):
   ```bash
   az storage account failover --name stlangteachprod --resource-group rg-langteach-prod
   ```

3. After failover, account becomes LRS in the new primary region. Re-enable GRS:
   ```bash
   az storage account update --name stlangteachprod --resource-group rg-langteach-prod --sku Standard_GRS
   ```

---

## Scenario 4: Key Vault Recovery

With `enableSoftDelete` and `enablePurgeProtection` enabled:

- Deleted secrets are retained for 7 days in soft-delete state.
- Purge protection prevents permanent deletion within the retention window.

To recover a deleted secret:
```bash
az keyvault secret recover --vault-name <kv-name> --name <secret-name>
```

To recover a deleted Key Vault:
```bash
az keyvault recover --name <kv-name>
```

---

## Scenario 5: Auth0 Tenant Recovery

Auth0 tenant configuration is version-controlled in `auth0/tenant/`.

1. Log into Auth0 Management API and ensure the deploy application exists.
2. Deploy committed config:
   ```bash
   npm install -g auth0-deploy-cli
   a0deploy import \
     --config_file auth0/config.json \
     --input_file  auth0/tenant \
     --env AUTH0_DOMAIN="<domain>" AUTH0_CLIENT_ID="<id>" AUTH0_CLIENT_SECRET="<secret>" ENV=prod
   ```

### Initial Export (one-time setup)

Run this once to populate `auth0/tenant/` with the current tenant state:

1. Create an Auth0 Machine-to-Machine application with Management API access (scopes: all).
2. Configure credentials in `auth0/config.json` (or env vars).
3. Export:
   ```bash
   npm install -g auth0-deploy-cli
   a0deploy export \
     -c auth0/config.json \
     --format directory \
     --output_folder auth0/tenant
   ```
4. Review and commit the exported files.

Required GitHub secrets for CI deployment:
- `AUTH0_PROD_DOMAIN`
- `AUTH0_DEPLOY_CLIENT_ID`
- `AUTH0_DEPLOY_CLIENT_SECRET`

---

## Recovery Drill Checklist

Run this drill before each major sprint, targeting the **dev** environment.

- [ ] Tear down `rg-langteach-dev` (or a dedicated drill RG).
- [ ] Rebuild using bicep from scratch (Scenario 1 steps).
- [ ] Import latest BACPAC from dev backups container (Scenario 2B).
- [ ] Verify application health via the `/health` endpoint.
- [ ] Verify Auth0 login works end-to-end.
- [ ] Document time taken and any manual steps needed.
- [ ] Update this doc with findings.

Last drill performed: _not yet performed_
