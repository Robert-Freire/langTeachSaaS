using Microsoft.Extensions.Configuration;
using Xunit;

namespace LangTeach.Api.Tests.Helpers;

/// <summary>
/// Skips the test unless both conditions are met:
///   1. Claude:ApiKey is configured (via user-secrets or environment)
///   2. AI_INTEGRATION_TESTS=1 is set in the environment
///
/// This prevents accidental token consumption in CI or routine test runs.
///
/// To run locally:
///   dotnet user-secrets set "Claude:ApiKey" "sk-ant-..." --project backend/LangTeach.Api
///   $env:AI_INTEGRATION_TESTS = "1"; dotnet test --filter "Category=AIIntegration"
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
internal sealed class SkipIfNoClaudeApiKeyAttribute : FactAttribute
{
    public SkipIfNoClaudeApiKeyAttribute()
    {
        if (Environment.GetEnvironmentVariable("AI_INTEGRATION_TESTS") != "1")
        {
            Skip = "AI integration tests are opt-in. Set AI_INTEGRATION_TESTS=1 to run.";
            return;
        }

        var config = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: true)
            .AddUserSecrets<Program>(optional: true)
            .AddEnvironmentVariables()
            .Build();

        if (string.IsNullOrWhiteSpace(config["Claude:ApiKey"]))
            Skip = "Claude API key not configured. Run: dotnet user-secrets set \"Claude:ApiKey\" \"sk-ant-...\" --project backend/LangTeach.Api";
    }
}
