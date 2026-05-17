using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using FluentAssertions;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services.CorrectionDocxExport;

namespace LangTeach.Api.Tests.Services;

public class CorrectionDocxExportServiceTests
{
    private readonly CorrectionDocxExportService _svc = new();

    [Fact]
    public void Generate_ProducesDocxThatReopensCleanly()
    {
        var detail = MakeDetail("Hola mundo.", []);
        var bytes = _svc.Generate(detail, "Test Student");

        bytes.Should().NotBeEmpty();
        using var stream = new MemoryStream(bytes);
        using var doc = WordprocessingDocument.Open(stream, isEditable: false);
        doc.MainDocumentPart!.Document!.Body!.ChildElements.OfType<Paragraph>().Should().NotBeEmpty();
    }

    [Fact]
    public void Generate_WithErrorTag_RendersUnderlinedColoredRunWithSuperscriptAndCorrectionSection()
    {
        // "ablar" missing 'h' at index 4 -> O (Ortografía, emerald-500 10B981, DS §11.16)
        const string text = "Hoy ablar con mi amigo.";
        var tag = new CorrectionTagDto("O", "ablar", 4, 9, "Falta la 'h'.", "hablar", 0);
        var detail = MakeDetail(text, [tag]);

        var bytes = _svc.Generate(detail, "Gavin");
        var (texts, runs) = ReadAllRuns(bytes);

        // Section 1: spanned text is underlined + colored, no bold
        var spannedRunIdx = texts.FindIndex(t => t == "ablar");
        spannedRunIdx.Should().BeGreaterThanOrEqualTo(0, "spanned text should appear as its own run");

        var spannedRun = runs[spannedRunIdx];
        spannedRun.RunProperties!.Bold.Should().BeNull("error spans are underlined, not bold");
        spannedRun.RunProperties.Color!.Val!.Value.Should().Be("10B981");
        spannedRun.RunProperties.Underline.Should().NotBeNull();

        // Immediately followed by a superscript run "1"
        (spannedRunIdx + 1).Should().BeLessThan(runs.Count, "span must be followed by superscript");
        var supRun = runs[spannedRunIdx + 1];
        supRun.RunProperties!.VerticalTextAlignment!.Val!.Value.Should().Be(VerticalPositionValues.Superscript);
        string.Concat(supRun.Descendants<Text>().Select(t => t.Text)).Should().Be("1");

        // No inline parenthetical text
        var combined = string.Concat(texts);
        combined.Should().NotContain("(O) corrección:");

        // Section 2: numbered correction entry appears somewhere in document
        combined.Should().Contain("[O]");
        combined.Should().Contain("hablar");
        combined.Should().Contain("Falta la 'h'.");
    }

    [Fact]
    public void Generate_WithMuyBienTag_RendersPlainBoldWithoutParenthetical()
    {
        const string text = "Eso está muy bien escrito.";
        var idx = text.IndexOf("muy bien", StringComparison.Ordinal);
        var tag = new CorrectionTagDto("MuyBien", "muy bien", idx, idx + "muy bien".Length, null, null, 0);
        var detail = MakeDetail(text, [tag]);

        var bytes = _svc.Generate(detail, "Sofía");
        var (texts, runs) = ReadAllRuns(bytes);

        var spannedIdx = texts.FindIndex(t => t == "muy bien");
        spannedIdx.Should().BeGreaterThanOrEqualTo(0);

        var spannedRun = runs[spannedIdx];
        spannedRun.RunProperties!.Bold.Should().NotBeNull();
        spannedRun.RunProperties.Color.Should().BeNull("MuyBien is plain bold, no color");

        var nextRun = spannedIdx + 1 < runs.Count ? runs[spannedIdx + 1] : null;
        if (nextRun is not null)
        {
            nextRun.RunProperties?.VerticalTextAlignment.Should().BeNull("MuyBien must NOT be followed by a superscript ref");
            nextRun.RunProperties?.Italic.Should().BeNull("MuyBien must NOT be followed by a parenthetical");
        }
    }

    [Fact]
    public void Generate_PreservesParagraphBreaks()
    {
        const string text = "Primer párrafo.\n\nSegundo párrafo.";
        var detail = MakeDetail(text, []);
        var bytes = _svc.Generate(detail, "Test");

        using var stream = new MemoryStream(bytes);
        using var doc = WordprocessingDocument.Open(stream, isEditable: false);
        var body = doc.MainDocumentPart!.Document!.Body!;

        var bodyTexts = body.Descendants<Paragraph>()
            .Select(p => string.Concat(p.Descendants<Text>().Select(t => t.Text)))
            .Where(s => s.Contains("párrafo"))
            .ToList();

        bodyTexts.Should().Contain("Primer párrafo.");
        bodyTexts.Should().Contain("Segundo párrafo.");
    }

    [Fact]
    public void Generate_PreservesAccentsAndSpecialChars()
    {
        const string text = "Mañana iré a Sevilla. «¿Cómo estás?»";
        var detail = MakeDetail(text, []);
        var bytes = _svc.Generate(detail, "María José");

        var (texts, _) = ReadAllRuns(bytes);
        var combined = string.Concat(texts);
        combined.Should().Contain("Mañana");
        combined.Should().Contain("«¿Cómo estás?»");
        combined.Should().Contain("María José");
    }

    [Fact]
    public void Generate_WithoutTags_StillProducesValidDocx()
    {
        var detail = MakeDetail("Texto sin marcas.", []);
        var bytes = _svc.Generate(detail, "Solo");

        bytes.Should().NotBeEmpty();
        using var stream = new MemoryStream(bytes);
        WordprocessingDocument.Open(stream, isEditable: false).Dispose();
    }

