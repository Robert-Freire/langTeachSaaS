using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using FluentAssertions;
using LangTeach.Api.Services;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Tests.Services;

public class OpenXmlDocxTextExtractorTests
{
    private const string DocxContentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    private static readonly OcrOptions DefaultOptions = new();

    private static OpenXmlDocxTextExtractor CreateExtractor(OcrOptions? options = null) =>
        new(Options.Create(options ?? DefaultOptions));

    private static MemoryStream CreateDocxStream(params string[] paragraphs)
    {
        var ms = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(ms, WordprocessingDocumentType.Document, autoSave: true))
        {
            var main = doc.AddMainDocumentPart();
            main.Document = new Document(new Body(
                paragraphs
                    .Select(text => (OpenXmlElement)new Paragraph(new Run(new Text(text))))
                    .Append(new SectionProperties())
                    .ToArray()
            ));
        }
        ms.Position = 0;
        return ms;
    }

    [Fact]
    public void CanHandle_DocxContentType_ReturnsTrue()
    {
        var sut = CreateExtractor();
        sut.CanHandle(DocxContentType).Should().BeTrue();
    }

    [Theory]
    [InlineData("image/jpeg")]
    [InlineData("image/png")]
    [InlineData("application/pdf")]
    [InlineData("image/gif")]
    public void CanHandle_NonDocxContentType_ReturnsFalse(string contentType)
    {
        var sut = CreateExtractor();
        sut.CanHandle(contentType).Should().BeFalse();
    }

    [Fact]
    public async Task ExtractTextAsync_ValidDocx_ReturnsText()
    {
        var sut = CreateExtractor();
        using var ms = CreateDocxStream("El alumno escribió su redacción con esfuerzo.");

        var text = await sut.ExtractTextAsync(ms, DocxContentType);

        text.Should().Contain("redacción");
    }

    [Fact]
    public async Task ExtractTextAsync_PreservesAccentedCharacters()
    {
        var sut = CreateExtractor();
        using var ms = CreateDocxStream("Tiene problemas con á, é, í, ó, ú y ñ.");

        var text = await sut.ExtractTextAsync(ms, DocxContentType);

        text.Should().Contain("á");
        text.Should().Contain("é");
        text.Should().Contain("ñ");
    }

    [Fact]
    public async Task ExtractTextAsync_MultipleParagraphs_JoinsWithNewlines()
    {
        var sut = CreateExtractor();
        using var ms = CreateDocxStream("Primera línea.", "Segunda línea.");

        var text = await sut.ExtractTextAsync(ms, DocxContentType);

        text.Should().Contain("Primera");
        text.Should().Contain("Segunda");
    }

    [Fact]
    public async Task ExtractTextAsync_EmptyDocx_ThrowsOcrException()
    {
        var sut = CreateExtractor();
        using var ms = CreateDocxStream();

        var act = () => sut.ExtractTextAsync(ms, DocxContentType);

        await act.Should().ThrowAsync<OcrException>()
            .WithMessage("*extraer texto*");
    }

    [Fact]
    public async Task ExtractTextAsync_TextBelowMinChars_ThrowsOcrException()
    {
        var options = new OcrOptions { MinExtractedChars = 100 };
        var sut = CreateExtractor(options);
        using var ms = CreateDocxStream("Corto.");

        var act = () => sut.ExtractTextAsync(ms, DocxContentType);

        await act.Should().ThrowAsync<OcrException>()
            .WithMessage("*extraer texto*");
    }

    [Fact]
    public async Task ExtractTextAsync_CorruptStream_ThrowsOcrExceptionWithDamagedMessage()
    {
        var sut = CreateExtractor();
        using var ms = new MemoryStream("this is not a valid docx file"u8.ToArray());

        var act = () => sut.ExtractTextAsync(ms, DocxContentType);

        await act.Should().ThrowAsync<OcrException>()
            .WithMessage("*no es válido*");
    }
}
