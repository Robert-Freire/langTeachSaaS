using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Tests.Helpers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Tests.AI;

public class ClaudeApiClientIntegrationTests
{
    private static IClaudeClient BuildRealClient()
    {
        var config = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: true)
            .AddUserSecrets<Program>(optional: true)
            .AddEnvironmentVariables()
            .Build();

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
        return new ClaudeApiClient(factory, NullLogger<ClaudeApiClient>.Instance);
    }

    [SkipIfNoClaudeApiKey]
    public async Task CompleteAsync_WithRealApi_ReturnsNonEmptyContent()
    {
        var client = BuildRealClient();

        var result = await client.CompleteAsync(new ClaudeRequest(
            SystemPrompt: "You are a helpful assistant.",
            UserPrompt:   "Say 'hello' and nothing else.",
            Model:        ClaudeModel.Haiku));

        result.Content.Should().NotBeNullOrWhiteSpace();
        result.InputTokens.Should().BePositive();
        result.OutputTokens.Should().BePositive();
        result.ModelUsed.Should().StartWith("claude-haiku");
    }

    [SkipIfNoClaudeApiKey]
    public async Task StreamAsync_WithRealApi_YieldsChunks()
    {
        var client = BuildRealClient();

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
