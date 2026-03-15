using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Tests.AI;

/// <summary>
/// Integration tests that exercise PromptService + ClaudeApiClient against the real Anthropic API.
/// Skipped automatically in CI (no key). Run locally via:
///   dotnet user-secrets set "Claude:ApiKey" "sk-ant-..." --project backend/LangTeach.Api
/// </summary>
public class PromptServiceIntegrationTests
{
    private static (IClaudeClient client, IPromptService prompts, bool hasKey) BuildClients()
    {
        var config = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: true)
            .AddUserSecrets<Program>(optional: true)
            .AddEnvironmentVariables()
            .Build();

        var apiKey = config["Claude:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return (null!, null!, false);

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
        var client = new ClaudeApiClient(sp.GetRequiredService<IHttpClientFactory>(), NullLogger<ClaudeApiClient>.Instance);
        var prompts = new PromptService();
        return (client, prompts, true);
    }

    /// <summary>
    /// Strips markdown code fences (```json ... ```) that Haiku sometimes adds despite instructions.
    /// T13's response parser will do the same before deserializing.
    /// </summary>
    private static string StripCodeFences(string text)
    {
        var trimmed = text.Trim();
        if (trimmed.StartsWith("```"))
        {
            var firstNewline = trimmed.IndexOf('\n');
            var lastFence = trimmed.LastIndexOf("```");
            if (firstNewline > 0 && lastFence > firstNewline)
                return trimmed[(firstNewline + 1)..lastFence].Trim();
        }
        return trimmed;
    }

    private static bool IsValidJson(string text)
    {
        try { JsonDocument.Parse(StripCodeFences(text)); return true; }
        catch { return false; }
    }

    // Scenario 1: English A2, Portuguese speaker, Vocabulary
    [Fact]
    public async Task Scenario1_Vocabulary_A2_PortugueseSpeaker()
    {
        var (client, prompts, hasKey) = BuildClients();
        if (!hasKey) return;

        var ctx = new GenerationContext(
            Language: "English",
            CefrLevel: "A2",
            Topic: "at the football stadium",
            Style: "Conversational",
            DurationMinutes: 60,
            StudentName: "João",
            StudentNativeLanguage: "Portuguese",
            StudentInterests: ["football", "sports"],
            StudentGoals: ["improve everyday conversation"],
            StudentWeaknesses: ["articles"],
            ExistingNotes: null
        );

        var req = prompts.BuildVocabularyPrompt(ctx);
        var response = await client.CompleteAsync(req, CancellationToken.None);

        response.Content.Should().NotBeNullOrWhiteSpace();
        IsValidJson(response.Content).Should().BeTrue(
            $"Expected valid JSON but got: {response.Content[..Math.Min(200, response.Content.Length)]}");

        using var doc = JsonDocument.Parse(StripCodeFences(response.Content));
        doc.RootElement.TryGetProperty("items", out var items).Should().BeTrue("vocabulary response should have 'items'");
        items.GetArrayLength().Should().BeInRange(5, 20);
    }

    // Scenario 2: Spanish B1, English speaker, Grammar
    [Fact]
    public async Task Scenario2_Grammar_B1_EnglishSpeaker_Subjunctive()
    {
        var (client, prompts, hasKey) = BuildClients();
        if (!hasKey) return;

        var ctx = new GenerationContext(
            Language: "Spanish",
            CefrLevel: "B1",
            Topic: "the subjunctive mood",
            Style: "Formal",
            DurationMinutes: 60,
            StudentName: "James",
            StudentNativeLanguage: "English",
            StudentInterests: ["cooking", "travel"],
            StudentGoals: ["pass DELE B2"],
            StudentWeaknesses: ["subjunctive", "ser vs estar"],
            ExistingNotes: null
        );

        var req = prompts.BuildGrammarPrompt(ctx);
        var response = await client.CompleteAsync(req, CancellationToken.None);

        response.Content.Should().NotBeNullOrWhiteSpace();
        IsValidJson(response.Content).Should().BeTrue(
            $"Expected valid JSON but got: {response.Content[..Math.Min(200, response.Content.Length)]}");

        using var doc = JsonDocument.Parse(StripCodeFences(response.Content));
        doc.RootElement.TryGetProperty("title", out _).Should().BeTrue();
        doc.RootElement.TryGetProperty("examples", out var examples).Should().BeTrue();
        examples.GetArrayLength().Should().BeGreaterThanOrEqualTo(3);
    }

    // Scenario 6: English B1, Full lesson plan, Japanese speaker
    [Fact]
    public async Task Scenario6_LessonPlan_B1_JapaneseSpeaker()
    {
        var (client, prompts, hasKey) = BuildClients();
        if (!hasKey) return;

        var ctx = new GenerationContext(
            Language: "English",
            CefrLevel: "B1",
            Topic: "watching anime and discussing plot",
            Style: "Conversational",
            DurationMinutes: 60,
            StudentName: "Yuki",
            StudentNativeLanguage: "Japanese",
            StudentInterests: ["anime", "manga", "gaming"],
            StudentGoals: ["speak naturally with friends"],
            StudentWeaknesses: ["articles", "phrasal verbs"],
            ExistingNotes: null
        );

        var req = prompts.BuildLessonPlanPrompt(ctx);
        var response = await client.CompleteAsync(req, CancellationToken.None);

        response.Content.Should().NotBeNullOrWhiteSpace();
        IsValidJson(response.Content).Should().BeTrue(
            $"Expected valid JSON but got: {response.Content[..Math.Min(200, response.Content.Length)]}");

        using var doc = JsonDocument.Parse(StripCodeFences(response.Content));
        doc.RootElement.TryGetProperty("title", out _).Should().BeTrue();
        doc.RootElement.TryGetProperty("sections", out var sections).Should().BeTrue();
        sections.TryGetProperty("warmUp", out _).Should().BeTrue();
        sections.TryGetProperty("production", out _).Should().BeTrue();
    }
}
