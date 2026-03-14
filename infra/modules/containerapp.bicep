param name string
param location string
param keyVaultName string

var keyVaultUri = 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'law-${name}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource containerEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: 'cae-${name}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource app 'Microsoft.App/containerApps@2023-05-01' = {
  name: name
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
      }
      // ACR registry config is applied by the CI/CD workflow (az containerapp registry add)
      // after ACR and AcrPull role assignment are provisioned.
    }
    template: {
      containers: [
        {
          name: 'api'
          // Placeholder image — replaced by CI/CD pipeline in T9
          image: 'mcr.microsoft.com/dotnet/samples:aspnetapp'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: 'Production'
            }
            {
              // App reads secrets from Key Vault at runtime via DefaultAzureCredential (wired in T4)
              name: 'KeyVaultUri'
              value: keyVaultUri
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
    }
  }
}

output principalId string = app.identity.principalId
output appUrl      string = 'https://${app.properties.configuration.ingress.fqdn}'
