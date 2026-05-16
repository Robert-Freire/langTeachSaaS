param name string
param location string
param keyVaultName string
param appPrincipalId string

// Built-in role: Key Vault Secrets User — same ID in every Azure tenant
var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

// Computer Vision free tier is F0 (not S0 like OpenAI). S1 is the standard paid tier.
resource computerVision 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: name
  location: location
  kind: 'ComputerVision'
  sku: { name: 'S1' }
  properties: {
    customSubDomainName: name
    publicNetworkAccess: 'Enabled'
  }
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(kv.id, appPrincipalId, kvSecretsUserRoleId)
  scope: kv
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId: appPrincipalId
    principalType: 'ServicePrincipal'
  }
}

resource endpointSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'AzureAIVision--Endpoint'
  properties: { value: computerVision.properties.endpoint }
}

resource apiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'AzureAIVision--Key'
  properties: { value: computerVision.listKeys().key1 }
}

output endpoint string = computerVision.properties.endpoint
