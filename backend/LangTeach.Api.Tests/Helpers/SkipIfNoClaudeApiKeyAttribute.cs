using Microsoft.Extensions.Configuration;
using Xunit;

namespace LangTeach.Api.Tests.Helpers;

/// <summary>
/// Skips the test at discovery time when Claude:ApiKey is absent from configuration.
/// Reports as Skipped (not Passed) so integration gaps are visible in CI output.
/// To run locally: dotnet user-secrets set "Claude:ApiKey" "sk-ant-..." --project backend/LangTeach.Api
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
internal sealed class SkipIfNoClaudeApiKeyAttribute : FactAttribute
{
    public SkipIfNoClaudeApiKeyAttribute()
    {
        var config = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: true)
            .AddUserSecrets<Program>(optional: true)
            .AddEnvironmentVariables()
            .Build();

        if (string.IsNullOrWhiteSpace(config["Claude:ApiKey"]))
            Skip = "Claude API key not configured. Run: dotnet user-secrets set \"Claude:ApiKey\" \"sk-ant-...\" --project backend/LangTeach.Api";
    }
}
