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
/// Unit tests for the ScopeAffirmer pass (issue #1286).
/// Verifies: affirmations emitted for above-level structures, hallucinated spans dropped,
/// overlapping spans deduplicated, C2 skipped, long texts skipped, MuyBien Explanation policy.
/// </summary>
public class RedaccionScopeAffirmerTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly DbContextOptions<AppDbContext> _dbOptions;
    private readonly StubClaudeClient _claude = new();
    private readonly RedaccionCorrectionService _sut;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();

    public RedaccionScopeAffirmerTests()
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
        var scopeAffirmerBuilder = new RedaccionScopeAffirmerPromptBuilder(pedagogy,
            NullLogger<RedaccionScopeAffirmerPromptBuilder>.Instance);
        var correctionPromptService = new CorrectionPromptService(promptBuilder, filterPromptBuilder, scopeAffirmerBuilder);

        var scopeServices = new ServiceCollection();
        scopeServices.AddTransient<AppDbContext>(_ => new AppDbContext(_dbOptions));
        scopeServices.AddSingleton<IClaudeClient>(_claude);
        scopeServices.AddSingleton<ICorrectionPromptService>(correctionPromptService);
        scopeServices.AddLogging();
        var scopeFactory = new FakeServiceScopeFactory(scopeServices.BuildServiceProvider());

        _sut = new RedaccionCorrectionService(_db, scopeFactory,
            NullLogger<RedaccionCorrectionService>.Instance);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task ScopeAffirmer_A1Student_CorrectSubjuntivo_EmitsMuyBienWithExplanation()
    {
        // A1 student correctly uses presente de subjuntivo (B1+ structure).
        // ScopeAffirmer should emit a MuyBien tag with a templated Explanation.
        const string text = "Esta semana hice muchas cosas. El lunes fui al mercado con mi madre. El martes estudié español durante dos horas. Me gustó mucho la clase. El miércoles salí con mis amigos al parque. Hacía buen tiempo y el sol brillaba. Jugamos al fútbol y después tomamos un café. El jueves tuve que trabajar hasta las seis de la tarde. Estaba muy cansado pero contento. El viernes por la noche mis amigos organizaron una fiesta. Ojalá vengan todos mis compañeros.";

        SeedStudent("A1");
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        // Pass 1: no errors
        _claude.EnqueueResponse(Pass1Json(text, []));
        // Filter: skipped (no tags)
        // ScopeAffirmer: finds "vengan" as a B1 structure
        var venganStart = text.IndexOf("vengan", StringComparison.Ordinal);
        _claude.EnqueueResponse(ScopeAffirmerJson(new[]
        {
            (venganStart, venganStart + "vengan".Length, "vengan", "presente de subjuntivo", "B1"),
        }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().HaveCount(1, "ScopeAffirmer should emit one MuyBien tag");
        var tag = row.Tags.First();
        tag.Category.Should().Be("MuyBien");
        tag.SpannedText.Should().Be("vengan");
        tag.Explanation.Should().NotBeNull("ScopeAffirmer-path MuyBien carries an Explanation");
        tag.Explanation.Should().Contain("presente de subjuntivo");
        tag.Explanation.Should().Contain("B1");
        tag.Explanation.Should().Contain("A1", "must reference the student's official level");
        tag.CorrectedForm.Should().BeNull();
    }

    [Fact]
    public async Task ScopeAffirmer_FilterPathMuyBien_HasNullExplanation()
    {
        // A filter-path MuyBien (soften decision) must still have null Explanation.
        const string text = "Hoy ablamos con mi amigo. Ojalá mañana podemos ir al cine.";
        SeedStudent("A2");
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        var start = text.IndexOf("ablamos", StringComparison.Ordinal);
        _claude.EnqueueResponse(Pass1Json(text, new[]
        {
            ("G", start, start + "ablamos".Length, "ablamos", "Falta la 'h'.", "hablamos"),
        }));
        // Filter softens the G tag to MuyBien
        _claude.EnqueueResponse(FilterJson(new[] { (0, "soften", "") }));
        // ScopeAffirmer: empty result
        _claude.EnqueueResponse("{\"spans\":[]}");

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().HaveCount(1);
        row.Tags.First().Category.Should().Be("MuyBien");
        row.Tags.First().Explanation.Should().BeNull("filter-path MuyBien must not carry an Explanation");
        row.Tags.First().CorrectedForm.Should().BeNull();
    }

    [Fact]
    public async Task ScopeAffirmer_HallucinatedSpan_DroppedSilently()
    {
        // When ScopeAffirmer returns a span where the spannedText doesn't match the actual
        // text at the claimed indices, the result must be silently dropped.
        const string text = "Hoy he salido con mis amigos al parque.";
        SeedStudent("A1");
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        _claude.EnqueueResponse(Pass1Json(text, []));
        // ScopeAffirmer: hallucinated span (wrong text at those indices)
        _claude.EnqueueResponse("""{"spans":[{"startIndex":5,"endIndex":12,"spannedText":"no_existe","structureLabel":"test","structureLevel":"B1"}]}""");

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().BeEmpty("hallucinated span must be dropped silently");
    }

    [Fact]
    public async Task ScopeAffirmer_OverlapWithExistingTag_AffirmerLoses()
    {
        // When a ScopeAffirmer result overlaps an existing tag from Pass 2, it is dropped.
        const string text = "Hoy ablamos para que no pareces raro.";
        SeedStudent("A2");
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        var gStart = text.IndexOf("para que no pareces", StringComparison.Ordinal);
        var gEnd = gStart + "para que no pareces".Length;
        _claude.EnqueueResponse(Pass1Json(text, new[]
        {
            ("G", gStart, gEnd, "para que no pareces", "Subjuntivo requerido.", "para que no parezcas"),
        }));
        _claude.EnqueueResponse(FilterJson(new[] { (0, "keep", "") }));
        // ScopeAffirmer tries to affirm the same span (overlaps G tag)
        _claude.EnqueueResponse(ScopeAffirmerJson(new[]
        {
            (gStart, gEnd, "para que no pareces", "presente de subjuntivo", "B1"),
        }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().HaveCount(1, "ScopeAffirmer result overlapping a G tag must be dropped");
        row.Tags.First().Category.Should().Be("G", "the G tag must survive; the affirmer span must lose");
    }

    [Fact]
    public async Task ScopeAffirmer_C2Student_NoAffirmerCall()
    {
        // C2 students have nothing above their level; ScopeAffirmer must not be called.
        const string text = "Hoy he salido con mis amigos al parque.";
        SeedStudent("C2");
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        _claude.EnqueueResponse(Pass1Json(text, []));
        // Filter: skipped (no tags). ScopeAffirmer must also be skipped.

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        _claude.CompleteCallCount.Should().Be(1, "C2 student: only Pass 1 call; ScopeAffirmer must be skipped");
    }

    [Fact]
    public async Task ScopeAffirmer_LongText_Skipped()
    {
        // Texts over 800 words must skip ScopeAffirmer to avoid cost spikes.
        var words = Enumerable.Repeat("palabra", 801);
        var text = string.Join(" ", words);
        SeedStudent("A1");
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        _claude.EnqueueResponse(Pass1Json(text, []));
        // Filter: skipped (no tags). ScopeAffirmer: skipped (too long).

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        _claude.CompleteCallCount.Should().Be(1, "long text must skip ScopeAffirmer");
    }

    [Fact]
    public void ScopeAffirmer_PromptBuilder_A1_UsesHaikuModel()
    {
        // ScopeAffirmerPromptBuilder must use Haiku (cost-efficient; enrichment pass).
        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var builder = new RedaccionScopeAffirmerPromptBuilder(pedagogy,
            NullLogger<RedaccionScopeAffirmerPromptBuilder>.Instance);

        var req = builder.BuildWithTool("A1", "Ojalá vengas.", "A2").Request;

        req.Model.Should().Be(ClaudeModel.Haiku, "ScopeAffirmer is an enrichment pass; Haiku is sufficient");
    }

    [Fact]
    public void ScopeAffirmer_PromptBuilder_IncludesStudentAndNextLevelScope()
    {
        // The user prompt must reference both the student's grammar scope and the next level's scope.
        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var builder = new RedaccionScopeAffirmerPromptBuilder(pedagogy,
            NullLogger<RedaccionScopeAffirmerPromptBuilder>.Instance);

        var req = builder.BuildWithTool("A1", "Ojalá vengas.", "A2").Request;

        req.UserPrompt.Should().Contain("A1", "must reference student's level");
        req.UserPrompt.Should().Contain("A2", "must reference next level");
        req.UserPrompt.Should().Contain("in scope", "must include scope lists");
    }

    [Fact]
    public void ScopeAffirmer_NextLevelMapping_CorrectForAllLevels()
    {
        // The NextLevel mapping must cover all non-C2 CEFR levels.
        RedaccionScopeAffirmerPromptBuilder.NextLevel.Should().ContainKey("A1").WhoseValue.Should().Be("A2");
        RedaccionScopeAffirmerPromptBuilder.NextLevel.Should().ContainKey("A2").WhoseValue.Should().Be("B1");
        RedaccionScopeAffirmerPromptBuilder.NextLevel.Should().ContainKey("B1").WhoseValue.Should().Be("B2");
        RedaccionScopeAffirmerPromptBuilder.NextLevel.Should().ContainKey("B2").WhoseValue.Should().Be("C1");
        RedaccionScopeAffirmerPromptBuilder.NextLevel.Should().ContainKey("C1").WhoseValue.Should().Be("C2");
        RedaccionScopeAffirmerPromptBuilder.NextLevel.Should().NotContainKey("C2");
    }

    [Fact]
    public async Task ScopeAffirmer_AffirmerCallFails_PipelineContinues()
    {
        // If the ScopeAffirmer call throws, the pipeline must complete with existing tags intact.
        const string text = "Hoy ablamos con mi amigo.";
        SeedStudent("A2");
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        var oStart = text.IndexOf("ablamos", StringComparison.Ordinal);
        _claude.EnqueueResponse(Pass1Json(text, new[]
        {
            ("O", oStart, oStart + "ablamos".Length, "ablamos", "Falta la 'h'.", "hablamos"),
        }));
        _claude.EnqueueResponse(FilterJson(new[] { (0, "keep", "") }));
        // ScopeAffirmer: invalid JSON (simulates parse failure)
        _claude.EnqueueResponse("NOT JSON AT ALL");

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().HaveCount(1, "pipeline must complete despite ScopeAffirmer parse failure");
        row.Tags.First().Category.Should().Be("O");
    }

    private void SeedStudent(string cefrLevel)
    {
        var now = DateTime.UtcNow;
        _db.Teachers.Add(new Teacher
        {
            Id = _teacherId, Auth0UserId = "auth0|affirmer-test", Email = "affirmer@test.com",
            DisplayName = "Affirmer Test", IsApproved = true, CreatedAt = now, UpdatedAt = now,
        });
        _db.Students.Add(new Student
        {
            Id = _studentId, TeacherId = _teacherId, Name = "Test Student",
            LearningLanguage = "Spanish", CefrLevel = cefrLevel,
            NativeLanguages = "[\"English\"]", Difficulties = "[]",
            CreatedAt = now, UpdatedAt = now,
        });
        _db.SaveChanges();
    }

    private Guid SeedCorrection(string text, string status)
    {
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;
        _db.Corrections.Add(new Correction
        {
            Id = id, TeacherId = _teacherId, StudentId = _studentId,
            SchemaVersion = 1, Status = status,
            AssignmentTitle = "Test", AssignmentPrompt = "Escribe sobre tu semana.",
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
            $"{{\"index\":{d.Index},\"decision\":\"{d.Decision}\"}}"));
        return $"{{\"decisions\":[{items}]}}";
    }

    private static string ScopeAffirmerJson(
        IEnumerable<(int Start, int End, string Span, string Label, string Level)> results)
    {
        var items = string.Join(",", results.Select(r =>
            $"{{\"startIndex\":{r.Start},\"endIndex\":{r.End}," +
            $"\"spannedText\":\"{r.Span}\",\"structureLabel\":\"{r.Label}\",\"structureLevel\":\"{r.Level}\"}}"));
        return $"{{\"spans\":[{items}]}}";
    }
}
