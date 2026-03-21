param name string
param location string
@secure()
param sqlConnectionString string
param appPrincipalId string
@secure()
param storageConnectionString string

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
    softDeleteRetentionInDays: 7
  }
}

// Grant App Service managed identity read access to secrets
resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(kv.id, appPrincipalId, kvSecretsUserRoleId)
  scope: kv
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId: appPrincipalId
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

// Placeholder — update after T3 (Auth0 setup)
resource auth0DomainSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'Auth0--Domain'
  properties: {
    value: 'REPLACE_AFTER_T3'
  }
}

// Placeholder — update after T3 (Auth0 setup)
resource auth0AudienceSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'Auth0--Audience'
  properties: {
    value: 'REPLACE_AFTER_T3'
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
