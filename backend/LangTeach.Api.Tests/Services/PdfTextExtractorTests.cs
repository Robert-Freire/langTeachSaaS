using FluentAssertions;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Fonts.Standard14Fonts;
using UglyToad.PdfPig.Writer;
using Xunit;

namespace LangTeach.Api.Tests.Services;

public class PdfTextExtractorTests
{
    private const string PdfContentType = "application/pdf";
    private const string JpegContentType = "image/jpeg";

    private static PdfTextExtractor CreateExtractor(int minChars = 10)
    {
        var options = Options.Create(new OcrOptions { MinExtractedChars = minChars });
        return new PdfTextExtractor(options, NullLogger<PdfTextExtractor>.Instance);
    }

    private static MemoryStream CreateTypedPdfStream(string text)
    {
        var builder = new PdfDocumentBuilder();
        var font = builder.AddStandard14Font(Standard14Font.Helvetica);
        var page = builder.AddPage(PageSize.A4);
        page.AddText(text, 12, new UglyToad.PdfPig.Core.PdfPoint(50, 700), font);
        var bytes = builder.Build();
        return new MemoryStream(bytes);
    }

    [Fact]
    public void CanHandle_PdfContentType_ReturnsTrue()
    {
        var sut = CreateExtractor();
        sut.CanHandle(PdfContentType).Should().BeTrue();
    }

    [Fact]
    public void CanHandle_JpegContentType_ReturnsFalse()
    {
        var sut = CreateExtractor();
        sut.CanHandle(JpegContentType).Should().BeFalse();
    }

    [Fact]
    public async Task ExtractTextAsync_TypicalTypedPdf_ReturnsExtractedText()
    {
        using var stream = CreateTypedPdfStream("Este texto viene de un PDF digital.");
        var sut = CreateExtractor();

        var result = await sut.ExtractTextAsync(stream, PdfContentType);

        result.Should().Contain("Este");
    }

    [Fact]
    public async Task ExtractTextAsync_TextBelowMinChars_ThrowsOcrFallbackException()
    {
        using var stream = CreateTypedPdfStream("Hi");
        var sut = CreateExtractor(minChars: 100);

        var act = () => sut.ExtractTextAsync(stream, PdfContentType);

        await act.Should().ThrowAsync<OcrFallbackException>();
    }

    [Fact]
    public async Task ExtractTextAsync_EmptyStream_ThrowsOcrException()
    {
        using var stream = new MemoryStream();
        var sut = CreateExtractor();

        var act = () => sut.ExtractTextAsync(stream, PdfContentType);

        await act.Should().ThrowAsync<OcrException>();
    }

    [Fact]
    public async Task ExtractTextAsync_GarbageBytes_ThrowsOcrException()
    {
        var garbage = new byte[] { 0x00, 0x01, 0x02, 0xFF, 0xFE, 0xAB };
        using var stream = new MemoryStream(garbage);
        var sut = CreateExtractor();

        var act = () => sut.ExtractTextAsync(stream, PdfContentType);

        await act.Should().ThrowAsync<OcrException>();
    }

    [Fact]
    public async Task ExtractTextAsync_LongTypedPdf_ReturnsAllText()
    {
        var longText = string.Join(" ", Enumerable.Repeat("palabra", 30));
        using var stream = CreateTypedPdfStream(longText);
        var sut = CreateExtractor();

        var result = await sut.ExtractTextAsync(stream, PdfContentType);

        result.Should().Contain("palabra");
        result.Length.Should().BeGreaterThanOrEqualTo(10);
    }
}
