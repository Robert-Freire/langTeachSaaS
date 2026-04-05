using System.Net.Http.Headers;
using System.Text.Json;

namespace LangTeach.Api.Services;

public class WhisperTranscriptionService(IHttpClientFactory httpClientFactory, ILogger<WhisperTranscriptionService> logger)
    : ITranscriptionService
{
    public async Task<string> TranscribeAsync(Stream audio, string fileName, string contentType, CancellationToken ct = default)
    {
        var client = httpClientFactory.CreateClient("OpenAI");

        using var content = new MultipartFormDataContent();
        var streamContent = new StreamContent(audio);
        streamContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        content.Add(streamContent, "file", fileName);
        content.Add(new StringContent("whisper-1"), "model");

        logger.LogInformation("Sending audio to OpenAI Whisper for transcription. FileName={FileName}", fileName);

        using var response = await client.PostAsync("/v1/audio/transcriptions", content, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            // Don't log body — may contain PII from partial transcription responses
            logger.LogError("Whisper transcription failed. Status={Status}", response.StatusCode);
            throw new InvalidOperationException($"Transcription failed: {response.StatusCode}");
        }

        using var doc = JsonDocument.Parse(body);
        var text = doc.RootElement.GetProperty("text").GetString() ?? string.Empty;

        logger.LogInformation("Transcription complete. Length={Length}", text.Length);
        return text;
    }
}
