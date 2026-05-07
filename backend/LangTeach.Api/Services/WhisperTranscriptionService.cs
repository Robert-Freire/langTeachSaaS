using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;


namespace LangTeach.Api.Services;

/// <summary>
/// Transcription service backed by Azure OpenAI Whisper.
/// Sends the audio as a single multipart request — no chunking, no seam artefacts.
/// Audio is converted to PCM WAV (16 kHz mono) via ffmpeg before sending.
/// </summary>
public class WhisperTranscriptionService(
    IHttpClientFactory httpClientFactory,
    IOptions<AzureOpenAIWhisperOptions> options,
    ILogger<WhisperTranscriptionService> logger)
    : ITranscriptionService
{
    private readonly AzureOpenAIWhisperOptions _opts = options.Value;

    // Whisper accepts up to 25 MB per request. ffmpeg output for a 30-minute 16 kHz mono WAV
    // is ~57.6 MB, but teacher voice notes are typically under 5 minutes (~9.6 MB).
    // The upstream VoiceNoteService rejects uploads over 50 MB (compressed), which decompresses
    // to well under this limit for typical recordings.
    private const long MaxWavBytes = 25L * 1024 * 1024;

    public async Task<string> TranscribeAsync(Stream audio, string fileName, string contentType, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        var wav = await FfmpegAudioConverter.ConvertToWavAsync(audio, ct);

        if (wav.Length > MaxWavBytes)
            throw new InvalidOperationException(
                $"Converted WAV exceeds Whisper 25 MB limit ({wav.Length / (1024 * 1024)} MB). Shorten the recording.");

        var durationMinutes = (double)wav.Length / (16_000 * 2) / 60.0;
        logger.LogInformation(
            "Starting Whisper transcription. FileName={FileName} WavBytes={Bytes} EstimatedDurationMinutes={Duration:F2} EstimatedCostUSD={Cost:F4}",
            fileName, wav.Length, durationMinutes, durationMinutes * 0.006);

        var client = httpClientFactory.CreateClient("AzureOpenAIWhisper");
        var url = $"{_opts.Endpoint.TrimEnd('/')}/openai/deployments/{_opts.DeploymentName}/audio/transcriptions?api-version=2024-06-01";

        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(wav);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("audio/wav");
        form.Add(fileContent, "file", Path.GetFileNameWithoutExtension(fileName) + ".wav");
        form.Add(new StringContent("json"), "response_format");
        form.Add(new StringContent("es"), "language");

        using var response = await client.PostAsync(url, form, ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Whisper transcription failed. Status={Status} Body={Body}", response.StatusCode, body);
            throw new InvalidOperationException($"Whisper transcription failed: {response.StatusCode}");
        }

        var json = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);
        string text;
        if (doc.RootElement.TryGetProperty("text", out var t))
        {
            text = t.GetString() ?? string.Empty;
        }
        else
        {
            logger.LogWarning("Whisper response did not contain a 'text' property. FileName={FileName} Body={Body}", fileName, json);
            text = string.Empty;
        }

        sw.Stop();
        logger.LogInformation(
            "Whisper transcription complete. FileName={FileName} TranscriptLength={Length} ElapsedMs={Elapsed}",
            fileName, text.Length, sw.ElapsedMilliseconds);

        return text;
    }

}
