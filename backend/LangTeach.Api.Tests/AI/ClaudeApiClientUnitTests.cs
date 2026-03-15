using System.Net;
using System.Text;
using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Tests.Helpers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.AI;

public class ClaudeApiClientUnitTests
{
    private static ClaudeApiClient BuildClient(HttpResponseMessage fakeResponse)
    {
        var handler    = new FakeHttpMessageHandler(fakeResponse);
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.anthropic.com") };

        var factory = new ServiceCollection()
            .AddSingleton<IHttpClientFactory>(new FakeHttpClientFactory(httpClient))
            .BuildServiceProvider()
            .GetRequiredService<IHttpClientFactory>();

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

    // Minimal IHttpClientFactory implementation that returns a pre-built client.
    private sealed class FakeHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }
}
