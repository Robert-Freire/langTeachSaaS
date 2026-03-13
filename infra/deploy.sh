#!/usr/bin/env bash
# Usage: ./infra/deploy.sh [dev|prod]
# Loads infra/.env, then deploys the Bicep stack for the given environment.

set -euo pipefail

ENV=${1:-dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy infra/.env.example to infra/.env and fill in the values."
  exit 1
fi

# Load .env (skip blank lines and comments)
set -o allexport
# shellcheck source=/dev/null
source "$ENV_FILE"
set +o allexport

RG="rg-langteach-$ENV"

echo "Deploying environment: $ENV -> resource group: $RG"

az deployment group create \
  --resource-group "$RG" \
  --template-file "$SCRIPT_DIR/main.bicep" \
  --parameters "$SCRIPT_DIR/parameters/$ENV.bicepparam"

echo "Done. Outputs:"
az deployment group show \
  --resource-group "$RG" \
  --name main \
  --query "properties.outputs" \
  -o json
