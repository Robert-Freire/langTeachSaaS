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
/// Verifies: O tags always survive, above-level G/L/C tags are persisted as "removed"
/// (hidden from the student view but kept for the teacher all-errors view, #1351), soften
/// converts to MuyBien, filter failure falls open, empty tag list skips the filter call.
/// </summary>
public class RedaccionCorrectionLevelFilterTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly DbContextOptions<AppDbContext> _dbOptions;
    private readonly StubClaudeClient _claude = new();
    private readonly ICorrectionPromptService _correctionPromptService;
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
        var scopeAffirmerBuilder = new RedaccionScopeAffirmerPromptBuilder(pedagogy,
            NullLogger<RedaccionScopeAffirmerPromptBuilder>.Instance);
        _correctionPromptService = new CorrectionPromptService(promptBuilder, filterPromptBuilder, scopeAffirmerBuilder);

        var scopeServices = new ServiceCollection();
        scopeServices.AddTransient<AppDbContext>(_ => new AppDbContext(_dbOptions));
        scopeServices.AddSingleton<IClaudeClient>(_claude);
        scopeServices.AddSingleton<ICorrectionPromptService>(_correctionPromptService);
        scopeServices.AddLogging();
        var scopeFactory = new FakeServiceScopeFactory(scopeServices.BuildServiceProvider());

        _sut = new RedaccionCorrectionService(_db, scopeFactory,
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
        SetStatusToCorrigiendo(id);
        await RunExecutionAsync(id);
        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);

        var kept = row.Tags.Where(t => t.FilterStatus == CorrectionTagFilterStatus.Kept).ToList();
        kept.Should().HaveCount(1, "O tag must survive (kept) even when filter says remove");
        kept[0].Category.Should().Be("O");
        kept[0].SpannedText.Should().Be("ablamos");
        // The above-level G tag is no longer discarded: it is persisted as "removed" (#1351).
        row.Tags.Where(t => t.FilterStatus == CorrectionTagFilterStatus.Removed)
            .Should().ContainSingle(t => t.Category == "G");
    }

    [Fact]
    public async Task LevelFilter_AboveLevelGTag_PersistedAsRemovedHiddenFromStudentView()
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
        SetStatusToCorrigiendo(id);
        await RunExecutionAsync(id);
        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);

        // Hidden from the student view, but persisted (not discarded) so the teacher can see
        // it in the all-errors view, with its original category/explanation intact (#1351).
        row.Tags.Where(t => t.FilterStatus == CorrectionTagFilterStatus.Kept)
            .Should().BeEmpty("above-level G tag must not appear in the student-facing view");
        row.Tags.Should().ContainSingle(t => t.FilterStatus == CorrectionTagFilterStatus.Removed && t.Category == "G");
        row.Tags.First().Explanation.Should().Be("Subjuntivo requerido.");
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
        SetStatusToCorrigiendo(id);
        await RunExecutionAsync(id);
        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);

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
        SetStatusToCorrigiendo(id);
        await RunExecutionAsync(id);
        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);

        row.Tags.Should().HaveCount(1, "fall-open: all tags kept when filter JSON is invalid");
        _claude.CompleteCallCount.Should().Be(3, "Pass 1 + Pass 2 filter (failed gracefully) + ScopeAffirmer (failed gracefully on default response)");
    }

    [Fact]
    public async Task LevelFilter_EmptyTagList_SkipsFilterCall()
    {
        // If Pass 1 produces no tags, the filter must not be called (save the Haiku round-trip).
        var text = "Hoy hablé con mi amigo.";
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        _claude.EnqueueResponse(Pass1Json(text, Array.Empty<(string, int, int, string, string, string)>()));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        SetStatusToCorrigiendo(id);
        await RunExecutionAsync(id);
        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);

        row.Tags.Should().BeEmpty();
        _claude.CompleteCallCount.Should().Be(2, "Pass 1 + ScopeAffirmer (no filter call when tag list is empty; ScopeAffirmer runs on original text)");
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
        SetStatusToCorrigiendo(id);
        await RunExecutionAsync(id);

        // Requests: [0] = Pass1 (correction), [1] = Pass2 (filter), [2] = ScopeAffirmer.
        // Use Requests[1] to assert on the filter prompt specifically.
        _claude.Requests.Should().HaveCountGreaterThanOrEqualTo(2);
        var filterReq = _claude.Requests[1];
        filterReq.Model.Should().Be(ClaudeModel.Haiku, "level filter uses Haiku");
        filterReq.UserPrompt.Should().Contain("A2", "user prompt must include the student's CEFR level");
        filterReq.UserPrompt.Should().Contain("Escribe sobre tu día.", "user prompt must include assignment context for register-aware MuyBien decisions");
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
        SetStatusToCorrigiendo(id);
        await RunExecutionAsync(id);
        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);

        row.Tags.Should().HaveCount(1, "muybien decision produces a MuyBien tag");
        row.Tags.First().Category.Should().Be("MuyBien");
        row.Tags.First().Explanation.Should().BeNull("MuyBien tags have no explanation");
        row.Tags.First().CorrectedForm.Should().BeNull("MuyBien tags have no correctedForm");
    }

    [Fact]
    public async Task LevelFilter_OverformalStructureInInformalTask_NotMuyBien()
    {
        // When the filter returns "remove" for a formal structure in an informal task,
        // the tag must be dropped -- not promoted to MuyBien.
        // Scenario: casual letter, imperfect subjunctive -- over-formal for the register.
        var text = "Si te invitaran, supongo que vendrías.";
        var id = SeedCorrection(text, CorrectionStatus.Entregada, assignmentPrompt: "Escribe una carta informal a un amigo.");

        var lStart = text.IndexOf("Si te invitaran", StringComparison.Ordinal);

        _claude.EnqueueResponse(Pass1Json(text, new[]
        {
            ("L", lStart, lStart + "Si te invitaran".Length, "Si te invitaran",
                "Registro demasiado formal para una carta informal.", "Si te invitaras"),
        }));
        // Filter decides: over-formal for the informal task register; must not be muybien.
        _claude.EnqueueResponse(FilterJson(new[] { (0, "remove", "") }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        SetStatusToCorrigiendo(id);
        await RunExecutionAsync(id);
        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);

        row.Tags.Where(t => t.FilterStatus == CorrectionTagFilterStatus.Kept)
            .Should().BeEmpty("over-formal structure must not appear in the student-facing view");
        var removed = row.Tags.Where(t => t.FilterStatus == CorrectionTagFilterStatus.Removed).ToList();
        removed.Should().ContainSingle();
        removed[0].Category.Should().Be("L", "removed above-level tag keeps its category, not promoted to MuyBien");
    }

    [Fact]
    public async Task LevelFilter_MuyBienFromPass1_DroppedBeforeFilter()
    {
        // MuyBien is not a valid Pass 1 output -- it is produced only by the level filter
        // or ScopeAffirmer. A hallucinated Pass-1 MuyBien must be dropped before the filter.
        var text = "Hoy, sin embargo, me quedé en casa tranquilamente.";
        var id = SeedCorrection(text, CorrectionStatus.Entregada);

        var mbStart = text.IndexOf("sin embargo", StringComparison.Ordinal);

        _claude.EnqueueResponse(Pass1Json(text, new[]
        {
            ("MuyBien", mbStart, mbStart + "sin embargo".Length, "sin embargo", "", ""),
        }));
        // Filter is skipped (no validated tags after the MuyBien is dropped).
        // ScopeAffirmer uses the default response (fails gracefully -> 0 affirmer tags).

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        SetStatusToCorrigiendo(id);
        await RunExecutionAsync(id);
        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);

        row.Tags.Should().BeEmpty("Pass-1 MuyBien hallucination must be dropped");
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
        SetStatusToCorrigiendo(id);
        await RunExecutionAsync(id);
        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);

        var kept = row.Tags.Where(t => t.FilterStatus == CorrectionTagFilterStatus.Kept).ToList();
        kept.Should().HaveCount(1, "O tag falls open (always kept)");
        kept[0].Category.Should().Be("O");
        // G tag removed by filter is now persisted as removed, not discarded (#1351).
        row.Tags.Where(t => t.FilterStatus == CorrectionTagFilterStatus.Removed)
            .Should().ContainSingle(t => t.Category == "G");
    }

    [Theory]
    [InlineData("A1")]
    [InlineData("A2")]
    [InlineData("B1")]
    public async Task LevelFilter_SerEstarGTag_AlwaysKeptEvenWhenFilterSaysRemove(string cefr)
    {
        // Arrange: student at the given level, text has a ser/estar confusion error.
        // Pass 2 says remove -- but the C# bypass must keep it regardless.
        var text = "El café es cerrado los domingos.";

        // Update the pre-seeded student's CEFR level for this theory run.
        var student = _db.Students.First(s => s.Id == _studentId);
        student.CefrLevel = cefr;
        _db.SaveChanges();

        var id = SeedCorrection(text, CorrectionStatus.Entregada);
        var eStart = text.IndexOf("es", StringComparison.Ordinal);

        _claude.EnqueueResponse(Pass1Json(text, new[]
        {
            ("G", eStart, eStart + 2, "es",
                "Confusión entre ser y estar: aquí se necesita 'está' (estar para estados temporales).",
                "está"),
        }));
        _claude.EnqueueResponse(FilterJson(new[] { (0, "remove", "") }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        SetStatusToCorrigiendo(id);
        await RunExecutionAsync(id);
        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);

        row.Tags.Should().HaveCount(1, $"ser/estar G tag must survive at {cefr} even when filter says remove");
        row.Tags.First().Category.Should().Be("G");
        row.Tags.First().SpannedText.Should().Be("es");
    }

    [Fact]
    public void LevelFilterPrompt_SerEstarTag_NoLongerEmitsMarkerInUserPrompt()
    {
        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var builder = new RedaccionLevelFilterPromptBuilder(pedagogy,
            NullLogger<RedaccionLevelFilterPromptBuilder>.Instance);

        var tags = new[]
        {
            new LevelFilterTagInput("G", "es", "Confusión entre ser y estar.", IsSerEstar: true),
            new LevelFilterTagInput("G", "pareces", "Subjuntivo requerido.", IsSerEstar: false),
        };

        var req = builder.BuildWithTool("A2", tags).Request;
        var userPrompt = req.UserPrompt;

        // The [SER/ESTAR] prefix is no longer injected into the user prompt.
        // The structural guard in RedaccionCorrectionService bypasses the filter result
        // unconditionally for IsSerEstar tags -- the model's decision is irrelevant.
        userPrompt.Should().NotContain("[SER/ESTAR]", "prefix was removed as dead prompt weight; structural guard handles it in code");
        userPrompt.Should().ContainEquivalentOf("[0]", "first tag index must still appear");
        userPrompt.Should().ContainEquivalentOf("[1]", "second tag index must still appear");
    }

    [Theory]
    [InlineData("A1")]
    [InlineData("B1")]
    [InlineData("C2")]
    public void LevelFilterPrompt_CalibrationCue_AppearsInUserPrompt(string cefr)
    {
        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var builder = new RedaccionLevelFilterPromptBuilder(pedagogy,
            NullLogger<RedaccionLevelFilterPromptBuilder>.Instance);

        var tags = new[] { new LevelFilterTagInput("G", "hable", "Conjugación incorrecta.") };
        var req = builder.BuildWithTool(cefr, tags).Request;

        req.UserPrompt.Should().Contain($"Level calibration for {cefr}:",
            $"calibration cue for {cefr} must be injected into the user prompt");
    }

    [Fact]
    public void LevelFilterPrompt_B1_DoesNotLeakPipelineDisambiguationNote()
    {
        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var builder = new RedaccionLevelFilterPromptBuilder(pedagogy,
            NullLogger<RedaccionLevelFilterPromptBuilder>.Instance);

        var tags = new[] { new LevelFilterTagInput("G", "hable", "Conjugación incorrecta.") };
        var req = builder.BuildWithTool("B1", tags).Request;

        req.UserPrompt.Should().NotContain("separate pipelines",
            "pipeline-disambiguation note is author-facing and must not reach the model");
    }

    [Fact]
    public void LevelFilterPrompt_B1_CuandoSubjuntivoIsInScope()
    {
        // Issue #1263: B1 correction filter prompt must include cuando + subjuntivo in the in-scope list
        // so the filter LLM knows to validate (not suppress) correct B1 subjunctive usage.
        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var builder = new RedaccionLevelFilterPromptBuilder(pedagogy,
            NullLogger<RedaccionLevelFilterPromptBuilder>.Instance);

        var tags = new[] { new LevelFilterTagInput("G", "cuando llegues", "Construccion temporal con subjuntivo.") };
        var req = builder.BuildWithTool("B1", tags).Request;

        var lines = req.UserPrompt.Split('\n');
        var inScopeLine = lines.FirstOrDefault(l => l.StartsWith("Grammar in scope for B1:", StringComparison.OrdinalIgnoreCase));
        inScopeLine.Should().NotBeNull("in-scope line must be present for B1");
        inScopeLine!.ToLowerInvariant().Should().Contain("subjuntivo",
            because: "B1 full receptive scope includes cuando + subjuntivo; the correction filter must see it as in-scope, not only in the out-of-scope list");
    }

    [Fact]
    public void LevelFilterPrompt_A1_SubjuntivoNotInGrammarInScope()
    {
        // A1 does not have subjuntivo in grammarInScope -- it appears only in grammarOutOfScope.
        // The filter prompt must not list subjuntivo as an in-scope structure for A1.
        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var builder = new RedaccionLevelFilterPromptBuilder(pedagogy,
            NullLogger<RedaccionLevelFilterPromptBuilder>.Instance);

        var tags = new[] { new LevelFilterTagInput("G", "ojala vengas", "Subjuntivo presente.") };
        var req = builder.BuildWithTool("A1", tags).Request;

        var lines = req.UserPrompt.Split('\n');
        var inScopeLine = lines.FirstOrDefault(l => l.StartsWith("Grammar in scope for A1:", StringComparison.OrdinalIgnoreCase));
        inScopeLine.Should().NotBeNull("in-scope line must be present for A1");
        inScopeLine!.ToLowerInvariant().Should().NotContain("subjuntivo",
            because: "subjuntivo is not in A1 grammarInScope and must not appear in the in-scope part of the prompt");
    }

    [Fact]
    public void LevelFilterPrompt_ContainsAffirmativeSoftenTrigger()
    {
        // Issue #1215: the level filter must include an affirmative soften trigger so the model
        // acknowledges intentional above-scope attempts rather than silently removing them.
        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var builder = new RedaccionLevelFilterPromptBuilder(pedagogy,
            NullLogger<RedaccionLevelFilterPromptBuilder>.Instance);
        var tags = new[] { new LevelFilterTagInput("G", "hubiera ido", "Condicional compuesto") };

        var req = builder.BuildWithTool("A2", tags).Request;

        req.SystemPrompt.Should().Contain("soften", "level filter must have a soften decision");
        req.SystemPrompt.Should().Contain("intentional effort", "soften trigger must reference intentional effort by the student");
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

    private void SetStatusToCorrigiendo(Guid correctionId)
    {
        var row = _db.Corrections.First(c => c.Id == correctionId);
        row.Status = CorrectionStatus.Corrigiendo;
        _db.SaveChanges();
    }

    private async Task RunExecutionAsync(Guid correctionId)
    {
        using var db = new AppDbContext(_dbOptions);
        var correction = await db.Corrections.FirstAsync(c => c.Id == correctionId);
        await RedaccionCorrectionService.RunCorrectionInScopeAsync(
            correctionId, correction.StudentId, correction.TeacherId,
            db, _claude, _correctionPromptService,
            NullLogger<RedaccionCorrectionService>.Instance);
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
        return $"{{\"decisions\":[{items}]}}";
    }
}
