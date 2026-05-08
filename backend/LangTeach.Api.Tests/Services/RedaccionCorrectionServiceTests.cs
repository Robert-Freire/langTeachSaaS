using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class RedaccionCorrectionServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly StubClaudeClient _claude = new();
    private readonly RedaccionCorrectionService _sut;
    private readonly Guid _teacherId = Guid.NewGuid();
    private readonly Guid _studentId = Guid.NewGuid();

    public RedaccionCorrectionServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);

        var sps = new SectionProfileService(NullLogger<SectionProfileService>.Instance);
        var pedagogy = new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, sps);
        var promptBuilder = new RedaccionCorrectionPromptBuilder(pedagogy,
            NullLogger<RedaccionCorrectionPromptBuilder>.Instance);

        _sut = new RedaccionCorrectionService(_db, _claude, promptBuilder,
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
    public async Task CorregirAsync_HappyPath_FlipsToCorregidaWithTags()
    {
        var text = "Hoy ablar con mi amigo.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);

        _claude.EnqueueResponse(BuildAiJson(text, new[]
        {
            ("O", text.IndexOf("ablar"), text.IndexOf("ablar") + "ablar".Length, "ablar",
                "Falta la 'h'.", "hablar"),
        }));

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);

        result.Status.Should().Be(CorrectionStatus.Corregida);
        result.Tags.Should().HaveCount(1);
        result.Tags[0].Category.Should().Be("O");
        result.Tags[0].SpannedText.Should().Be("ablar");
        result.Tags[0].Explanation.Should().Be("Falta la 'h'.");
        result.Tags[0].CorrectedForm.Should().Be("hablar");
        result.MarkedUpOutput.Should().Contain("\"category\":\"O\"");

        var row = _db.Corrections.Include(c => c.Tags).First(c => c.Id == id);
        row.CorrectedAt.Should().NotBeNull();
        row.Tags.Should().HaveCount(1);
    }

    [Fact]
    public async Task CorregirAsync_NonJsonResponse_502InvalidJson_StatusReverts()
    {
        var id = SeedCorrection(text: "Texto.", status: CorrectionStatus.Entregada);
        _claude.EnqueueResponse("definitely not JSON");

        var ex = await Assert.ThrowsAsync<CorrectionGenerationException>(() =>
            _sut.CorregirAsync(_teacherId, _studentId, id));
        ex.Code.Should().Be("invalid_json");

        var row = _db.Corrections.First(c => c.Id == id);
        row.Status.Should().Be(CorrectionStatus.Entregada);
        row.CorrectedAt.Should().BeNull();
        _db.CorrectionTags.Where(t => t.CorrectionId == id).Should().BeEmpty();
    }

    [Fact]
    public async Task CorregirAsync_ParaphrasedOriginalText_502OriginalTextMismatch()
    {
        var id = SeedCorrection(text: "Texto original.", status: CorrectionStatus.Entregada);
        _claude.EnqueueResponse(BuildAiJson("Different text.", Array.Empty<(string, int, int, string, string, string)>()));

        var ex = await Assert.ThrowsAsync<CorrectionGenerationException>(() =>
            _sut.CorregirAsync(_teacherId, _studentId, id));
        ex.Code.Should().Be("original_text_mismatch");

        var row = _db.Corrections.First(c => c.Id == id);
        row.Status.Should().Be(CorrectionStatus.Entregada);
    }

    [Fact]
    public async Task CorregirAsync_BadOffsetTag_DroppedSurvivorsPersist()
    {
        var text = "Hoy ablar.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);

        // First tag has a bogus offset (out of range); second tag is valid.
        _claude.EnqueueResponse(BuildAiJson(text, new[]
        {
            ("O", 100, 110, "ablar", "Bad offset.", "hablar"),
            ("O", text.IndexOf("ablar"), text.IndexOf("ablar") + "ablar".Length, "ablar",
                "Falta la 'h'.", "hablar"),
        }));

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);
        result.Tags.Should().HaveCount(1);
        result.Tags[0].StartIndex.Should().Be(text.IndexOf("ablar"));
    }

    [Fact]
    public async Task CorregirAsync_OverlappingTags_SecondDropped()
    {
        var text = "Hoy ablar con amigos.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        _claude.EnqueueResponse(BuildAiJson(text, new[]
        {
            ("O", 4, 9, "ablar", "Falta h.", "hablar"),
            ("G", 6, 12, "lar co", "Bad overlap.", "lar co"),
        }));

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);
        result.Tags.Should().HaveCount(1);
        result.Tags[0].Category.Should().Be("O");
    }

    [Fact]
    public async Task CorregirAsync_MuyBienWithExplanation_CoercedToNull()
    {
        var text = "El subjuntivo está bien usado.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        _claude.EnqueueResponse(BuildAiJson(text, new[]
        {
            ("MuyBien", 3, 13, "subjuntivo", "Should be null.", "should also be null"),
        }));

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);
        result.Tags.Should().HaveCount(1);
        result.Tags[0].Explanation.Should().BeNull();
        result.Tags[0].CorrectedForm.Should().BeNull();
    }

    [Fact]
    public async Task CorregirAsync_NonMuyBienBlankExplanation_TagDropped()
    {
        var text = "Texto con error.";
        var id = SeedCorrection(text: text, status: CorrectionStatus.Entregada);
        _claude.EnqueueResponse(BuildAiJson(text, new[]
        {
            ("G", 0, 5, "Texto", "", "Texto"),
        }));

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);
        result.Tags.Should().BeEmpty();
        result.Status.Should().Be(CorrectionStatus.Corregida);
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
        _claude.EnqueueResponse(BuildAiJson(text, new[]
        {
            ("O", oStart, oEnd, "Misspelll", "tilde/letras.", "Mispell"),
            ("G", gStart, gEnd, "voy en casa", "Preposición.", "voy a casa"),
            ("L", lStart, lEnd, "hago una foto", "Calque.", "saco una foto"),
            ("C", cStart, cEnd, "entonces", "Conector.", "luego"),
        }));

        var result = await _sut.CorregirAsync(_teacherId, _studentId, id);
        result.Tags.Select(t => t.Category).Should().Equal("O", "G", "L", "C");
    }

    // ----- helpers -----

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
        string originalText,
        IEnumerable<(string category, int start, int end, string spanned, string explanation, string correctedForm)> tags) =>
        JsonSerializer.Serialize(new
        {
            schemaVersion = 1,
            originalText,
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
