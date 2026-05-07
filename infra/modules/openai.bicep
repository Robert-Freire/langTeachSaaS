param name string
param location string
param keyVaultName string

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

// Write endpoint, key, and deployment name to the existing Key Vault.
// The Container App managed identity already has vault-level Key Vault Secrets User
// access (granted in keyvault.bicep), so no new role assignment is needed here.
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
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
