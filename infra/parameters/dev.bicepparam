using '../main.bicep'

param env           = 'dev'
param location      = 'northeurope'
param sqlAdminUser  = 'langteachadmin'
param githubRepoUrl = 'https://github.com/Robert-Freire/langTeachSaaS'
param githubBranch      = 'main'
param swaLocation       = 'westeurope'
param sqlAdminPassword  = readEnvironmentVariable('LANGTEACH_SQL_PASSWORD')
// Set the env var before deploying: export LANGTEACH_SQL_PASSWORD="<password>"
param alertEmail        = 'robert.freire@gmail.com'
param allowedOriginSwa  = 'https://white-cliff-02f270f03.4.azurestaticapps.net'
param auth0Domain       = 'langteach-dev.eu.auth0.com'
param auth0Audience     = 'https://api.langteach.io'
