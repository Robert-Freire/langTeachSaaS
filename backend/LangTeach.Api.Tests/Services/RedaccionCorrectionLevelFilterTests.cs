using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

/// <summary>
/// Unit tests for the Pass 2 level-filter agent (issue #1194).
/// Verifies: O tags always survive, G/L/C tags are filtered, soften converts to MuyBien,
/// filter failure falls open, empty tag list skips the filter call.
/// </summary>
public class RedaccionCorrectionLevelFilterTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly DbContextOptions<AppDbContext> _dbOptions;
    private readonly StubClaudeClient _claude = new();
    private readonly RedaccionCorrectionService _sut;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();

    public RedaccionCorrectionLevelFilterTests()
    {
        _dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(_dbOptions);

        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var promptBuilder = new RedaccionCorrectionPromptBuilder(pedagogy,
            NullLogger<RedaccionCorrectionPromptBuilder>.Instance);
        var filterPromptBuilder = new RedaccionLevelFilterPromptBuilder(pedagogy,
            NullLogger<RedaccionLevelFilterPromptBuilder>.Instance);

        var scopeServices = new ServiceCollection();
        scopeServices.AddTransient<AppDbContext>(_ => new AppDbContext(_dbOptions));
        scopeServices.AddSingleton<IClaudeClient>(_claude);
        scopeServices.AddSingleton(promptBuilder);
        scopeServices.AddSingleton(filterPromptBuilder);
        scopeServices.AddLogging();
        var scopeFactory = new FakeServiceScopeFactory(scopeServices.BuildServiceProvider());

        _sut = new RedaccionCorrectionService(_db, scopeFactory, promptBuilder,
            NullLogger<RedaccionCorrectionService>.Instance);

        SeedStudent(cefrLevel: "A2");
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task LevelFilter_OTagsAlwaysSurvive_EvenWhenFilterSaysRemove()
    {
        // Arrange: A2 student, text has a spelling error (O) and a G error.
        // Pass 1 returns both tags. Filter says remove the O tag (which it must not).
        var text = "Hoy ablamos con mi amigo para que no pareces raro.";
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        var ablamosStart = text.IndexOf("ablamos", StringComparison.Ordinal);
        var paraStart = text.IndexOf("para que no pareces", StringComparison.Ordinal);

        _claude.EnqueueResponse(Pass1Json(text, new[]
        {
            ("O", ablamosStart, ablamosStart + "ablamos".Length, "ablamos", "Falta la 'h'.", "hablamos"),
            ("G", paraStart, paraStart + "para que no pareces".Length, "para que no pareces",
                "Subjuntivo requerido.", "para que no parezcas"),
        }));
        // Filter says remove both -- but O must be kept.
        _claude.EnqueueResponse(FilterJson(new[] { (0, "remove", ""), (1, "remove", "") }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().HaveCount(1, "O tag must survive even when filter says remove");
        row.Tags.First().Category.Should().Be("O");
        row.Tags.First().SpannedText.Should().Be("ablamos");
    }

    [Fact]
    public async Task LevelFilter_AboveLevelGTag_RemovedWhenFilterSaysRemove()
    {
        // Arrange: A2 student, text has only a subjunctive G error (B1 scope).
        var text = "Espero para que no pareces cansado.";
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        var gStart = text.IndexOf("para que no pareces", StringComparison.Ordinal);

        _claude.EnqueueResponse(Pass1Json(text, new[]
        {
            ("G", gStart, gStart + "para que no pareces".Length, "para que no pareces",
                "Subjuntivo requerido.", "para que no parezcas"),
        }));
        _claude.EnqueueResponse(FilterJson(new[] { (0, "remove", "") }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().BeEmpty("above-level G tag must be removed for A2 student");
    }

    [Fact]
    public async Task LevelFilter_SoftenedTag_ConvertedToMuyBien()
    {
        // Arrange: A2 student, text has a subjunctive attempt that deserves acknowledgement.
        var text = "Quiero que vengas a mi casa pronto.";
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        var gStart = text.IndexOf("vengas", StringComparison.Ordinal);

        _claude.EnqueueResponse(Pass1Json(text, new[]
        {
            ("G", gStart, gStart + "vengas".Length, "vengas",
                "Forma de subjuntivo bien usada pero aún fuera de nivel.", "vengas"),
        }));
        _claude.EnqueueResponse(FilterJson(new[]
        {
            (0, "soften", "¡Buen intento! El subjuntivo lo trabajaremos en B1."),
        }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().HaveCount(1, "softened tag becomes a MuyBien highlight");
        row.Tags.First().Category.Should().Be("MuyBien");
        row.Tags.First().SpannedText.Should().Be("vengas");
        row.Tags.First().Explanation.Should().BeNull("MuyBien tags have no explanation");
        row.Tags.First().CorrectedForm.Should().BeNull("MuyBien tags have no correctedForm");
    }

    [Fact]
    public async Task LevelFilter_FilterResponseBadJson_FallsOpenKeepsAllTags()
    {
        // When the filter call returns unparseable content, the service keeps all validated tags.
        var text = "Hoy ablamos con mi amigo.";
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        var start = text.IndexOf("ablamos", StringComparison.Ordinal);

        _claude.EnqueueResponse(Pass1Json(text, new[]
        {
            ("O", start, start + "ablamos".Length, "ablamos", "Falta la 'h'.", "hablamos"),
        }));
        _claude.EnqueueResponse("THIS IS NOT JSON AT ALL");

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().HaveCount(1, "fall-open: all tags kept when filter JSON is invalid");
        _claude.CompleteCallCount.Should().Be(2, "Pass 1 + Pass 2 filter (which failed gracefully)");
    }

    [Fact]
    public async Task LevelFilter_EmptyTagList_SkipsFilterCall()
    {
        // If Pass 1 produces no tags, the filter must not be called (save the Haiku round-trip).
        var text = "Hoy hablé con mi amigo.";
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        _claude.EnqueueResponse(Pass1Json(text, Array.Empty<(string, int, int, string, string, string)>()));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().BeEmpty();
        _claude.CompleteCallCount.Should().Be(1, "only Pass 1 should be called when tag list is empty");
    }

    [Fact]
    public async Task LevelFilter_FilterPrompt_IncludesCefrLevelAndAssignmentContext()
    {
        // Pass 2 prompt must contain the student's CEFR level and the assignment context.
        var text = "Hoy ablamos mucho.";
        var id = SeedCorrection(text, CorrectionStatus.Entregada, assignmentPrompt: "Escribe sobre tu día.");

        var start = text.IndexOf("ablamos", StringComparison.Ordinal);

        _claude.EnqueueResponse(Pass1Json(text, new[]
        {
            ("O", start, start + "ablamos".Length, "ablamos", "Falta la 'h'.", "hablamos"),
        }));
        _claude.EnqueueResponse(FilterJson(new[] { (0, "keep", "") }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        _claude.LastRequest.Should().NotBeNull();
        _claude.LastRequest!.Model.Should().Be(ClaudeModel.Haiku, "level filter uses Haiku");
        _claude.LastRequest.UserPrompt.Should().Contain("A2", "user prompt must include the student's CEFR level");
        _claude.LastRequest.UserPrompt.Should().Contain("Escribe sobre tu día.", "user prompt must include assignment context for register-aware MuyBien decisions");
    }

    [Fact]
    public async Task LevelFilter_MuyBienDecision_ConvertedToMuyBienTag()
    {
        // When Pass 2 emits "muybien" for a tag, it must be converted to a MuyBien highlight.
        var text = "Sin embargo, me parece que la situación es complicada.";
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        var gStart = text.IndexOf("Sin embargo", StringComparison.Ordinal);

        _claude.EnqueueResponse(Pass1Json(text, new[]
        {
            ("C", gStart, gStart + "Sin embargo".Length, "Sin embargo",
                "Conector bien empleado.", "Sin embargo"),
        }));
        _claude.EnqueueResponse(FilterJson(new[]
        {
            (0, "muybien", "¡Muy bien! El uso del conector es muy natural."),
        }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().HaveCount(1, "muybien decision produces a MuyBien tag");
        row.Tags.First().Category.Should().Be("MuyBien");
        row.Tags.First().Explanation.Should().BeNull("MuyBien tags have no explanation");
        row.Tags.First().CorrectedForm.Should().BeNull("MuyBien tags have no correctedForm");
    }

    [Fact]
    public async Task LevelFilter_MuyBienTagPassesThrough_FilterDecisionIgnored()
    {
        // MuyBien tags from Pass 1 (if any reach the filter) always survive regardless of filter decision.
        var text = "Hoy, sin embargo, me quedé en casa tranquilamente.";
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        var mbStart = text.IndexOf("sin embargo", StringComparison.Ordinal);

        _claude.EnqueueResponse(Pass1Json(text, new[]
        {
            ("MuyBien", mbStart, mbStart + "sin embargo".Length, "sin embargo", "", ""),
        }));
        _claude.EnqueueResponse(FilterJson(new[] { (0, "remove", "") }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().HaveCount(1, "MuyBien tag must always pass through the filter");
        row.Tags.First().Category.Should().Be("MuyBien");
    }

    [Fact]
    public async Task LevelFilter_PartialFilterResponse_OmittedIndicesFallOpen()
    {
        // When the filter omits some indices from the response (partial decision list),
        // omitted tags fall open (kept), not silently dropped.
        var text = "Hoy ablamos con mi amigo para que no pareces raro.";
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        var oStart = text.IndexOf("ablamos", StringComparison.Ordinal);
        var gStart = text.IndexOf("para que no pareces", StringComparison.Ordinal);

        _claude.EnqueueResponse(Pass1Json(text, new[]
        {
            ("O", oStart, oStart + "ablamos".Length, "ablamos", "Falta la 'h'.", "hablamos"),
            ("G", gStart, gStart + "para que no pareces".Length, "para que no pareces",
                "Subjuntivo requerido.", "para que no parezcas"),
        }));
        // Filter only returns a decision for index 1 (G tag removed); index 0 (O) is omitted.
        // The O tag is already hardcoded to keep, but index 0 omission still exercises fall-open.
        _claude.EnqueueResponse(FilterJson(new[] { (1, "remove", "") }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().HaveCount(1, "O tag falls open (always kept), G tag removed by filter");
        row.Tags.First().Category.Should().Be("O");
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private void SeedStudent(string cefrLevel = "A2")
    {
        var now = DateTime.UtcNow;
        _db.Teachers.Add(new Teacher
        {
            Id = _teacherId, Auth0UserId = "auth0|filter-test", Email = "filter@test.com",
            DisplayName = "Filter Test", IsApproved = true, CreatedAt = now, UpdatedAt = now,
        });
        _db.Students.Add(new Student
        {
            Id = _studentId, TeacherId = _teacherId, Name = "A2 Student",
            LearningLanguage = "Spanish", CefrLevel = cefrLevel,
            NativeLanguages = "[\"French\"]", Difficulties = "[]",
            CreatedAt = now, UpdatedAt = now,
        });
        _db.SaveChanges();
    }

    private Guid SeedCorrection(string text, string status, string assignmentPrompt = "Escribe.")
    {
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;
        _db.Corrections.Add(new Correction
        {
            Id = id, TeacherId = _teacherId, StudentId = _studentId,
            SchemaVersion = 1, Status = status,
            AssignmentTitle = "Test", AssignmentPrompt = assignmentPrompt,
            StudentText = text, CreatedAt = now, UpdatedAt = now,
        });
        _db.SaveChanges();
        return id;
    }

    private async Task<Correction> WaitForStatusAsync(Guid id, string expected, int timeoutMs = 5000)
    {
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        while (DateTime.UtcNow < deadline)
        {
            using var check = new AppDbContext(_dbOptions);
            var row = check.Corrections.Include(c => c.Tags).FirstOrDefault(c => c.Id == id);
            if (row?.Status == expected)
                return row;
            await Task.Delay(50);
        }
        throw new TimeoutException($"Correction {id} never reached {expected} in {timeoutMs}ms.");
    }

    private static string Pass1Json(
        string originalText,
        IEnumerable<(string Cat, int Start, int End, string Span, string Expl, string Corr)> tags)
    {
        var tagsJson = string.Join(",", tags.Select(t =>
        {
            var expl = string.IsNullOrEmpty(t.Expl) ? "null" : $"\"{t.Expl}\"";
            var corr = string.IsNullOrEmpty(t.Corr) ? "null" : $"\"{t.Corr}\"";
            return $"{{\"category\":\"{t.Cat}\",\"startIndex\":{t.Start},\"endIndex\":{t.End}," +
                   $"\"spannedText\":\"{t.Span}\",\"explanation\":{expl},\"correctedForm\":{corr}}}";
        }));
        var escaped = originalText.Replace("\"", "\\\"").Replace("\n", "\\n");
        return $"{{\"schemaVersion\":1,\"originalText\":\"{escaped}\",\"tags\":[{tagsJson}]}}";
    }

    private static string FilterJson(IEnumerable<(int Index, string Decision, string Note)> decisions)
    {
        var items = string.Join(",", decisions.Select(d =>
        {
            var note = string.IsNullOrEmpty(d.Note) ? "" : $",\"note\":\"{d.Note}\"";
            return $"{{\"index\":{d.Index},\"decision\":\"{d.Decision}\"{note}}}";
        }));
        return $"[{items}]";
    }
}
