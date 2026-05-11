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
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var promptBuilder = new RedaccionCorrectionPromptBuilder(pedagogy,
            NullLogger<RedaccionCorrectionPromptBuilder>.Instance);
        var filterPromptBuilder = new RedaccionLevelFilterPromptBuilder(pedagogy,
            NullLogger<RedaccionLevelFilterPromptBuilder>.Instance);

        // Build a FakeServiceScopeFactory so Task.Run inside CorregirAsync can resolve
        // AppDbContext (backed by the same in-memory store) and the stub Claude client.
        // Transient AppDbContext ensures the background task gets a fresh context per use,
        // avoiding change-tracker conflicts with the test's primary _db instance.
        var scopeServices = new ServiceCollection();
        scopeServices.AddTransient<AppDbContext>(_ => new AppDbContext(_dbOptions));
        scopeServices.AddSingleton<IClaudeClient>(_claude);
        scopeServices.AddSingleton(promptBuilder);
        scopeServices.AddSingleton(filterPromptBuilder);
        scopeServices.AddLogging();
        var scopeProvider = scopeServices.BuildServiceProvider();
        var scopeFactory = new FakeServiceScopeFactory(scopeProvider);

        _sut = new RedaccionCorrectionService(_db, scopeFactory, promptBuilder,
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
    public async Task CorregirAsync_HappyPath_ReturnsCorrigiendoThenFlipsToCorregidaWithTags()
    {
        var text = "Hoy ablar con mi amigo.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);

        _claude.EnqueueResponse(BuildAiJson(new[]
        {
            ("O", text.IndexOf("ablar"), text.IndexOf("ablar") + "ablar".Length, "ablar",
                "Falta la 'h'.", "hablar"),
        }));

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);
        result.Status.Should().Be(CorrectionStatus.Corrigiendo);

        // Background task (stub: synchronous) completes quickly.
        var row = await WaitForDbStatusAsync(id, CorrectionStatus.Corregida);

        row.CorrectedAt.Should().NotBeNull();
        row.Tags.Should().HaveCount(1);
        row.Tags.First().Category.Should().Be("O");
        row.Tags.First().SpannedText.Should().Be("ablar");
    }

    [Fact]
    public async Task CorregirAsync_NonJsonResponse_SetsCorreccionFallida()
    {
        var id = SeedCorrection(text: "Texto.", status: CorrectionStatus.Entregada);
        _claude.EnqueueResponse("definitely not JSON");

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);
        result.Status.Should().Be(CorrectionStatus.Corrigiendo);

        await Task.Delay(500);

        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.First(c => c.Id == id);
        row.Status.Should().Be(CorrectionStatus.CorreccionFallida, "background task must surface the failure explicitly");
        row.CorrectedAt.Should().BeNull();
        check.CorrectionTags.Where(t => t.CorrectionId == id).Should().BeEmpty();
    }

    [Fact]
    public async Task CorregirAsync_BadSchemaVersion_SetsCorreccionFallida()
    {
        // When the model returns a response with an unsupported schemaVersion,
        // the background task must surface CorreccionFallida rather than failing silently.
        var id = SeedCorrection(text: "Texto original.", status: CorrectionStatus.Entregada);
        _claude.EnqueueResponse("""{"schemaVersion":99,"tags":[]}""");

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);
        result.Status.Should().Be(CorrectionStatus.Corrigiendo);

        await Task.Delay(500);

        _claude.CompleteCallCount.Should().Be(1, "no retry loop -- single call");
        using var check = new AppDbContext(_dbOptions);
        var row = check.Corrections.First(c => c.Id == id);
        row.Status.Should().Be(CorrectionStatus.CorreccionFallida, "background task must surface the failure explicitly");
        check.CorrectionTags.Where(t => t.CorrectionId == id).Should().BeEmpty();
    }

    [Fact]
    public async Task CorregirAsync_BadOffsetTag_DroppedSurvivorsPersist()
    {
        var text = "Hoy ablar.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);

        // First tag has a bogus offset (out of range); second tag is valid.
        _claude.EnqueueResponse(BuildAiJson(new[]
        {
            ("O", 100, 110, "ablar", "Bad offset.", "hablar"),
            ("O", text.IndexOf("ablar"), text.IndexOf("ablar") + "ablar".Length, "ablar",
                "Falta la 'h'.", "hablar"),
        }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForDbStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().HaveCount(1);
        row.Tags.First().StartIndex.Should().Be(text.IndexOf("ablar"));
    }

    [Fact]
    public async Task CorregirAsync_OverlappingTags_SecondDropped()
    {
        var text = "Hoy ablar con amigos.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        _claude.EnqueueResponse(BuildAiJson(new[]
        {
            ("O", 4, 9, "ablar", "Falta h.", "hablar"),
            ("G", 6, 12, "lar co", "Bad overlap.", "lar co"),
        }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForDbStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().HaveCount(1);
        row.Tags.First().Category.Should().Be("O");
    }

    [Fact]
    public async Task CorregirAsync_MuyBienWithExplanation_CoercedToNull()
    {
        var text = "El subjuntivo está bien usado.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        _claude.EnqueueResponse(BuildAiJson(new[]
        {
            ("MuyBien", 3, 13, "subjuntivo", "Should be null.", "should also be null"),
        }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForDbStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().HaveCount(1);
        row.Tags.First().Explanation.Should().BeNull();
        row.Tags.First().CorrectedForm.Should().BeNull();
    }

    [Fact]
    public async Task CorregirAsync_NonMuyBienBlankExplanation_TagDropped()
    {
        var text = "Texto con error.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        _claude.EnqueueResponse(BuildAiJson(new[]
        {
            ("G", 0, 5, "Texto", "", "Texto"),
        }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForDbStatusAsync(id, CorrectionStatus.Corregida);

        row.Tags.Should().BeEmpty();
        row.Status.Should().Be(CorrectionStatus.Corregida);
    }

    [Fact]
    public async Task CorregirAsync_ConcurrentCallCompletesFirst_AbortsWithoutDuplicateTags()
    {
        var text = "Hoy ablar.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);

        // Simulate a concurrent /corregir call that completes during this one's Claude
        // round-trip: hook into the stub so it flips status + persists tags via a SEPARATE
        // DbContext (mirrors what a parallel HTTP request would do).
        _claude.DuringCompleteAsync = async () =>
        {
            // Mirror a parallel HTTP request: open a separate DbContext on the same
            // in-memory store, claim the correction, persist a tag, dispose.
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

        // CorregirAsync sets to Corrigiendo and fires background task. The DuringCompleteAsync
        // hook runs inside the background task, sets status to Corregida, then the TOCTOU
        // guard in RunCorrectionInScopeAsync sees Corregida (not Corrigiendo) and discards.
        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);
        result.Status.Should().Be(CorrectionStatus.Corrigiendo);

        // Wait for background task to run and discard.
        await Task.Delay(300);

        // The concurrent call's single tag is the only one in the DB; this call's tag
        // was never persisted thanks to the TOCTOU guard.
        var tagCount = _db.CorrectionTags.Count(t => t.CorrectionId == id);
        tagCount.Should().Be(1);
    }

    [Fact]
    public async Task CorregirAsync_CategoryFidelityGoldenRoundTrip()
    {
        // Asserts the persistence round-trip preserves each category exactly. Whether the
        // model assigns the right category given a text is the integration test's job;
        // this test pins that the service does NOT remap or coerce categories.
        var text = "Misspelll, voy en casa, hago una foto, y entonces fui.";
        var oStart = 0;                                   var oEnd = oStart + "Misspelll".Length;
        var gStart = text.IndexOf("voy en casa");          var gEnd = gStart + "voy en casa".Length;
        var lStart = text.IndexOf("hago una foto");        var lEnd = lStart + "hago una foto".Length;
        var cStart = text.IndexOf("entonces");             var cEnd = cStart + "entonces".Length;

        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        _claude.EnqueueResponse(BuildAiJson(new[]
        {
            ("O", oStart, oEnd, "Misspelll", "tilde/letras.", "Mispell"),
            ("G", gStart, gEnd, "voy en casa", "Preposición.", "voy a casa"),
            ("L", lStart, lEnd, "hago una foto", "Calque.", "saco una foto"),
            ("C", cStart, cEnd, "entonces", "Conector.", "luego"),
        }));

        await _sut.CorregirAsync(_teacherId, _studentId, id);
        var row = await WaitForDbStatusAsync(id, CorrectionStatus.Corregida);

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

    // ----- helpers -----

    private async Task<Correction> WaitForDbStatusAsync(Guid correctionId, string expectedStatus,
        int maxWaitMs = 3000, int pollIntervalMs = 30)
    {
        var deadline = DateTime.UtcNow.AddMilliseconds(maxWaitMs);
        while (DateTime.UtcNow < deadline)
        {
            using var check = new AppDbContext(_dbOptions);
            var row = check.Corrections.Include(c => c.Tags).FirstOrDefault(c => c.Id == correctionId);
            if (row?.Status == expectedStatus)
                return row;
            await Task.Delay(pollIntervalMs);
        }
        throw new TimeoutException(
            $"Correction {correctionId} did not reach status '{expectedStatus}' within {maxWaitMs}ms.");
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
}
