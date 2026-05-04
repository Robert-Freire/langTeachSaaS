param name string
param location string
@secure()
param sqlConnectionString string
param appPrincipalId string
@description('Object ID of the GitHub Actions service principal that runs the BACPAC backup workflow. When non-empty, grants Key Vault Secrets User so the workflow can read the SQL connection string.')
param backupServicePrincipalId string = ''
@secure()
param storageConnectionString string
param auth0Domain string
param auth0Audience string

// Built-in role: Key Vault Secrets User — same ID in every Azure tenant
var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90  // extended to 90d; purge protection makes this the minimum recovery window
    enablePurgeProtection: true    // irreversible once set — vault cannot be purged within retention window
  }
}

// Grant Container App managed identity read access to secrets
resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(kv.id, appPrincipalId, kvSecretsUserRoleId)
  scope: kv
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId: appPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Grant GitHub Actions OIDC service principal read access so the backup workflow
// can fetch the SQL connection string to run the BACPAC export.
resource backupRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(backupServicePrincipalId)) {
  name: guid(kv.id, backupServicePrincipalId, kvSecretsUserRoleId)
  scope: kv
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId: backupServicePrincipalId
    principalType: 'ServicePrincipal'
  }
}

resource connStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'ConnectionStrings--Default'
  properties: {
    value: sqlConnectionString
  }
}

resource auth0DomainSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'Auth0--Domain'
  properties: {
    value: auth0Domain
  }
}

resource auth0AudienceSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'Auth0--Audience'
  properties: {
    value: auth0Audience
  }
}

resource storageConnStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'AzureBlobStorage--ConnectionString'
  properties: {
    value: storageConnectionString
  }
}

output keyVaultUri string = kv.properties.vaultUri
