using '../main.bicep'

param env           = 'prod'
param location      = 'northeurope'
param sqlAdminUser  = 'langteachadmin'
param githubRepoUrl = 'https://github.com/Robert-Freire/langTeachSaaS'
param githubBranch      = 'main'
param swaLocation       = 'westeurope'
param sqlAdminPassword  = readEnvironmentVariable('LANGTEACH_SQL_PASSWORD')
// Set env vars before deploying:
//   $env:LANGTEACH_SQL_PASSWORD    = "<from Bitwarden: LangTeach SQL Admin>"
//   $env:LANGTEACH_AUTH0_DOMAIN    = "<from Bitwarden: LangTeach Auth0 Prod Domain>"
//   $env:LANGTEACH_AUTH0_AUDIENCE  = "https://api.langteach.io"
//   $env:LANGTEACH_SWA_URL_PROD    = "<prod SWA URL from Azure portal>"
param alertEmail        = 'robert.freire@gmail.com'
param auth0Domain       = readEnvironmentVariable('LANGTEACH_AUTH0_DOMAIN')
param auth0Audience     = readEnvironmentVariable('LANGTEACH_AUTH0_AUDIENCE')
param allowedOriginSwa  = readEnvironmentVariable('LANGTEACH_SWA_URL_PROD')
// Object ID of the GitHub Actions OIDC service principal (az ad sp show --id $AZURE_CLIENT_ID --query id -o tsv)
param backupServicePrincipalId = '1ab59fda-472d-438e-9ee3-c939debd746e'
