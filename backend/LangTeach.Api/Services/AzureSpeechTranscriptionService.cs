using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Services;

/// <summary>
/// Transcription service backed by Azure AI Speech (Speech-to-Text) REST API.
/// Supports the real-time recognition endpoint (max 60 seconds of audio per request).
/// For teacher voice notes this is sufficient; longer notes should be split into segments.
/// Supported audio formats: audio/wav, audio/webm;codecs=opus, audio/ogg;codecs=opus.
/// </summary>
public class AzureSpeechTranscriptionService(
    IHttpClientFactory httpClientFactory,
    IOptions<AzureSpeechOptions> options,
    ILogger<AzureSpeechTranscriptionService> logger)
    : ITranscriptionService
{
    private readonly AzureSpeechOptions _opts = options.Value;

    public async Task<string> TranscribeAsync(Stream audio, string fileName, string contentType, CancellationToken ct = default)
    {
        var client = httpClientFactory.CreateClient("AzureSpeech");

        var content = new StreamContent(audio);
        content.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        var url = $"https://{_opts.Region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1" +
                  $"?language={Uri.EscapeDataString(_opts.Language)}&format=simple";

        logger.LogInformation("Sending audio to Azure Speech for transcription. FileName={FileName} Language={Language}",
            fileName, _opts.Language);

        using var response = await client.PostAsync(url, content, ct);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Azure Speech transcription failed. Status={Status}", response.StatusCode);
            throw new InvalidOperationException($"Transcription failed: {response.StatusCode}");
        }

        var body = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(body);

        var status = doc.RootElement.TryGetProperty("RecognitionStatus", out var s) ? s.GetString() : null;
        if (status != "Success")
        {
            logger.LogError("Azure Speech returned non-success status. Status={Status}", status);
            throw new InvalidOperationException($"Transcription was not successful. Status: {status ?? "Unknown"}");
        }

        var text = doc.RootElement.TryGetProperty("DisplayText", out var t) ? t.GetString() ?? string.Empty : string.Empty;
        logger.LogInformation("Transcription complete. Length={Length}", text.Length);
        return text;
    }
}
