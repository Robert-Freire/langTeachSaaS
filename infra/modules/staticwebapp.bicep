param name string
param location string
param githubRepoUrl string
param githubBranch string

resource swa 'Microsoft.Web/staticSites@2023-01-01' = {
  name: name
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: githubRepoUrl
    branch: githubBranch
    buildProperties: {
      appLocation: '/frontend'
      outputLocation: 'dist'
    }
  }
}

@secure()
output deploymentToken string = swa.listSecrets().properties.apiKey
