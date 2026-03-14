# T2 — Azure Infrastructure Provisioning (Detailed)

> **Parent**: Phase 1 Foundation Plan
> **Effort**: 0.5 days
> **Status**: COMPLETED (2026-03-13)
> **Done when**: All resources provisioned via Bicep, Container App returns HTTP 200, all checklist items verified.

---

## IaC Approach

All Azure resources are declared in **Bicep** files stored in `/infra` in the monorepo. No resources are created manually via CLI or Portal (except resource group creation, which is a prerequisite for any deployment).

**Why Bicep, not CLI scripts:**
- Declarative and idempotent — re-running the deployment updates resources to match the declared state
- Portable — moving to a new tenant is: `az login`, `az group create`, re-run one command
- Versionable — infra changes are PR-reviewed alongside code changes

**Tenant migration procedure:**
1. `az login` in new tenant
2. `az account set --subscription <new-subscription-id>`   # current dev subscription: bab24bda-5316-4e9e-9565-056e5e57e64f
3. `az group create --name rg-langteach-prod --location northeurope`
4. `bash infra/deploy.sh prod` (after setting `LANGTEACH_SQL_PASSWORD` in `infra/.env`)
5. Re-seed Auth0 secrets in Key Vault — see Post-T3 step below

---

## Deviations from Original Plan

| Original | Actual | Reason |
|---|---|---|
| App Service (B1) | Azure Container Apps (consumption) | VS Enterprise subscription has 0 VM quota in all regions for both F1 and B1 |
| West Europe | North Europe | West Europe not accepting new SQL Server instances at time of provisioning |
| Static Web App in North Europe | Static Web App in West Europe | SWA not available in North Europe; supported regions: westeurope, westus2, eastus2, eastasia, centralus |
| Key Vault named `kv-langteach-dev` | Key Vault named `kv-lt-dev-5ba22u` | Global name collision (another subscription held the name in soft-delete state); fixed with `uniqueString()` suffix |
| App Service Key Vault references (`@Microsoft.KeyVault(...)`) | `KeyVaultUri` env var; app reads KV at runtime | Container Apps validates KV references at deploy time — RBAC isn't granted yet at that point (chicken-and-egg). App will use `DefaultAzureCredential` + `AddAzureKeyVault` in T4 |

---

## Repo Structure Added

```
langTeachSaaS/
└── infra/
    ├── main.bicep
    ├── deploy.sh                   # loads infra/.env, runs az deployment group create
    ├── .env                        # gitignored — contains LANGTEACH_SQL_PASSWORD
    ├── .env.example                # committed — shows required variables
    ├── parameters/
    │   ├── dev.bicepparam          # env=dev, location=northeurope, swaLocation=westeurope
    │   └── prod.bicepparam         # env=prod, same locations
    └── modules/
        ├── sql.bicep
        ├── containerapp.bicep      # replaces appservice.bicep
        ├── staticwebapp.bicep
        ├── storage.bicep
        └── keyvault.bicep
```

---

## Resources Provisioned

| Resource | Name | Location | Tier |
|---|---|---|---|
| Resource Group | `rg-langteach-dev` | North Europe | n/a |
| SQL Server | `langteach-sql-dev` | North Europe | n/a |
| SQL Database | `langteachdb` | North Europe | Basic (5 DTU) |
| Container Apps Environment | `cae-app-langteach-api-dev` | North Europe | Consumption |
| Container App | `app-langteach-api-dev` | North Europe | Consumption (0-1 replicas) |
| Log Analytics Workspace | `law-app-langteach-api-dev` | North Europe | PerGB2018 |
| Key Vault | `kv-lt-dev-5ba22u` | North Europe | Standard (RBAC model) |
| Storage Account | `stlangteachdev` | North Europe | Standard LRS |
| Static Web App | `swa-langteach-dev` | West Europe | Free |

**App URL:** `https://app-langteach-api-dev.purplewater-292509f3.northeurope.azurecontainerapps.io`
**SQL FQDN:** `langteach-sql-dev.database.windows.net`
**Key Vault URI:** `https://kv-lt-dev-5ba22u.vault.azure.net/`
**SWA hostname:** `white-cliff-02f270f03.4.azurestaticapps.net`

---

## Key Vault Secrets

Three secrets created by Bicep. Connection string is fully populated. Auth0 values are placeholders until T3.

