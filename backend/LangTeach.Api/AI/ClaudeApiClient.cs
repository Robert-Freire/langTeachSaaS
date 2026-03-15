using System.Diagnostics;
using System.Net;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace LangTeach.Api.AI;

public class ClaudeApiClient(IHttpClientFactory httpClientFactory, ILogger<ClaudeApiClient> logger)
    : IClaudeClient
{
    private static readonly Dictionary<ClaudeModel, string> ModelIds = new()
    {
        [ClaudeModel.Haiku]  = "claude-haiku-4-5-20251001",
        [ClaudeModel.Sonnet] = "claude-sonnet-4-6",
    };

    public async Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default)
    {
        var client  = httpClientFactory.CreateClient("Claude");
        var modelId = ModelIds[request.Model];
        var body    = BuildRequestBody(request, modelId, stream: false);
        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        var sw = Stopwatch.StartNew();
        using var response = await client.PostAsync("/v1/messages", content, ct);
        sw.Stop();

        await EnsureSuccessAsync(response, ct);

        var json = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var text = string.Empty;
        if (root.TryGetProperty("content", out var contentArray) && contentArray.GetArrayLength() > 0)
        {
            foreach (var block in contentArray.EnumerateArray())
            {
                if (block.TryGetProperty("type", out var blockType) && blockType.GetString() == "text" &&
                    block.TryGetProperty("text", out var textProp))
                {
                    text = textProp.GetString() ?? string.Empty;
                    break;
                }
            }
        }
        var usedModel    = root.GetProperty("model").GetString() ?? modelId;
        var inputTokens  = root.GetProperty("usage").GetProperty("input_tokens").GetInt32();
        var outputTokens = root.GetProperty("usage").GetProperty("output_tokens").GetInt32();

        logger.LogInformation(
            "Claude complete: model={Model} input={Input} output={Output} latency={Latency}ms",
            usedModel, inputTokens, outputTokens, sw.ElapsedMilliseconds);

        return new ClaudeResponse(text, usedModel, inputTokens, outputTokens);
    }

    public async IAsyncEnumerable<string> StreamAsync(
        ClaudeRequest request,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var client  = httpClientFactory.CreateClient("Claude");
        var modelId = ModelIds[request.Model];
        var body    = BuildRequestBody(request, modelId, stream: true);
        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/v1/messages") { Content = content };
        using var response    = await client.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, ct);

        await EnsureSuccessAsync(response, ct);

        using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);

        while (!reader.EndOfStream && !ct.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(ct);
            if (line is null) break;
            if (!line.StartsWith("data: ")) continue;

            var data = line["data: ".Length..];
            if (data == "[DONE]") break;

            string? chunk = null;
            try
            {
                using var eventDoc = JsonDocument.Parse(data);
                var eventRoot = eventDoc.RootElement;

                if (!eventRoot.TryGetProperty("type", out var typeProp)) continue;
                var type = typeProp.GetString();

                if (type == "message_stop") break;
                if (type != "content_block_delta") continue;

                if (eventRoot.TryGetProperty("delta", out var delta) &&
                    delta.TryGetProperty("text", out var textProp))
                {
                    chunk = textProp.GetString();
                }
            }
            catch (JsonException)
            {
                continue;
            }

            if (chunk is not null) yield return chunk;
        }
    }

    private static object BuildRequestBody(ClaudeRequest request, string modelId, bool stream)
        => new
        {
            model      = modelId,
            max_tokens = request.MaxTokens,
            system     = request.SystemPrompt,
            stream,
            messages   = new[] { new { role = "user", content = request.UserPrompt } },
        };

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken ct)
    {
        if (response.IsSuccessStatusCode) return;

        var body = await response.Content.ReadAsStringAsync(ct);

        if (response.StatusCode == HttpStatusCode.TooManyRequests)
        {
            TimeSpan? retryAfter = null;
            if (response.Headers.RetryAfter?.Delta is { } delta)
                retryAfter = delta;
            else if (response.Headers.RetryAfter?.Date is { } date)
                retryAfter = date - DateTimeOffset.UtcNow;

            throw new ClaudeRateLimitException(retryAfter);
        }

        throw new ClaudeApiException(response.StatusCode, body);
    }
}
