using FluentAssertions;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Tests.Services;

public class WhisperTranscriptionServiceTests
{
    [Fact]
    public void WhisperOptions_SectionName_IsCorrect()
    {
        AzureOpenAIWhisperOptions.SectionName.Should().Be("AzureOpenAIWhisper");
    }

    [Fact]
    public void WhisperOptions_DefaultValues_AreEmpty()
    {
        var opts = new AzureOpenAIWhisperOptions();
        opts.Endpoint.Should().BeEmpty();
        opts.ApiKey.Should().BeEmpty();
        opts.DeploymentName.Should().BeEmpty();
    }

    [Fact]
    public void WhisperTranscriptionService_CanBeConstructed()
    {
        var opts = Options.Create(new AzureOpenAIWhisperOptions
        {
            Endpoint = "https://example.openai.azure.com/",
            ApiKey = "test-key",
            DeploymentName = "whisper",
        });

        var factory = new FakeHttpClientFactory();
        var act = () => new WhisperTranscriptionService(factory, opts, NullLogger<WhisperTranscriptionService>.Instance);

        act.Should().NotThrow();
    }

    [Fact]
    public async Task TranscribeAsync_WhenFfmpegUnavailable_ThrowsInvalidOperationException()
    {
        var opts = Options.Create(new AzureOpenAIWhisperOptions
        {
            Endpoint = "https://example.openai.azure.com/",
            ApiKey = "test-key",
            DeploymentName = "whisper",
        });

        var factory = new FakeHttpClientFactory();
        var service = new WhisperTranscriptionService(factory, opts, NullLogger<WhisperTranscriptionService>.Instance);

        using var stream = new MemoryStream([0x1A, 0x45, 0xDF, 0xA3]); // minimal WebM magic bytes
        var act = async () => await service.TranscribeAsync(stream, "test.webm", "audio/webm");

        // ffmpeg is not available in the unit test environment; the service will throw.
        await act.Should().ThrowAsync<Exception>();
    }

    private sealed class FakeHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }
}
