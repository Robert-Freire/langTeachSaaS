using System.Net;
using System.Text;
using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Tests.Helpers;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.AI;

public class ClaudeApiClientUnitTests
{
    private static ClaudeApiClient BuildClient(HttpResponseMessage fakeResponse)
    {
        var handler    = new FakeHttpMessageHandler(fakeResponse);
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.anthropic.com") };
        var factory    = new FakeHttpClientFactory(httpClient);
        return new ClaudeApiClient(factory, NullLogger<ClaudeApiClient>.Instance);
    }

    [Fact]
    public async Task CompleteAsync_SuccessfulResponse_ReturnsClaudeResponse()
    {
        var json = """
            {
              "model": "claude-haiku-4-5-20251001",
              "content": [{ "type": "text", "text": "Hello!" }],
              "usage": { "input_tokens": 10, "output_tokens": 5 }
            }
            """;

        var client = BuildClient(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        });

        var result = await client.CompleteAsync(new ClaudeRequest("sys", "hi", ClaudeModel.Haiku));

        result.Content.Should().Be("Hello!");
        result.ModelUsed.Should().Be("claude-haiku-4-5-20251001");
        result.InputTokens.Should().Be(10);
        result.OutputTokens.Should().Be(5);
    }

    [Fact]
    public async Task CompleteAsync_EmptyContentArray_ReturnsEmptyContent()
    {
        var json = """
            {
              "model": "claude-haiku-4-5-20251001",
              "content": [],
              "usage": { "input_tokens": 5, "output_tokens": 0 }
            }
            """;

        var client = BuildClient(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        });

        var result = await client.CompleteAsync(new ClaudeRequest("sys", "hi", ClaudeModel.Haiku));

        result.Content.Should().BeEmpty();
    }

    [Fact]
    public async Task CompleteAsync_429Response_ThrowsClaudeRateLimitException()
    {
        var response = new HttpResponseMessage(HttpStatusCode.TooManyRequests)
        {
            Content = new StringContent("rate limited"),
        };
        response.Headers.RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(
            TimeSpan.FromSeconds(30));

        var client = BuildClient(response);

        var act = () => client.CompleteAsync(new ClaudeRequest("sys", "hi", ClaudeModel.Haiku));

        await act.Should().ThrowAsync<ClaudeRateLimitException>()
            .Where(e => e.RetryAfter == TimeSpan.FromSeconds(30));
    }

    [Fact]
    public async Task CompleteAsync_500Response_ThrowsClaudeApiException()
    {
        var client = BuildClient(new HttpResponseMessage(HttpStatusCode.InternalServerError)
        {
            Content = new StringContent("server error"),
        });

        var act = () => client.CompleteAsync(new ClaudeRequest("sys", "hi", ClaudeModel.Haiku));

        await act.Should().ThrowAsync<ClaudeApiException>()
            .Where(e => e.StatusCode == HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task StreamAsync_SuccessfulSseResponse_YieldsChunks()
    {
        var sseBody = string.Join("\n",
            "data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"Hello\"}}",
            "data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\" world\"}}",
            "data: {\"type\":\"message_stop\"}",
            "");

        var client = BuildClient(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(sseBody, Encoding.UTF8, "text/event-stream"),
        });

        var chunks = new List<string>();
        await foreach (var chunk in client.StreamAsync(new ClaudeRequest("sys", "hi", ClaudeModel.Haiku)))
            chunks.Add(chunk);

        chunks.Should().Equal("Hello", " world");
    }

    [Fact]
    public async Task StreamAsync_MessageDeltaWithMaxTokensStopReason_LogsWarning()
    {
        var sseBody = string.Join("\n",
            "data: {\"type\":\"message_start\",\"message\":{\"model\":\"claude-haiku-4-5-20251001\",\"usage\":{\"input_tokens\":50}}}",
            "data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"partial\"}}",
            "data: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"max_tokens\"},\"usage\":{\"output_tokens\":100}}",
            "data: {\"type\":\"message_stop\"}",
            "");

        var capturingLogger = new CapturingLogger<ClaudeApiClient>();
        var handler    = new FakeHttpMessageHandler(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(sseBody, Encoding.UTF8, "text/event-stream"),
        });
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.anthropic.com") };
        var factory    = new FakeHttpClientFactory(httpClient);
        var client     = new ClaudeApiClient(factory, capturingLogger);

        var chunks = new List<string>();
        await foreach (var chunk in client.StreamAsync(new ClaudeRequest("sys", "hi", ClaudeModel.Haiku, MaxTokens: 100)))
            chunks.Add(chunk);

        chunks.Should().Equal("partial");
        capturingLogger.Entries.Should().ContainSingle(e =>
            e.Level == LogLevel.Warning && e.Message.Contains("max_tokens"));
    }

    [Fact]
    public async Task StreamAsync_MessageDeltaWithEndTurnStopReason_DoesNotLogWarning()
    {
        var sseBody = string.Join("\n",
            "data: {\"type\":\"message_start\",\"message\":{\"model\":\"claude-haiku-4-5-20251001\",\"usage\":{\"input_tokens\":50}}}",
            "data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"complete\"}}",
            "data: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"end_turn\"},\"usage\":{\"output_tokens\":10}}",
            "data: {\"type\":\"message_stop\"}",
            "");

        var capturingLogger = new CapturingLogger<ClaudeApiClient>();
        var handler    = new FakeHttpMessageHandler(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(sseBody, Encoding.UTF8, "text/event-stream"),
        });
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.anthropic.com") };
        var factory    = new FakeHttpClientFactory(httpClient);
        var client     = new ClaudeApiClient(factory, capturingLogger);

        var chunks = new List<string>();
        await foreach (var chunk in client.StreamAsync(new ClaudeRequest("sys", "hi", ClaudeModel.Haiku)))
            chunks.Add(chunk);

        chunks.Should().Equal("complete");
        capturingLogger.Entries.Should().NotContain(e => e.Level == LogLevel.Warning);
    }

    // Minimal IHttpClientFactory implementation that returns a pre-built client.
    private sealed class FakeHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    // Simple logger that captures log entries for assertion.
    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = new();
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(
            LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
            => Entries.Add((logLevel, formatter(state, exception)));
    }
}
