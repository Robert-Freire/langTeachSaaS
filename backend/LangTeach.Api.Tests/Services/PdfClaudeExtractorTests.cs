using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace LangTeach.Api.Tests.Services;

file sealed class FakeClaudeClient : IClaudeClient
{
    private readonly Func<ClaudeRequest, ClaudeResponse>? _completeFunc;
    public ClaudeRequest? LastRequest { get; private set; }

    public FakeClaudeClient(Func<ClaudeRequest, ClaudeResponse>? completeFunc = null)
    {
        _completeFunc = completeFunc;
    }

    public Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default)
    {
        LastRequest = request;
        if (_completeFunc is null) throw new InvalidOperationException("No response configured.");
        return Task.FromResult(_completeFunc(request));
    }

    public Task<T> CompleteWithToolAsync<T>(ClaudeRequest request, ClaudeToolDefinition tool, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public IAsyncEnumerable<string> StreamAsync(ClaudeRequest request, CancellationToken ct = default) =>
        throw new NotImplementedException();
}

file sealed class ThrowingClaudeClient(Exception toThrow) : IClaudeClient
{
    public Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default) =>
        Task.FromException<ClaudeResponse>(toThrow);

    public Task<T> CompleteWithToolAsync<T>(ClaudeRequest request, ClaudeToolDefinition tool, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public IAsyncEnumerable<string> StreamAsync(ClaudeRequest request, CancellationToken ct = default) =>
        throw new NotImplementedException();
}

file sealed class PassthroughPromptService : IPromptService
{
    public ClaudeRequest BuildPdfOcrPrompt(byte[] pdfBytes) =>
        new("system", "user", ClaudeModel.Haiku, 8192,
            [new ContentAttachment("application/pdf", pdfBytes, "document.pdf")]);

    public ClaudeRequest BuildLessonPlanPrompt(GenerationContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildVocabularyPrompt(GenerationContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildGrammarPrompt(GenerationContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildExercisesPrompt(GenerationContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildConversationPrompt(GenerationContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildReadingPrompt(GenerationContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildHomeworkPrompt(GenerationContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildFreeTextPrompt(GenerationContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildGuidedWritingPrompt(GenerationContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildErrorCorrectionPrompt(GenerationContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildNoticingTaskPrompt(GenerationContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildCurriculumPrompt(CurriculumContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildReflectionExtractionPrompt(ReflectionExtractionContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildWhatWasCoveredFallbackPrompt(WhatWasCoveredFallbackContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildStudentProfileExtractionPrompt(string text) => throw new NotImplementedException();
    public ClaudeRequest BuildReplanSuggestionPrompt(ReplanSuggestionContext ctx) => throw new NotImplementedException();
    public ClaudeRequest BuildCurriculumValidationPrompt(CurriculumValidationContext ctx) => throw new NotImplementedException();
}

public class PdfClaudeExtractorTests
{
    private const string PdfContentType = "application/pdf";

    private static PdfClaudeExtractor Create(IClaudeClient claude, long maxFileBytes = 10_485_760)
    {
        var options = Options.Create(new OcrOptions { PdfClaudeMaxFileBytes = maxFileBytes });
        return new PdfClaudeExtractor(claude, new PassthroughPromptService(), options, NullLogger<PdfClaudeExtractor>.Instance);
    }

    [Fact]
    public void CanHandle_PdfContentType_ReturnsTrue()
    {
        var sut = Create(new FakeClaudeClient());
        sut.CanHandle(PdfContentType).Should().BeTrue();
    }

    [Theory]
    [InlineData("image/jpeg")]
    [InlineData("image/png")]
    [InlineData("application/vnd.openxmlformats-officedocument.wordprocessingml.document")]
    public void CanHandle_NonPdfContentType_ReturnsFalse(string contentType)
    {
        var sut = Create(new FakeClaudeClient());
        sut.CanHandle(contentType).Should().BeFalse();
    }

    [Fact]
    public async Task ExtractTextAsync_FileExceedsMaxBytes_ThrowsOcrException()
    {
        var sut = Create(new FakeClaudeClient(), maxFileBytes: 10);

        var act = () => sut.ExtractTextAsync(new MemoryStream(new byte[100]), PdfContentType);

        await act.Should().ThrowAsync<OcrException>();
    }

    [Fact]
    public async Task ExtractTextAsync_SuccessfulClaudeResponse_ReturnsExtractedText()
    {
        var fake = new FakeClaudeClient(_ => new ClaudeResponse("Texto extraído del examen.", "claude-haiku", 500, 20));
        var sut = Create(fake);

        var result = await sut.ExtractTextAsync(new MemoryStream(new byte[100]), PdfContentType);

        result.Should().Be("Texto extraído del examen.");
    }

    [Fact]
    public async Task ExtractTextAsync_ClaudeApiException_ThrowsOcrException()
    {
        var throwing = new ThrowingClaudeClient(new ClaudeApiException(System.Net.HttpStatusCode.InternalServerError, "error"));
        var sut = Create(throwing);

        var act = () => sut.ExtractTextAsync(new MemoryStream(new byte[100]), PdfContentType);

        await act.Should().ThrowAsync<OcrException>()
            .WithMessage("*procesar*");
    }

    [Fact]
    public async Task ExtractTextAsync_ClaudeRateLimitException_ThrowsOcrException()
    {
        var throwing = new ThrowingClaudeClient(new ClaudeRateLimitException(TimeSpan.FromSeconds(30)));
        var sut = Create(throwing);

        var act = () => sut.ExtractTextAsync(new MemoryStream(new byte[100]), PdfContentType);

        await act.Should().ThrowAsync<OcrException>()
            .WithMessage("*disponible*");
    }

    [Fact]
    public async Task ExtractTextAsync_AttachmentHasPdfMediaType()
    {
        var fake = new FakeClaudeClient(_ => new ClaudeResponse("text", "claude-haiku", 100, 10));
        var sut = Create(fake);

        await sut.ExtractTextAsync(new MemoryStream(new byte[50]), PdfContentType);

        fake.LastRequest.Should().NotBeNull();
        fake.LastRequest!.Attachments.Should().HaveCount(1);
        fake.LastRequest.Attachments![0].MediaType.Should().Be("application/pdf");
    }
}
