@description('Environment suffix, e.g. dev or prod')
param env string

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('SQL Server administrator login')
param sqlAdminUser string

@description('SQL Server administrator password')
@secure()
param sqlAdminPassword string

@description('GitHub repo URL for Static Web App')
param githubRepoUrl string

@description('GitHub branch to deploy from')
param githubBranch string = 'main'

@description('Azure region for Static Web Apps (limited availability: westeurope, westus2, eastus2, eastasia, centralus)')
param swaLocation string = 'westeurope'

// ── Derived names ─────────────────────────────────────────────────────────────

var sqlServerName = 'langteach-sql-${env}'
var sqlDbName     = 'langteachdb'
var appName       = 'app-langteach-api-${env}'
var swaName       = 'swa-langteach-${env}'
var storageName   = 'stlangteach${env}'
// Key Vault names are globally unique — use a hash suffix to avoid collisions
var keyVaultName  = 'kv-lt-${env}-${take(uniqueString(resourceGroup().id), 6)}'
// ACR names: 5-50 chars, alphanumeric only, globally unique
var acrName = 'crlangteach${env}'

// ── Modules ───────────────────────────────────────────────────────────────────

module sql 'modules/sql.bicep' = {
  name: 'sql'
  params: {
    serverName: sqlServerName
    databaseName: sqlDbName
    adminUser: sqlAdminUser
    adminPassword: sqlAdminPassword
    location: location
  }
}

module containerApp 'modules/containerapp.bicep' = {
  name: 'containerapp'
  params: {
    name: appName
    location: location
    keyVaultName: keyVaultName
  }
}

// ACR is deployed after containerApp so it can use the managed identity principal ID.
// The login server URL is computed above to avoid a circular dependency.
module acr 'modules/acr.bicep' = {
  name: 'acr'
  params: {
    name: acrName
    location: location
    containerAppPrincipalId: containerApp.outputs.principalId
  }
}

module kv 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    name: keyVaultName
    location: location
    sqlConnectionString: 'Server=tcp:${sqlServerName}.${environment().suffixes.sqlServerHostname},1433;Initial Catalog=${sqlDbName};User ID=${sqlAdminUser};Password=${sqlAdminPassword};Encrypt=True;Connection Timeout=30;'
    appPrincipalId: containerApp.outputs.principalId
  }
}

module swa 'modules/staticwebapp.bicep' = {
  name: 'staticwebapp'
  params: {
    name: swaName
    location: swaLocation
    githubRepoUrl: githubRepoUrl
    githubBranch: githubBranch
  }
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    accountName: storageName
    location: location
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

output appUrl             string = containerApp.outputs.appUrl
output sqlServerFqdn      string = sql.outputs.serverFqdn
output keyVaultUri        string = kv.outputs.keyVaultUri
output acrLoginServer     string = acr.outputs.loginServer
output acrName            string = acr.outputs.acrName
@secure()
output swaDeploymentToken string = swa.outputs.deploymentToken
