param name string
param location string
param keyVaultName string
param appPrincipalId string

// Built-in role: Key Vault Secrets User — same ID in every Azure tenant
var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource openai 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: name
  location: location
  kind: 'OpenAI'
  sku: { name: 'S0' }
  properties: {
    customSubDomainName: name
    publicNetworkAccess: 'Enabled'
  }
}

resource whisperDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openai
  name: 'whisper'
  sku: { name: 'Standard', capacity: 1 }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'whisper'
      version: '001'
    }
    raiPolicyName: 'Microsoft.DefaultV2'
  }
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// Grant Container App managed identity read access to the secrets this module writes.
// The role is vault-scoped so it is idempotent with the grant in keyvault.bicep.
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
  name: 'AzureOpenAIWhisper--Endpoint'
  properties: { value: openai.properties.endpoint }
}

resource apiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'AzureOpenAIWhisper--ApiKey'
  properties: { value: openai.listKeys().key1 }
}

resource deploymentNameSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'AzureOpenAIWhisper--DeploymentName'
  properties: { value: whisperDeployment.name }
}

output endpoint string = openai.properties.endpoint
output deploymentName string = whisperDeployment.name
