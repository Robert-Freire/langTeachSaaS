---
name: No autonomous Azure destructive operations
description: Never run Azure delete commands autonomously — always provide the command and ask the user to run it manually
type: feedback
---

Hard rule from user: never run destructive Azure operations (az group delete, az resource delete, etc.) autonomously. Always provide the command and ask the user to execute it manually.

Applies to: az commands that delete or irreversibly remove resources — matches what the block-azure-destructive.sh hook blocks (delete, group delete, resource delete, role assignment delete, policy assignment delete, ad delete).

Does NOT apply to: az keyvault secret set, az deployment group create, az keyvault secret show, or any other read/write operation that is not destructive. Run these directly without asking.
