using FluentAssertions;
using LangTeach.Api.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Tests.AI;

/// <summary>
/// Integration tests that call the real Anthropic API.
/// Tests are skipped (return early) when Claude:ApiKey is absent from configuration,
/// so CI passes cleanly without a key.
/// To run locally: dotnet user-secrets set "Claude:ApiKey" "sk-ant-..." --project backend/LangTeach.Api
/// </summary>
public class ClaudeApiClientIntegrationTests
{
    private static (IClaudeClient client, bool hasKey) BuildRealClient()
    {
        var config = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: true)
            .AddUserSecrets<Program>(optional: true)
            .AddEnvironmentVariables()
            .Build();

        var apiKey = config["Claude:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return (null!, false);

        var services = new ServiceCollection();
        services.Configure<ClaudeClientOptions>(config.GetSection(ClaudeClientOptions.SectionName));
        services.AddHttpClient("Claude", (sp, client) =>
        {
            var opts = sp.GetRequiredService<IOptions<ClaudeClientOptions>>().Value;
            client.BaseAddress = new Uri(opts.BaseUrl);
            client.DefaultRequestHeaders.Add("x-api-key", opts.ApiKey);
            client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
        });

        var sp = services.BuildServiceProvider();
        var factory = sp.GetRequiredService<IHttpClientFactory>();
        return (new ClaudeApiClient(factory, NullLogger<ClaudeApiClient>.Instance), true);
    }

    [Fact]
    public async Task CompleteAsync_WithRealApi_ReturnsNonEmptyContent()
    {
        var (client, hasKey) = BuildRealClient();
        if (!hasKey) return;

        var result = await client.CompleteAsync(new ClaudeRequest(
            SystemPrompt: "You are a helpful assistant.",
            UserPrompt:   "Say 'hello' and nothing else.",
            Model:        ClaudeModel.Haiku));

        result.Content.Should().NotBeNullOrWhiteSpace();
        result.InputTokens.Should().BePositive();
        result.OutputTokens.Should().BePositive();
        result.ModelUsed.Should().StartWith("claude-haiku");
    }

    [Fact]
    public async Task StreamAsync_WithRealApi_YieldsChunks()
    {
        var (client, hasKey) = BuildRealClient();
        if (!hasKey) return;

        var chunks = new List<string>();
        await foreach (var chunk in client.StreamAsync(new ClaudeRequest(
            SystemPrompt: "You are a helpful assistant.",
            UserPrompt:   "Say 'hello' and nothing else.",
            Model:        ClaudeModel.Haiku)))
        {
            chunks.Add(chunk);
        }

        var joined = string.Join("", chunks);
        joined.Should().NotBeNullOrWhiteSpace();
    }
}
