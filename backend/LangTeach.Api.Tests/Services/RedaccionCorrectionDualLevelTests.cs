using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Tests.Services;

/// <summary>
/// The moat (issue #1153 acceptance criterion #1): the same redacción submitted at
/// different CEFR levels MUST produce substantively different markup. These tests use
/// the real Claude API and are opt-in via [SkipIfNoClaudeApiKey].
///
/// Seed text contains a deliberate mix of errors:
///   - "ablar" (h missing) → expected category O (ortografía).
///   - "voy en mi casa" (wrong preposition) → expected G.
///   - "hago una foto" (calque from French "faire une photo") → expected L.
///   - missing connector between two sentences → expected C at B2+.
/// </summary>
public class RedaccionCorrectionDualLevelTests
{
    private const string SeedText =
        "Ayer ablar con mi amigo. Voy en mi casa después de el trabajo. Hago una foto bonita.";

    [SkipIfNoClaudeApiKey]
    public async Task DualLevel_A2_vs_B2_FrenchL1_ProducesSubstantivelyDifferentOutput()
    {
        await using var a2 = await RunCorregirAsync("A2", "French");
        await using var b2 = await RunCorregirAsync("B2", "French");

        var a2Tags = a2.Result.Tags;
        var b2Tags = b2.Result.Tags;

        // The moat: at least one of (category distribution, explanation content, ordering)
        // must differ substantively across levels.
        var distributionDiffers = !CategoryDistribution(a2Tags).SequenceEqual(CategoryDistribution(b2Tags));
        var explanationsDiffer = !string.Equals(
            string.Join("|", a2Tags.Select(t => t.Explanation ?? "")),
            string.Join("|", b2Tags.Select(t => t.Explanation ?? "")),
            StringComparison.Ordinal);

        (distributionDiffers || explanationsDiffer).Should().BeTrue(
            "same redacción at A2 vs B2 must yield substantively different output (the moat). "
            + $"A2 tags = [{TagSummary(a2Tags)}], B2 tags = [{TagSummary(b2Tags)}]");

        // Category fidelity: the misspelling "ablar" should be tagged O at both levels.
        var a2Ablar = a2Tags.FirstOrDefault(t => t.SpannedText.Contains("ablar", StringComparison.OrdinalIgnoreCase));
        var b2Ablar = b2Tags.FirstOrDefault(t => t.SpannedText.Contains("ablar", StringComparison.OrdinalIgnoreCase));
        if (a2Ablar is not null) a2Ablar.Category.Should().Be("O", "misspelling 'ablar' must be tagged O, not G");
        if (b2Ablar is not null) b2Ablar.Category.Should().Be("O", "misspelling 'ablar' must be tagged O, not G");
    }

    private static IEnumerable<string> CategoryDistribution(IEnumerable<LangTeach.Api.DTOs.CorrectionTagDto> tags) =>
        tags.GroupBy(t => t.Category).Select(g => $"{g.Key}:{g.Count()}").OrderBy(s => s);

    private static string TagSummary(IEnumerable<LangTeach.Api.DTOs.CorrectionTagDto> tags) =>
        string.Join(", ", tags.Select(t => $"{t.Category}({t.SpannedText})"));

    private static async Task<DualLevelRun> RunCorregirAsync(string cefr, string l1)
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

        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new AppDbContext(dbOptions);

        var teacherId = Guid.NewGuid();
        var studentId = Guid.NewGuid();
        var correctionId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        db.Teachers.Add(new Teacher
        {
            Id = teacherId,
            Auth0UserId = $"auth0|dual-{cefr}",
            Email = $"dual-{cefr}@test.com",
            DisplayName = "Dual Level",
            IsApproved = true,
            CreatedAt = now, UpdatedAt = now,
        });
        db.Students.Add(new Student
        {
            Id = studentId,
            TeacherId = teacherId,
            Name = "Dual",
            LearningLanguage = "Spanish",
            CefrLevel = cefr,
            NativeLanguages = JsonSerializer.Serialize(new[] { l1 }),
            Difficulties = "[]",
            CreatedAt = now, UpdatedAt = now,
        });
        db.Corrections.Add(new Correction
        {
            Id = correctionId,
            TeacherId = teacherId,
            StudentId = studentId,
            SchemaVersion = 1,
            Status = CorrectionStatus.Entregada,
            AssignmentTitle = "Dual-level smoke",
            AssignmentPrompt = "Cuenta tu día.",
            StudentText = SeedText,
            CreatedAt = now, UpdatedAt = now,
        });
        await db.SaveChangesAsync();

        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var promptBuilder = new RedaccionCorrectionPromptBuilder(pedagogy,
            NullLogger<RedaccionCorrectionPromptBuilder>.Instance);
        var claude = new ClaudeApiClient(sp.GetRequiredService<IHttpClientFactory>(),
            NullLogger<ClaudeApiClient>.Instance);

        var service = new RedaccionCorrectionService(db, claude, promptBuilder,
            NullLogger<RedaccionCorrectionService>.Instance);

        var detail = await service.CorregirAsync(teacherId, studentId, correctionId);
        return new DualLevelRun(detail, db, sp);
    }

    private sealed record DualLevelRun(
        LangTeach.Api.DTOs.CorrectionDetailDto Result,
        AppDbContext Db,
        ServiceProvider ServiceProvider) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            await Db.DisposeAsync();
            await ServiceProvider.DisposeAsync();
        }
    }
}
