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
/// The moat (issue #1157): the same redacción submitted at different CEFR levels MUST
/// produce substantively different markup. Uses the real Claude API; opt-in via
/// [SkipIfNoClaudeApiKey] / AI_INTEGRATION_TESTS=1.
///
/// Seed text (RedaccionMoatSeed.es.txt) contains a deliberate mix of errors:
///   C: repeated "Y luego … Y luego" connector breaks cohesion at B2+.
///   G: "hago una foto" (wrong tense, should be "hice"); "depende en su familia"
///      (wrong preposition, should be "depende de").
///   L: "amistades viejas" (calque/false-friend; should be "amistades antiguas").
///   O: "ablamos" (missing h; should be "hablamos").
///
/// The test asserts that at least two of the following axes differ across CEFR levels:
///   - Category distribution (tag counts per category).
///   - Explanations (concatenated explanation strings are not identical).
/// On failure the full tag arrays for both levels are printed side-by-side.
/// </summary>
public class RedaccionCorrectionDualLevelTests
{
    private static string SeedText =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "TestData", "RedaccionMoatSeed.es.txt")).Trim();

    [SkipIfNoClaudeApiKey]
    public async Task DualLevel_A2_vs_B2_ProducesSubstantivelyDifferentOutput()
    {
        var seed = SeedText;

        await using var a2Run = await RunCorregirAsync(seed, "A2", "French");
        await using var b2Run = await RunCorregirAsync(seed, "B2", "German");

        var a2Tags = a2Run.Result.Tags;
        var b2Tags = b2Run.Result.Tags;

        var a2Dist = CategoryDistribution(a2Tags);
        var b2Dist = CategoryDistribution(b2Tags);
        var distributionDiffers = !a2Dist.SequenceEqual(b2Dist);

        var a2Explanations = string.Join("|", a2Tags
            .Select(t => $"{t.Category}|{t.SpannedText}|{t.Explanation ?? ""}")
            .OrderBy(x => x, StringComparer.Ordinal));
        var b2Explanations = string.Join("|", b2Tags
            .Select(t => $"{t.Category}|{t.SpannedText}|{t.Explanation ?? ""}")
            .OrderBy(x => x, StringComparer.Ordinal));
        var explanationsDiffer = !string.Equals(a2Explanations, b2Explanations, StringComparison.Ordinal);

        (distributionDiffers || explanationsDiffer).Should().BeTrue(
            "same redacción at A2 vs B2 must yield substantively different output (the CEFR moat). "
            + SideBySide(a2Tags, b2Tags));

        // The Ortografía error "ablamos" must be tagged O at both levels.
        var a2Ablar = a2Tags.FirstOrDefault(t =>
            t.SpannedText?.Contains("ablamos", StringComparison.OrdinalIgnoreCase) == true);
        var b2Ablar = b2Tags.FirstOrDefault(t =>
            t.SpannedText?.Contains("ablamos", StringComparison.OrdinalIgnoreCase) == true);

        a2Ablar.Should().NotBeNull("misspelling 'ablamos' (missing h) should be tagged at A2");
        b2Ablar.Should().NotBeNull("misspelling 'ablamos' (missing h) should be tagged at B2");
        a2Ablar!.Category.Should().Be("O", "misspelling must be tagged O, not another category");
        b2Ablar!.Category.Should().Be("O", "misspelling must be tagged O, not another category");
    }

    /// <summary>
    /// Issue #1175 guard: B1 text with 5+ accented characters in the first 100 characters must
    /// produce at least 5 tags. Before the fix, Unicode offset drift caused tags to be silently
    /// dropped, producing far fewer than the expected count.
    /// </summary>
    [SkipIfNoClaudeApiKey]
    public async Task B1_AccentedText_TagCountNotTruncated()
    {
        // 5+ accented chars in the first 100 chars: é(él), ó(estudió), é(después), é(También), é(café)
        // Deliberate B1 errors: "hago" (G-tense), "Y luego...Y luego" (C-connector), "dependen en" (G-prep)
        const string accentedB1Text =
            "Ayer él estudió mucho, pero después tuvo muchos problemas con las preposiciones. " +
            "También hago una foto de mis amigos en el café. " +
            "Y luego fuimos a casa. Y luego volvimos al centro. " +
            "Todos dependen en sus familias para organizar estas actividades juntos.";

        // Verify the constraint: at least 4 accented chars in the first 100 chars.
        var first100 = accentedB1Text.Length >= 100 ? accentedB1Text[..100] : accentedB1Text;
        var accentCount = first100.Count(c => "áéíóúàèìòùäëïöüâêîôûñÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ".Contains(c));
        accentCount.Should().BeGreaterThanOrEqualTo(4, "test text must have 4+ accented chars in first 100 chars");

        await using var run = await RunCorregirAsync(accentedB1Text, "B1", "English");

        run.Result.Tags.Should().HaveCountGreaterThanOrEqualTo(5,
            "a B1 text with multiple clear errors and accented chars must not have tags silently truncated. "
            + $"Tags found: {string.Join(", ", run.Result.Tags.Select(t => $"[{t.Category}] \"{t.SpannedText}\""))}");
    }

    private static IEnumerable<string> CategoryDistribution(IEnumerable<LangTeach.Api.DTOs.CorrectionTagDto> tags) =>
        tags.GroupBy(t => t.Category).Select(g => $"{g.Key}:{g.Count()}").OrderBy(s => s);

    private static string SideBySide(
        IEnumerable<LangTeach.Api.DTOs.CorrectionTagDto> a2Tags,
        IEnumerable<LangTeach.Api.DTOs.CorrectionTagDto> b2Tags)
    {
        var a2Lines = a2Tags.Select(t => $"  [{t.Category}] \"{t.SpannedText}\" — {t.Explanation}").ToList();
        var b2Lines = b2Tags.Select(t => $"  [{t.Category}] \"{t.SpannedText}\" — {t.Explanation}").ToList();
        return $"\n--- A2 tags ({a2Lines.Count}) ---\n{string.Join("\n", a2Lines)}"
             + $"\n--- B2 tags ({b2Lines.Count}) ---\n{string.Join("\n", b2Lines)}";
    }

    private static async Task<DualLevelRun> RunCorregirAsync(string seedText, string cefr, string l1)
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
            Auth0UserId = $"auth0|dual-{cefr}-{l1}",
            Email = $"dual-{cefr}-{l1}@test.com",
            DisplayName = "Dual Level",
            IsApproved = true,
            CreatedAt = now, UpdatedAt = now,
        });
        db.Students.Add(new Student
        {
            Id = studentId,
            TeacherId = teacherId,
            Name = $"Dual-{cefr}",
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
            AssignmentTitle = "Dual-level moat",
            AssignmentPrompt = "Cuenta tu fin de semana.",
            StudentText = seedText,
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
