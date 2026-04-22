---
name: Azure resource names (langteach-dev)
description: Canonical names of all Azure resources in the LangTeach dev environment — use instead of asking the user to look them up
type: reference
---

# LangTeach Dev Environment — Azure Resources

**Subscription context:** resource group `rg-langteach-dev`, region North Europe (SWA in West Europe).

| Resource | Name | Type |
|----------|------|------|
| Resource group | `rg-langteach-dev` | — |
| Key Vault | `kv-lt-dev-5ba22u` | Microsoft.KeyVault/vaults |
| Container Registry | `crlangteachdev` (FQDN: `crlangteachdev.azurecr.io`) | Microsoft.ContainerRegistry/registries |
| Container App (API) | `app-langteach-api-dev` | Microsoft.App/containerApps |
| Container Apps environment | `cae-app-langteach-api-dev` | Microsoft.App/managedEnvironments |
| Log Analytics workspace | `law-app-langteach-api-dev` | Microsoft.OperationalInsights/workspaces |
| SQL Server | `langteach-sql-dev` | Microsoft.Sql/servers |
| SQL Database | `langteachdb` (on `langteach-sql-dev`) | Microsoft.Sql/servers/databases |
| Static Web App (frontend) | `swa-langteach-dev` | Microsoft.Web/staticSites (West Europe) |
| Storage account | `stlangteachdev` | Microsoft.Storage/storageAccounts |
| Speech / Cognitive Services | `speech-langteach-dev` | Microsoft.CognitiveServices/accounts |

## Common commands

Read a Key Vault secret:
```
az keyvault secret show --vault-name kv-lt-dev-5ba22u --name <SecretName> --query value -o tsv
```

List Key Vault secrets:
```
az keyvault secret list --vault-name kv-lt-dev-5ba22u --query "[].name" -o tsv
```

List all resources:
```
az resource list -g rg-langteach-dev -o table
```

## Naming convention

Bicep generates the Key Vault name as `kv-lt-${env}-${take(uniqueString(resourceGroup().id), 6)}` (see `infra/main.bicep:37`). The `5ba22u` suffix is deterministic per resource group — if the RG is ever recreated, the suffix changes and this file must be updated.

## When to update this file

- New Azure resource provisioned in `rg-langteach-dev`
- Resource renamed, deleted, or moved
- New environment added (staging, prod) — add a separate table