| Secret Name | Value |
|---|---|
| `ConnectionStrings--Default` | Full SQL connection string (populated) |
| `Auth0--Domain` | `REPLACE_AFTER_T3` |
| `Auth0--Audience` | `REPLACE_AFTER_T3` |

Secret naming uses `--` separator (maps to `:` in .NET config, e.g. `ConnectionStrings:Default`).

---

## Key Vault RBAC

- Model: RBAC (`enableRbacAuthorization: true`) — not legacy access policies
- Container App managed identity granted: `Key Vault Secrets User` role (read-only)
- Developer CLI access: requires separate role assignment — the Bicep only grants the Container App identity

---

## Container App Architecture Notes

- **Placeholder image**: `mcr.microsoft.com/dotnet/samples:aspnetapp` — shows "Welcome to .NET". Replaced by real image in T9.
- **KV integration pattern**: Container App receives `KeyVaultUri` env var. The .NET app will use `DefaultAzureCredential` + `builder.Configuration.AddAzureKeyVault(uri, credential)` in T4 to read secrets at startup.
- **Scale**: `minReplicas: 0` (scales to zero when idle — ~free for dev), `maxReplicas: 1`
- **Smoke test**: HTTP 200 confirmed on Container App URL (placeholder image)
- **Real `/api/health` smoke test**: deferred to T9 when CI/CD deploys the actual image

---

## `.env` File Pattern

Secrets are never passed as CLI arguments. Instead:

1. Copy `infra/.env.example` to `infra/.env` (gitignored)
2. Fill in `LANGTEACH_SQL_PASSWORD` from Bitwarden ("LangTeach SQL Admin")
3. Deploy with `bash infra/deploy.sh dev`

The `dev.bicepparam` file reads the password via `readEnvironmentVariable('LANGTEACH_SQL_PASSWORD')`.

---

## Deployment Command (for reference)

```bash
# First time only — create resource group
az group create --name rg-langteach-dev --location northeurope

# All subsequent deploys (idempotent)
bash infra/deploy.sh dev
```

The `deploy.sh` script loads `.env`, runs the deployment, and prints outputs on completion.

---

## Post-T3 Step — Update Auth0 Secrets

After T3 (Auth0 setup), update the placeholder secrets:

```bash
az keyvault secret set --vault-name kv-lt-dev-5ba22u --name "Auth0--Domain" --value "<your-tenant>.auth0.com"
az keyvault secret set --vault-name kv-lt-dev-5ba22u --name "Auth0--Audience" --value "<your-api-audience>"
```

---

## Manual Step — Dev Machine SQL Firewall

This cannot be declared in Bicep (IP not known at author time). Run once per machine or when your public IP changes:

```bash
az sql server firewall-rule create \
  --resource-group rg-langteach-dev \
  --server langteach-sql-dev \
  --name DevMachine \
  --start-ip-address $(curl -s https://ifconfig.me) \
  --end-ip-address $(curl -s https://ifconfig.me)
```

Current registered IP: `80.1.254.176`

---

## GitHub Secrets Set

| Secret | Set |
|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | ✓ (via `az staticwebapp secrets list` piped to `gh secret set`) |

---

## Verification Results (2026-03-13)

| Check | Result |
|---|---|
| Container App HTTP 200 | ✓ |
| SQL Database status | Online / Basic |
| Storage Account status | Available / Standard LRS / TLS 1.2 |
| Static Web App connected to repo | ✓ Free tier / branch main |
| Key Vault secrets (3) | ✓ Confirmed in deployment `outputResources` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` in GitHub | ✓ |
| Dev machine SQL firewall rule | ✓ IP 80.1.254.176 |

---

## Cost Summary (dev, monthly estimate)

| Resource | Tier | Est. Cost |
|---|---|---|
| Azure SQL Database | Basic (5 DTU) | ~$5 |
| Container Apps | Consumption (scales to 0) | ~$0 dev / pay-per-use |
| Log Analytics | PerGB2018 | ~$0 (minimal ingestion) |
| Static Web Apps | Free | $0 |
| Blob Storage | Standard LRS | <$1 |
| Key Vault | Standard | <$1 |
| **Total** | | **~$6/mo dev** |

---

*Created: March 2026*
*Completed: 2026-03-13*
