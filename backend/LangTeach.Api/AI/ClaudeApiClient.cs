using System.Diagnostics;
using System.Net;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
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
        [ClaudeModel.Opus]   = "claude-opus-4-7",
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
        var stopReason   = root.TryGetProperty("stop_reason", out var sr) ? sr.GetString() : null;
        var usedModel    = root.GetProperty("model").GetString() ?? modelId;
        var inputTokens  = root.GetProperty("usage").GetProperty("input_tokens").GetInt32();
        var outputTokens = root.GetProperty("usage").GetProperty("output_tokens").GetInt32();
        var usagePct     = request.MaxTokens > 0 ? outputTokens * 100.0 / request.MaxTokens : 0.0;

        logger.LogInformation(
            "Claude complete: model={Model} input={Input} output={Output} maxTokens={MaxTokens} usage={UsagePct:F1}% stopReason={StopReason} latency={Latency}ms",
            usedModel, inputTokens, outputTokens, request.MaxTokens, usagePct, stopReason ?? "end_turn", sw.ElapsedMilliseconds);

        if (request.AssistantPrefill is not null)
            text = request.AssistantPrefill + text;

        EmitCallLog(request, usedModel, inputTokens, outputTokens, stopReason ?? "end_turn", sw.ElapsedMilliseconds, text);

        if (usagePct >= 80.0)
            logger.LogWarning(
                "Claude near max_tokens ceiling: output={Output} maxTokens={MaxTokens} usage={UsagePct:F1}% stopReason={StopReason}",
                outputTokens, request.MaxTokens, usagePct, stopReason ?? "end_turn");

        if (stopReason == "max_tokens")
            throw new ClaudeApiException(
                System.Net.HttpStatusCode.OK,
                $"Response truncated: max_tokens ({request.MaxTokens}) reached before completion.");

        return new ClaudeResponse(text, usedModel, inputTokens, outputTokens);
    }

    public async Task<T> CompleteWithToolAsync<T>(ClaudeRequest request, ClaudeToolDefinition tool, CancellationToken ct = default)
    {
        var client  = httpClientFactory.CreateClient("Claude");
        var modelId = ModelIds[request.Model];
        var body    = BuildToolRequestBody(request, modelId, tool);
        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        var sw = Stopwatch.StartNew();
        using var response = await client.PostAsync("/v1/messages", content, ct);
        sw.Stop();

        await EnsureSuccessAsync(response, ct);

        var json = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var stopReason   = root.TryGetProperty("stop_reason", out var sr) ? sr.GetString() : null;
        var usedModel    = root.GetProperty("model").GetString() ?? modelId;
        var inputTokens  = root.GetProperty("usage").GetProperty("input_tokens").GetInt32();
        var outputTokens = root.GetProperty("usage").GetProperty("output_tokens").GetInt32();
        var usagePct     = request.MaxTokens > 0 ? outputTokens * 100.0 / request.MaxTokens : 0.0;

        logger.LogInformation(
            "Claude tool-call complete: model={Model} tool={Tool} input={Input} output={Output} maxTokens={MaxTokens} usage={UsagePct:F1}% stopReason={StopReason} latency={Latency}ms",
            usedModel, tool.Name, inputTokens, outputTokens, request.MaxTokens, usagePct, stopReason ?? "tool_use", sw.ElapsedMilliseconds);

        // Find tool_use content block.
        JsonElement toolInput = default;
        if (root.TryGetProperty("content", out var contentArray))
        {
            foreach (var block in contentArray.EnumerateArray())
            {
                if (block.TryGetProperty("type", out var blockType) && blockType.GetString() == "tool_use" &&
                    block.TryGetProperty("input", out var inputProp))
                {
                    toolInput = inputProp.Clone();
                    break;
                }
            }
        }

        var rawResponse = toolInput.ValueKind != JsonValueKind.Undefined ? toolInput.GetRawText() : string.Empty;
        EmitCallLog(request, usedModel, inputTokens, outputTokens, stopReason ?? "tool_use", sw.ElapsedMilliseconds, rawResponse);

        if (toolInput.ValueKind == JsonValueKind.Undefined)
            throw new InvalidOperationException($"Claude tool-call response contained no tool_use block for tool '{tool.Name}'.");

        var result = JsonSerializer.Deserialize<T>(rawResponse, JsonOpts);
        if (result is null)
            throw new InvalidOperationException($"Claude tool-call input for '{tool.Name}' deserialized to null.");
        return result;
    }

    private static readonly System.Text.Json.JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public async IAsyncEnumerable<string> StreamAsync(
        ClaudeRequest request,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var client  = httpClientFactory.CreateClient("Claude");
        var modelId = ModelIds[request.Model];
        var body    = BuildRequestBody(request, modelId, stream: true);
        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/v1/messages") { Content = content };

        var sw = Stopwatch.StartNew();
        using var response    = await client.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, ct);

        await EnsureSuccessAsync(response, ct);

        using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);

        var usedModel       = modelId;
        var inputTokens     = 0;
        var outputTokens    = 0;
        var streamStopReason = "end_turn";
        var accumulated     = new StringBuilder();
        var logEmitted      = false;

        // Yield prefill as first chunk so downstream sees a complete JSON stream from the start.
        // (prefill is not counted in output_tokens by the API)
        if (request.AssistantPrefill is not null)
        {
            accumulated.Append(request.AssistantPrefill);
            yield return request.AssistantPrefill;
        }

        try
        {
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

                    if (type == "message_start")
                    {
                        if (eventRoot.TryGetProperty("message", out var msg))
                        {
                            if (msg.TryGetProperty("model", out var m))
                                usedModel = m.GetString() ?? modelId;
                            if (msg.TryGetProperty("usage", out var startUsage) &&
                                startUsage.TryGetProperty("input_tokens", out var it))
                                inputTokens = it.GetInt32();
                        }
                        continue;
                    }

                    if (type == "message_delta")
                    {
                        if (eventRoot.TryGetProperty("usage", out var deltaUsage) &&
                            deltaUsage.TryGetProperty("output_tokens", out var ot))
                            outputTokens = ot.GetInt32();

                        if (eventRoot.TryGetProperty("delta", out var deltaObj) &&
                            deltaObj.TryGetProperty("stop_reason", out var sr))
                            streamStopReason = sr.GetString() ?? "end_turn";

                        if (streamStopReason == "max_tokens")
                            logger.LogWarning(
                                "Claude stream truncated: max_tokens ({MaxTokens}) reached. model={Model} input={Input} output={Output}",
                                request.MaxTokens, usedModel, inputTokens, outputTokens);

                        sw.Stop();
                        logger.LogInformation(
                            "Claude stream: model={Model} input={Input} output={Output} latency={Latency}ms stopReason={StopReason}",
                            usedModel, inputTokens, outputTokens, sw.ElapsedMilliseconds, streamStopReason);

                        EmitCallLog(request, usedModel, inputTokens, outputTokens, streamStopReason, sw.ElapsedMilliseconds, accumulated.ToString());
                        logEmitted = true;
                        continue;
                    }

                    if (type == "message_stop") break;
                    if (type != "content_block_delta") continue;

                    if (eventRoot.TryGetProperty("delta", out var textDelta) &&
                        textDelta.TryGetProperty("text", out var textProp))
                    {
                        chunk = textProp.GetString();
                    }
                }
                catch (JsonException)
                {
                    continue;
                }

                if (chunk is not null)
                {
                    accumulated.Append(chunk);
                    yield return chunk;
                }
            }
        }
        finally
        {
            // Emit log for cancellation or unexpected termination cases where message_delta was never received.
            if (!logEmitted)
            {
                sw.Stop();
                var stopReason = ct.IsCancellationRequested ? "cancelled" : "error";
                EmitCallLog(request, usedModel, inputTokens, outputTokens, stopReason, sw.ElapsedMilliseconds, accumulated.ToString());
            }
        }
    }

    private void EmitCallLog(
        ClaudeRequest request,
        string model,
        int inputTokens,
        int outputTokens,
        string stopReason,
        long latencyMs,
        string rawResponse)
    {
        if (request.CallSite == "unknown")
            logger.LogWarning("ClaudeCall missing CallSite tag: model={Model} promptHash={PromptHash}", model, ComputePromptHash(request.SystemPrompt, request.UserPrompt));

        var correlationId = request.CorrelationId ?? Guid.NewGuid();
        var promptHash    = ComputePromptHash(request.SystemPrompt, request.UserPrompt);

        logger.LogInformation(
            "ClaudeCall callSite={CallSite} correlationId={CorrelationId} model={Model} promptHash={PromptHash} " +
            "inputTokens={InputTokens} outputTokens={OutputTokens} maxTokens={MaxTokens} stopReason={StopReason} " +
            "latencyMs={LatencyMs} systemPrompt={SystemPrompt} userPrompt={UserPrompt} rawResponse={RawResponse}",
            request.CallSite, correlationId, model, promptHash,
            inputTokens, outputTokens, request.MaxTokens, stopReason,
            latencyMs, request.SystemPrompt, request.UserPrompt, rawResponse);
    }

    private static object BuildUserMessageWithAttachments(ClaudeRequest request)
    {
        var contentParts = new List<object>();
        foreach (var att in request.Attachments!)
        {
            var isPdf = string.Equals(att.MediaType, "application/pdf", StringComparison.OrdinalIgnoreCase);
            var blockType = isPdf ? "document" : "image";
            contentParts.Add(new
            {
                type = blockType,
                source = new { type = "base64", media_type = att.MediaType, data = Convert.ToBase64String(att.Data) }
            });
        }
        contentParts.Add(new { type = "text", text = request.UserPrompt });
        return new { role = "user", content = (object)contentParts };
    }

    // PromptHash is SHA256(SystemPrompt+UserPrompt) for dedup and lookup in KQL.
    private static string ComputePromptHash(string systemPrompt, string userPrompt)
    {
        var input = systemPrompt + userPrompt;
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static object BuildToolRequestBody(ClaudeRequest request, string modelId, ClaudeToolDefinition tool)
    {
        var userMessage = new { role = "user", content = (object)request.UserPrompt };
        var body = new Dictionary<string, object?>
        {
            ["model"]       = modelId,
            ["max_tokens"]  = request.MaxTokens,
            ["system"]      = request.SystemPrompt,
            ["stream"]      = false,
            ["messages"]    = new object[] { userMessage },
            ["tools"]       = new[] { new { name = tool.Name, description = tool.Description, input_schema = tool.InputSchema } },
            ["tool_choice"] = new { type = "tool", name = tool.Name },
        };
        if (request.Temperature is not null && request.Model != ClaudeModel.Opus)
            body["temperature"] = request.Temperature;
        return body;
    }

    private static object BuildRequestBody(ClaudeRequest request, string modelId, bool stream)
    {
        var userMessage = request.Attachments is { Count: > 0 }
            ? BuildUserMessageWithAttachments(request)
            : new { role = "user", content = (object)request.UserPrompt };

        // When AssistantPrefill is set, append an assistant turn so the model continues from
        // that text instead of generating a preamble. See: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prefill-claudes-response
        if (request.AssistantPrefill is not null && string.IsNullOrEmpty(request.AssistantPrefill))
            throw new ArgumentException("AssistantPrefill must be non-empty when set.", nameof(request));
        object messages = request.AssistantPrefill is not null
            ? new object[] { userMessage, new { role = "assistant", content = (object)request.AssistantPrefill } }
            : new object[] { userMessage };

        var body = new Dictionary<string, object?>
        {
            ["model"]      = modelId,
            ["max_tokens"] = request.MaxTokens,
            ["system"]     = request.SystemPrompt,
            ["stream"]     = stream,
            ["messages"]   = messages,
        };
        // temperature is deprecated for Opus 4 -- omit it entirely for that model family.
        if (request.Temperature is not null && request.Model != ClaudeModel.Opus)
            body["temperature"] = request.Temperature;
        return body;
    }

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
