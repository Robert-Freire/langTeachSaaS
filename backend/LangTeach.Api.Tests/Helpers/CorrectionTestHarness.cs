using System.Text.Json;
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

namespace LangTeach.Api.Tests.Helpers;

/// <summary>
/// Shared harness for AI integration tests that invoke the correction pipeline against the real
/// Claude API. Extracted from RedaccionCorrectionDualLevelTests and RedaccionCorrectionVerbatimTests
/// which had identical RunCorregirAsync implementations.
/// </summary>
public static class CorrectionTestHarness
{
    /// <summary>
    /// Seeds an in-memory database with a teacher, student, and correction, runs CorregirAsync,
    /// and polls until the correction reaches Corregida status (up to 120s).
    /// </summary>
    /// <param name="seedText">The student text to correct.</param>
    /// <param name="cefr">CEFR level of the student (e.g. "A2", "B1").</param>
    /// <param name="l1">Native language of the student (e.g. "French").</param>
    /// <param name="prefix">Optional prefix for seed identifiers (used in Auth0UserId/Email).</param>
    public static async Task<CorrectionRun> RunCorregirAsync(
        string seedText, string cefr, string l1, string prefix = "harness")
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
            Auth0UserId = $"auth0|{prefix}-{cefr}-{l1}",
            Email = $"{prefix}-{cefr}-{l1}@test.com",
            DisplayName = $"{prefix} Test",
            IsApproved = true,
            CreatedAt = now, UpdatedAt = now,
        });
        db.Students.Add(new Student
        {
            Id = studentId,
            TeacherId = teacherId,
            Name = $"{prefix}-{cefr}",
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
            AssignmentTitle = "AI Integration Test",
            AssignmentPrompt = "Cuenta tu fin de semana.",
            StudentText = seedText,
            CreatedAt = now, UpdatedAt = now,
        });
        await db.SaveChangesAsync();

        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var promptBuilder = new RedaccionCorrectionPromptBuilder(pedagogy,
            NullLogger<RedaccionCorrectionPromptBuilder>.Instance);
        var filterPromptBuilder = new RedaccionLevelFilterPromptBuilder(pedagogy,
            NullLogger<RedaccionLevelFilterPromptBuilder>.Instance);
        var correctionPromptService = new CorrectionPromptService(promptBuilder, filterPromptBuilder);
        var claude = new ClaudeApiClient(sp.GetRequiredService<IHttpClientFactory>(),
            NullLogger<ClaudeApiClient>.Instance);

        var scopeServices = new ServiceCollection();
        scopeServices.AddSingleton<AppDbContext>(_ => new AppDbContext(dbOptions));
        scopeServices.AddSingleton<IClaudeClient>(claude);
        scopeServices.AddSingleton<ICorrectionPromptService>(correctionPromptService);
        scopeServices.AddLogging();
        var scopeFactory = new FakeServiceScopeFactory(scopeServices.BuildServiceProvider());

        var service = new RedaccionCorrectionService(db, scopeFactory,
            NullLogger<RedaccionCorrectionService>.Instance);

        await service.CorregirAsync(teacherId, studentId, correctionId);

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
        if (detail is null)
            throw new TimeoutException($"Correction {correctionId} never reached Corregida in 120s.");

        return new CorrectionRun(detail, db, sp);
    }
}

/// <summary>
/// Disposable result of a CorrectionTestHarness.RunCorregirAsync call.
/// </summary>
public sealed record CorrectionRun(
    CorrectionDetailDto Result,
    AppDbContext Db,
    ServiceProvider ServiceProvider) : IAsyncDisposable
{
    public async ValueTask DisposeAsync()
    {
        await Db.DisposeAsync();
        await ServiceProvider.DisposeAsync();
    }
}