    [Fact]
    public void Generate_WithoutPrompt_OmitsConsignaParagraph()
    {
        var detail = MakeDetail("Texto.", [], prompt: null);
        var bytes = _svc.Generate(detail, "Test");
        var (texts, _) = ReadAllRuns(bytes);

        string.Concat(texts).Should().NotContain("Consigna:");
    }

    [Fact]
    public void Generate_WithPrompt_IncludesConsignaParagraph()
    {
        var detail = MakeDetail("Texto.", [], prompt: "Describe tu fin de semana.");
        var bytes = _svc.Generate(detail, "Test");
        var (texts, _) = ReadAllRuns(bytes);

        string.Concat(texts).Should().Contain("Consigna: Describe tu fin de semana.");
    }

    [Fact]
    public void Generate_StaysUnder100KbForTypicalCorrection()
    {
        // ~200-word text, 10 tags, realistic prompt: AC requires < 100 KB.
        var words = string.Join(" ", Enumerable.Repeat("palabra", 200));
        var tags = Enumerable.Range(0, 10)
            .Select(i => new CorrectionTagDto(
                Category: i % 2 == 0 ? "G" : "L",
                SpannedText: "palabra",
                StartIndex: i * 8,
                EndIndex: i * 8 + 7,
                Explanation: "Explicación corta del error.",
                CorrectedForm: "palabra",
                OrderIndex: i))
            .ToList();
        var detail = MakeDetail(words, tags, title: new string('a', 50), prompt: new string('p', 200));

        var bytes = _svc.Generate(detail, "Test Student");

        bytes.Length.Should().BeLessThan(100_000);
    }

    [Fact]
    public void Generate_WithOutOfBoundsTag_SkipsTagWithoutThrowing()
    {
        // Defensive: shouldn't happen post-validation, but the export must not 500.
        const string text = "Texto corto.";
        var tag = new CorrectionTagDto("G", "fuera", 100, 105, "x", "y", 0);
        var detail = MakeDetail(text, [tag]);

        var bytes = _svc.Generate(detail, "Test");
        bytes.Should().NotBeEmpty();
        var (texts, _) = ReadAllRuns(bytes);
        string.Concat(texts).Should().NotContain("[G]", "out-of-bounds tag should be skipped entirely");
    }

    // --- helpers ---

    [Fact]
    public void Generate_MuyBienWithExplanation_RendersLogrosDestacadosSection()
    {
        // ScopeAffirmer-origin MuyBien tags carry an Explanation.
        // The DOCX must include a "Logros destacados" section listing them.
        const string text = "Ojalá vengan todos mis amigos a la fiesta.";
        var idx = text.IndexOf("vengan", StringComparison.Ordinal);
        var explanation = "¡Bien hecho! Usaste presente de subjuntivo -- una estructura de B1. " +
                          "Aunque está por encima de tu nivel oficial (A1), lo aplicaste correctamente.";
        var tag = new CorrectionTagDto("MuyBien", "vengan", idx, idx + "vengan".Length, explanation, null, 0);
        var detail = MakeDetail(text, [tag]);

        var bytes = _svc.Generate(detail, "Ana");
        var (texts, _) = ReadAllRuns(bytes);
        var combined = string.Concat(texts);

        combined.Should().Contain("Logros destacados", "ScopeAffirmer MuyBien must trigger the Logros section");
        combined.Should().Contain("vengan", "the spanned text must appear in the Logros entry");
        combined.Should().Contain("presente de subjuntivo", "the explanation must appear in the Logros entry");
    }

    [Fact]
    public void Generate_MuyBienWithNullExplanation_NoLogrosSection()
    {
        // Filter-path MuyBien (Explanation = null) must NOT trigger a Logros section.
        const string text = "Eso está muy bien escrito aquí.";
        var idx = text.IndexOf("muy bien", StringComparison.Ordinal);
        var tag = new CorrectionTagDto("MuyBien", "muy bien", idx, idx + "muy bien".Length, null, null, 0);
        var detail = MakeDetail(text, [tag]);

        var bytes = _svc.Generate(detail, "Test");
        var (texts, _) = ReadAllRuns(bytes);
        var combined = string.Concat(texts);

        combined.Should().NotContain("Logros destacados", "filter-path MuyBien (null Explanation) must not produce a Logros section");
    }

    private static CorrectionDetailDto MakeDetail(
        string text,
        IReadOnlyList<CorrectionTagDto> tags,
        string title = "Carta a un extraterrestre",
        string? prompt = "Escribe una carta de ~150 palabras.")
    {
        var now = new DateTime(2026, 5, 8, 12, 0, 0, DateTimeKind.Utc);
        return new CorrectionDetailDto(
            Id: Guid.NewGuid(),
            StudentId: Guid.NewGuid(),
            SchemaVersion: 1,
            Status: "Corregida",
            AssignmentTitle: title,
            AssignmentPrompt: prompt,
            StudentText: text,
            MarkedUpOutput: null,
            Tags: tags,
            CreatedAt: now.AddMinutes(-10),
            UpdatedAt: now,
            CorrectedAt: now);
    }

    private static (List<string> Texts, List<Run> Runs) ReadAllRuns(byte[] bytes)
    {
        using var stream = new MemoryStream(bytes);
        using var doc = WordprocessingDocument.Open(stream, isEditable: false);
        var runs = doc.MainDocumentPart!.Document!.Body!
            .Descendants<Run>()
            .ToList();
        var texts = runs
            .Select(r => string.Concat(r.Descendants<Text>().Select(t => t.Text)))
            .ToList();
        return (texts, runs);
    }
}
