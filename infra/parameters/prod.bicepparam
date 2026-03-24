using '../main.bicep'

param env           = 'prod'
param location      = 'northeurope'
param sqlAdminUser  = 'langteachadmin'
param githubRepoUrl = 'https://github.com/Robert-Freire/langTeachSaaS'
param githubBranch      = 'main'
param swaLocation       = 'westeurope'
param sqlAdminPassword  = readEnvironmentVariable('LANGTEACH_SQL_PASSWORD')
// Set the env var before deploying: $env:LANGTEACH_SQL_PASSWORD="<from Bitwarden: LangTeach SQL Admin>"
param alertEmail        = 'robert.freire@gmail.com'
