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

public class RedaccionCorrectionServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly DbContextOptions<AppDbContext> _dbOptions;
    private readonly StubClaudeClient _claude = new();
    private readonly ICorrectionPromptService _correctionPromptService;
    private readonly StubUsageLimitService _usage = new();
    private readonly IPedagogyConfigService _pedagogy;
    private readonly RedaccionCorrectionService _sut;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();

    public RedaccionCorrectionServiceTests()
    {
        _dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(_dbOptions);

        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        _pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var pedagogy = _pedagogy;
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
        scopeServices.AddSingleton(_correctionPromptService);
        scopeServices.AddLogging();
        var scopeProvider = scopeServices.BuildServiceProvider();
        var scopeFactory = new FakeServiceScopeFactory(scopeProvider);

        _sut = new RedaccionCorrectionService(_db, scopeFactory, _usage,
            NullLogger<RedaccionCorrectionService>.Instance);

        SeedStudent();
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task CorregirAsync_NotFound_Throws()
    {
        await Assert.ThrowsAsync<CorrectionNotFoundException>(() =>
            _sut.CorregirAsync(_teacherId, _studentId, Guid.NewGuid()));
    }

    [Fact]
    public async Task CorregirAsync_PendienteStatus_Throws409()
    {
        var id = SeedCorrection(text: null, status: CorrectionStatus.Pendiente);

        var ex = await Assert.ThrowsAsync<CorrectionInvalidStateException>(() =>
            _sut.CorregirAsync(_teacherId, _studentId, id));
        ex.Code.Should().Be("no_student_text");
    }

    [Fact]
    public async Task CorregirAsync_AlreadyCorregida_Throws409()
    {
        var id = SeedCorrection(text: "Texto.", status: CorrectionStatus.Corregida);

        var ex = await Assert.ThrowsAsync<CorrectionInvalidStateException>(() =>
            _sut.CorregirAsync(_teacherId, _studentId, id));
        ex.Code.Should().Be("already_corrected");
    }

    [Fact]
    public async Task CorregirAsync_HappyPath_ReturnsEncoladaImmediately()
    {
        var text = "Hoy ablar con mi amigo.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);

        _claude.EnqueueResponse(BuildAiJson(new[]
        {
            ("O", text.IndexOf("ablar"), text.IndexOf("ablar") + "ablar".Length, "ablar",
                "Falta la 'h'.", "hablar"),
        }));

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);
        result.Status.Should().Be(CorrectionStatus.Encolada);
        _claude.CompleteCallCount.Should().Be(0, "CorregirAsync only enqueues; execution is the worker's job");

        // Simulate worker claiming and running the correction.
        SetStatusToCorrigiendo(id);
        await RunExecutionAsync(id);

        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);
        row.Status.Should().Be(CorrectionStatus.Corregida);
        row.CorrectedAt.Should().NotBeNull();
        row.Tags.Should().HaveCount(1);
        row.Tags.First().Category.Should().Be("O");
        row.Tags.First().SpannedText.Should().Be("ablar");
    }

    [Fact]
    public async Task CorregirAsync_OverMonthlyQuota_ThrowsAndDoesNotEnqueueOrRecord()
    {
        _usage.CanGenerate = false;
        var id = SeedCorrection(text: "Hoy fui al parque.", status: CorrectionStatus.Entregada);

        var ex = await Assert.ThrowsAsync<CorrectionQuotaExceededException>(() =>
            _sut.CorregirAsync(_teacherId, _studentId, id));
        ex.UsageStatus.Should().NotBeNull();

        // No transition (still Entregada) and no usage recorded: the correction was refused.
        using var check = new AppDbContext(_dbOptions);
        check.Corrections.First(c => c.Id == id).Status.Should().Be(CorrectionStatus.Entregada);
        _usage.RecordCount.Should().Be(0);
    }

    [Fact]
    public async Task CorregirAsync_UnderQuota_FirstAttempt_RecordsExactlyOnce()
    {
        var id = SeedCorrection(text: "Hoy fui al parque.", status: CorrectionStatus.Entregada);

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);

        result.Status.Should().Be(CorrectionStatus.Encolada);
        _usage.RecordCount.Should().Be(1, "a first correction attempt counts once against the monthly quota");
        _usage.RecordedBlockTypes.Should().ContainSingle().Which.Should().Be(ContentBlockType.ErrorCorrection);
    }

    [Fact]
    public async Task CorregirAsync_RetryAfterFailedCorrection_DoesNotReRecord()
    {
        // A CorreccionFallida -> Encolada retry must not double-charge: the first attempt
        // already consumed the quota unit (#1223).
        var id = SeedCorrection(text: "Hoy fui al parque.", status: CorrectionStatus.CorreccionFallida);

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);

        result.Status.Should().Be(CorrectionStatus.Encolada);
        _usage.RecordCount.Should().Be(0);
    }

    [Fact]
    public async Task CorregirAsync_IdempotentOnInFlight_NotGatedAndNotRecorded_EvenWhenOverQuota()
    {
        // The gate sits after the status validation, so a re-corregir on an in-flight correction
        // returns the existing state without being blocked or recording, even over quota.
        _usage.CanGenerate = false;
        var id = SeedCorrection(text: "Hoy fui al parque.", status: CorrectionStatus.Corrigiendo);

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);

        result.Status.Should().Be(CorrectionStatus.Corrigiendo);
        _usage.RecordCount.Should().Be(0);
    }

    [Fact]
    public async Task RunCorrectionInScopeAsync_NonJsonResponse_ThrowsForWorkerToHandle()
    {
        // RunCorrectionInScopeAsync propagates exceptions; the worker sets CorreccionFallida.
        var id = SeedCorrection(text: "Texto.", status: CorrectionStatus.Entregada);
        SetStatusToCorrigiendo(id);
        _claude.EnqueueResponse("definitely not JSON");

        await Assert.ThrowsAnyAsync<Exception>(() => RunExecutionAsync(id));
    }

    [Fact]
    public async Task RunCorrectionInScopeAsync_BadSchemaVersion_Throws()
    {
        var id = SeedCorrection(text: "Texto original.", status: CorrectionStatus.Entregada);
        SetStatusToCorrigiendo(id);
        _claude.EnqueueResponse("""{"schemaVersion":99,"tags":[]}""");

        await Assert.ThrowsAsync<InvalidOperationException>(() => RunExecutionAsync(id));
        _claude.CompleteCallCount.Should().Be(1, "no retry loop -- single call");
    }

    [Fact]
    public async Task RunCorrectionInScopeAsync_BadOffsetTag_DroppedSurvivorsPersist()
    {
        var text = "Hoy ablar.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        SetStatusToCorrigiendo(id);

        _claude.EnqueueResponse(BuildAiJson(new[]
        {
            ("O", 100, 110, "ablar", "Bad offset.", "hablar"),
            ("O", text.IndexOf("ablar"), text.IndexOf("ablar") + "ablar".Length, "ablar",
                "Falta la 'h'.", "hablar"),
        }));

        await RunExecutionAsync(id);

        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);
        row.Tags.Should().HaveCount(1);
        row.Tags.First().StartIndex.Should().Be(text.IndexOf("ablar"));
    }

    [Fact]
    public async Task RunCorrectionInScopeAsync_OverlappingTags_SecondDropped()
    {
        var text = "Hoy ablar con amigos.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        SetStatusToCorrigiendo(id);
        _claude.EnqueueResponse(BuildAiJson(new[]
        {
            ("O", 4, 9, "ablar", "Falta h.", "hablar"),
            ("G", 6, 12, "lar co", "Bad overlap.", "lar co"),
        }));

        await RunExecutionAsync(id);

        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);
        row.Tags.Should().HaveCount(1);
        row.Tags.First().Category.Should().Be("O");
    }

    [Fact]
    public async Task RunCorrectionInScopeAsync_MuyBienFromPass1_Dropped()
    {
        var text = "El subjuntivo está bien usado.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        SetStatusToCorrigiendo(id);
        _claude.EnqueueResponse(BuildAiJson(new[]
        {
            ("MuyBien", 3, 13, "subjuntivo", "Should be null.", "should also be null"),
        }));

        await RunExecutionAsync(id);

        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);
        row.Tags.Should().BeEmpty("Pass-1 MuyBien hallucination must be dropped");
    }

    [Fact]
    public async Task RunCorrectionInScopeAsync_BlankExplanation_TagDropped()
    {
        var text = "Texto con error.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        SetStatusToCorrigiendo(id);
        _claude.EnqueueResponse(BuildAiJson(new[]
        {
            ("G", 0, 5, "Texto", "", "Texto"),
        }));

        await RunExecutionAsync(id);

        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);
        row.Tags.Should().BeEmpty();
        row.Status.Should().Be(CorrectionStatus.Corregida);
    }

    [Fact]
    public async Task RunCorrectionInScopeAsync_ConcurrentCompletion_AbortsWithoutDuplicateTags()
    {
        var text = "Hoy ablar.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        SetStatusToCorrigiendo(id);

        _claude.DuringCompleteAsync = async () =>
        {
            using var concurrentDb = new AppDbContext(_dbOptions);
            var concurrent = await concurrentDb.Corrections.FirstAsync(c => c.Id == id);
            concurrent.Status = CorrectionStatus.Corregida;
            concurrent.CorrectedAt = DateTime.UtcNow;
            concurrentDb.CorrectionTags.Add(new CorrectionTag
            {
                Id = Guid.NewGuid(), CorrectionId = id, Category = "O",
                StartIndex = 4, EndIndex = 9, SpannedText = "ablar",
                Explanation = "Concurrent call.", CorrectedForm = "hablar", OrderIndex = 0,
            });
            await concurrentDb.SaveChangesAsync();
        };
        _claude.EnqueueResponse(BuildAiJson(new[]
        {
            ("O", 4, 9, "ablar", "Stub call.", "hablar"),
        }));

        await RunExecutionAsync(id);

        var tagCount = _db.CorrectionTags.Count(t => t.CorrectionId == id);
        tagCount.Should().Be(1, "TOCTOU guard aborted this run; only concurrent call's tag persisted");
    }

    [Fact]
    public async Task RunCorrectionInScopeAsync_CategoryFidelityGoldenRoundTrip()
    {
        // Asserts the persistence round-trip preserves each category exactly.
        var text = "Misspelll, voy en casa, hago una foto, y entonces fui.";
        var oStart = 0;                                   var oEnd = oStart + "Misspelll".Length;
        var gStart = text.IndexOf("voy en casa");          var gEnd = gStart + "voy en casa".Length;
        var lStart = text.IndexOf("hago una foto");        var lEnd = lStart + "hago una foto".Length;
        var cStart = text.IndexOf("entonces");             var cEnd = cStart + "entonces".Length;

        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        SetStatusToCorrigiendo(id);
        _claude.EnqueueResponse(BuildAiJson(new[]
        {
            ("O", oStart, oEnd, "Misspelll", "tilde/letras.", "Mispell"),
            ("G", gStart, gEnd, "voy en casa", "Preposición.", "voy a casa"),
            ("L", lStart, lEnd, "hago una foto", "Calque.", "saco una foto"),
            ("C", cStart, cEnd, "entonces", "Conector.", "luego"),
        }));

        await RunExecutionAsync(id);

        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);
        row.Tags.OrderBy(t => t.OrderIndex).Select(t => t.Category).Should().Equal("O", "G", "L", "C");
    }

    [Fact]
    public async Task CorregirAsync_OnCorrigiendo_ReturnsExistingRecordIdempotent()
    {
        var id = SeedCorrection(text: "Texto.", status: CorrectionStatus.Corrigiendo);

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);
        result.Status.Should().Be(CorrectionStatus.Corrigiendo);
        _claude.CompleteCallCount.Should().Be(0, "no AI call should be made for idempotent Corrigiendo");
    }

    [Fact]
    public async Task CorregirAsync_OnEncolada_ReturnsExistingRecordIdempotent()
    {
        var id = SeedCorrection(text: "Texto.", status: CorrectionStatus.Encolada);

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);
        result.Status.Should().Be(CorrectionStatus.Encolada);
        _claude.CompleteCallCount.Should().Be(0, "no AI call for idempotent Encolada");
    }

    [Fact]
    public async Task CorregirAsync_ReturnsPersistedStatus_NotTrackedEntity()
    {
        // Regression: CorregirAsync previously returned the tracked entity object, which
        // could show a stale status if changed between setting and returning. Re-fetch ensures
        // the DTO reflects the committed DB state.
        var id = SeedCorrection(text: "Texto.", status: CorrectionStatus.Entregada);

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);

        result.Status.Should().Be(CorrectionStatus.Encolada, "returned DTO must reflect committed state");
    }

    [Fact]
    public async Task RunCorrectionInScopeAsync_ContextBefore_PicksCorrectOccurrenceOverNearer()
    {
        // "es" appears at [10,12) (correct ser use) and [22,24) (actual error).
        // Model offset drifts to 5, nearer to [10,12) than [22,24).
        // contextBefore="y " uniquely identifies the second "es" via combined search.
        var text = "La ciudad es bonita y es en la costa.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        SetStatusToCorrigiendo(id);

        _claude.EnqueueResponse(BuildAiJsonWithContext(
            "G", startIndex: 5, endIndex: 7, spannedText: "es", contextBefore: "y ",
            explanation: "Ubicación requiere estar.", correctedForm: "está"));

        await RunExecutionAsync(id);

        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);
        row.Tags.Should().HaveCount(1);
        row.Tags.First().StartIndex.Should().Be(22, "contextBefore 'y ' uniquely identifies the second 'es'");
    }

    [Fact]
    public async Task RunCorrectionInScopeAsync_NoContextBefore_MultipleOccurrences_UsesProximity()
    {
        var text = "La ciudad es bonita y es en la costa.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        SetStatusToCorrigiendo(id);

        _claude.EnqueueResponse(BuildAiJson(new[]
        {
            ("G", 8, 10, "es", "Usar estar.", "está"),
        }));

        await RunExecutionAsync(id);

        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);
        row.Tags.Should().HaveCount(1);
        row.Tags.First().StartIndex.Should().Be(10, "proximity picks the occurrence nearest to reported offset 8");
    }

    [Fact]
    public async Task RunCorrectionInScopeAsync_ContextBeforeAmbiguous_FallsBackToProximity()
    {
        var text = "y es bonita y es en la costa.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        SetStatusToCorrigiendo(id);

        _claude.EnqueueResponse(BuildAiJsonWithContext(
            "G", startIndex: 12, endIndex: 14, spannedText: "es", contextBefore: "y ",
            explanation: "Usar estar.", correctedForm: "está"));

        await RunExecutionAsync(id);

        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.Include(c => c.Tags).First(c => c.Id == id);
        row.Tags.Should().HaveCount(1);
        row.Tags.First().StartIndex.Should().Be(14, "contextBefore ambiguous so proximity picks nearest to offset 12");
    }

    // ----- helpers -----

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
            _pedagogy, new CorrectionWorkerOptions(),
            NullLogger<RedaccionCorrectionService>.Instance);
    }

    private void SeedStudent()
    {
        _db.Teachers.Add(new Teacher
        {
            Id = _teacherId,
            Auth0UserId = "auth0|redaccion-test",
            Email = "redaccion@test.com",
            DisplayName = "Test Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Students.Add(new Student
        {
            Id = _studentId,
            TeacherId = _teacherId,
            Name = "Sofía",
            LearningLanguage = "Spanish",
            CefrLevel = "A2",
            NativeLanguages = "[\"French\"]",
            Difficulties = "[\"ser vs estar\"]",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();
    }

    private Guid SeedCorrection(string? text, string status)
    {
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;
        _db.Corrections.Add(new Correction
        {
            Id = id,
            TeacherId = _teacherId,
            StudentId = _studentId,
            SchemaVersion = 1,
            Status = status,
            AssignmentTitle = "Test redacción",
            AssignmentPrompt = "Test prompt.",
            StudentText = text,
            CreatedAt = now,
            UpdatedAt = now,
            CorrectedAt = status == CorrectionStatus.Corregida ? now : null,
        });
        _db.SaveChanges();
        return id;
    }

    private static string BuildAiJson(
        IEnumerable<(string category, int start, int end, string spanned, string explanation, string correctedForm)> tags) =>
        JsonSerializer.Serialize(new
        {
            schemaVersion = 1,
            tags = tags.Select(t => new
            {
                category = t.category,
                startIndex = t.start,
                endIndex = t.end,
                spannedText = t.spanned,
                explanation = (string?)(string.IsNullOrEmpty(t.explanation) ? null : t.explanation),
                correctedForm = (string?)(string.IsNullOrEmpty(t.correctedForm) ? null : t.correctedForm),
            }).ToArray(),
        });

    private static string BuildAiJsonWithContext(
        string category, int startIndex, int endIndex, string spannedText, string contextBefore,
        string explanation, string correctedForm) =>
        JsonSerializer.Serialize(new
        {
            schemaVersion = 1,
            tags = new[]
            {
                new
                {
                    category,
                    startIndex,
                    endIndex,
                    spannedText,
                    contextBefore,
                    explanation,
                    correctedForm,
                },
            },
        });
}
