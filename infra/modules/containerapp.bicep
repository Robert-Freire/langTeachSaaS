param name string
param location string
param keyVaultName string
param allowedOriginSwa string
param alertEmail string

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
      activeRevisionsMode: 'Multiple'
      ingress: {
        external: true
        targetPort: 5000
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
              name: 'KeyVault__Uri'
              value: keyVaultUri
            }
            {
              name: 'AllowedOrigins__Swa'
              value: allowedOriginSwa
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

resource alertActionGroup 'microsoft.insights/actionGroups@2023-01-01' = {
  name: 'ag-langteach-${name}'
  location: 'global'
  properties: {
    groupShortName: 'lt-alert'
    enabled: true
    emailReceivers: [
      {
        name: 'Robert'
        emailAddress: alertEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

resource activationFailedAlert 'microsoft.insights/scheduledQueryRules@2022-06-15' = {
  name: 'alert-activation-failed-${name}'
  location: location
  properties: {
    displayName: 'Container App ActivationFailed - ${name}'
    description: 'Fires when a Container App revision fails to start (ActivationFailed). The CI/CD health gate prevents traffic from shifting, but this alert ensures visibility for manual investigation.'
    enabled: true
    scopes: [logAnalytics.id]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT6M'
    criteria: {
      allOf: [
        {
          // Note: ContainerAppSystemLogs uses Log_s for the free-text message field.
          // If Azure changes this field name in a future API version, update the query here.
          query: 'ContainerAppSystemLogs | where Log_s contains "ActivationFailed"'
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: [alertActionGroup.id]
    }
    severity: 0
  }
}

output principalId string = app.identity.principalId
output appUrl      string = 'https://${app.properties.configuration.ingress.fqdn}'
