using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Tests.Services;

/// <summary>
/// Issue #1166: verbatim originalText echo on a representative B1 (~140-word) redacción
/// must succeed via the real Claude API, after the temperature=0 + delimited-input fix.
/// Opt-in via [SkipIfNoClaudeApiKey].
/// </summary>
public class RedaccionCorrectionVerbatimTests
{
    private static string LoadSeedText(string fileName = "RedaccionMoatSeed.es.txt") =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "TestData", fileName));

    [SkipIfNoClaudeApiKey]
    public async Task Verbatim_OnB1_FixtureSucceeds()
    {
        var seedText = LoadSeedText();
        await using var run = await RunCorregirAsync(seedText, "B1", "German");

        // Issue #1166 scope: the verbatim originalText echo (and therefore the strict
        // ordinal guard in RedaccionCorrectionService) must succeed on a representative
        // ~140-word B1 redacción. The status flipping to Corregida is the proof that the
        // echo passed the guard - that is what this test pins down.
        //
        // Tag count is deliberately NOT asserted here: separate, pre-existing model
        // behavior gives offset-accurate tags only some of the time on longer / accented
        // texts, and the service correctly drops offset-mismatched tags (covered by the
        // BadOffsetTag unit test). That's a different problem from verbatim echo and is
        // tracked in plan/observed-issues.md.
        run.Result.Status.Should().Be(CorrectionStatus.Corregida);
    }

    [SkipIfNoClaudeApiKey]
    public async Task Verbatim_OnB2_180WordFixtureSucceeds()
    {
        // AC #2 from the issue body: "Corregir succeeds on a representative B2 (~180 word)
        // redacción." Same logic as the B1 case - the assertion is that the strict ordinal
        // guard passes on a longer text. Tag count is not asserted (see comment above).
        var seedText = LoadSeedText("RedaccionMoatSeedB2.es.txt");
        await using var run = await RunCorregirAsync(seedText, "B2", "German");

        run.Result.Status.Should().Be(CorrectionStatus.Corregida);
    }

    [SkipIfNoClaudeApiKey]
    public async Task Verbatim_PreservesMisspellingTildeAndPreposition_InOriginalTextEcho()
    {
        // AC #4 from the issue body: misspelling preservation. We seed three auto-fix-tempting
        // errors (`ablar` for `hablar`, `esta` for `está`, `voy en mi casa` for `voy a casa`)
        // and assert each appears verbatim in the persisted MarkedUpOutput's originalText.
        // Going through MarkedUpOutput rather than Result.Tags is intentional: the strict
        // ordinal guard already proves the model echoed studentText byte-for-byte (otherwise
        // the service would have thrown), and the model's tag-offset accuracy on accented
        // text is a separate, pre-existing issue logged in plan/observed-issues.md.
        var text = "Hoy ablar con mi amigo. Mi casa esta cerca del parque. Yo voy en mi casa todos los días.";
        await using var run = await RunCorregirAsync(text, "B1", "German");

        run.Result.Status.Should().Be(CorrectionStatus.Corregida);
        // MarkedUpOutput is the raw JSON written by the service; its originalText must equal
        // studentText byte-for-byte (enforced by the strict ordinal guard during Corregir).
        var markedUp = run.Result.MarkedUpOutput;
        markedUp.Should().NotBeNullOrEmpty();
        markedUp.Should().Contain("\"ablar\"", "the misspelling must be preserved verbatim, not silently fixed to 'hablar'");
        markedUp.Should().Contain("Mi casa esta cerca", "the missing-tilde 'esta' (vs 'está') must be preserved verbatim");
        markedUp.Should().Contain("voy en mi casa", "the wrong-preposition 'en mi casa' must be preserved verbatim");
    }

    private static async Task<CorrectionRun> RunCorregirAsync(string seedText, string cefr, string l1)
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
            Auth0UserId = $"auth0|verbatim-{cefr}-{l1}",
            Email = $"verbatim-{cefr}-{l1}@test.com",
            DisplayName = "Verbatim Test",
            IsApproved = true,
            CreatedAt = now, UpdatedAt = now,
        });
        db.Students.Add(new Student
        {
            Id = studentId,
            TeacherId = teacherId,
            Name = $"Verbatim-{cefr}",
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
            AssignmentTitle = "Verbatim smoke",
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

        // Build a scope factory so the background Task.Run can resolve fresh dependencies.
        var scopeServices = new ServiceCollection();
        scopeServices.AddSingleton<AppDbContext>(_ => new AppDbContext(dbOptions));
        scopeServices.AddSingleton<IClaudeClient>(claude);
        scopeServices.AddSingleton(promptBuilder);
        scopeServices.AddLogging();
        var scopeFactory = new FakeServiceScopeFactory(scopeServices.BuildServiceProvider());

        var service = new RedaccionCorrectionService(db, scopeFactory, promptBuilder,
            NullLogger<RedaccionCorrectionService>.Instance);

        await service.CorregirAsync(teacherId, studentId, correctionId);

        // Background task calls the real Claude API; poll until completed (up to 120s).
        var deadline = DateTime.UtcNow.AddSeconds(120);
        CorrectionDetailDto? detail = null;
        while (DateTime.UtcNow < deadline)
        {
            using var check = new AppDbContext(dbOptions);
            var row = check.Corrections.Include(c => c.Tags).FirstOrDefault(c => c.Id == correctionId);
            if (row?.Status == "Corregida")
            {
                detail = CorrectionDtoMapper.ToDetail(row, row.Tags);
                break;
            }
            await Task.Delay(500);
        }
        if (detail is null) throw new TimeoutException($"Correction {correctionId} never reached Corregida in 120s.");
        return new CorrectionRun(detail, db, sp);
    }

    private sealed record CorrectionRun(
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
