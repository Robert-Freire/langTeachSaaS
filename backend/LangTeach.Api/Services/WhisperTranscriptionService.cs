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
        var wav = await ConvertToWavAsync(audio, ct);

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
        var text = doc.RootElement.TryGetProperty("text", out var t) ? t.GetString() ?? string.Empty : string.Empty;

        sw.Stop();
        logger.LogInformation(
            "Whisper transcription complete. FileName={FileName} TranscriptLength={Length} ElapsedMs={Elapsed}",
            fileName, text.Length, sw.ElapsedMilliseconds);

        return text;
    }

    private static async Task<byte[]> ConvertToWavAsync(Stream input, CancellationToken ct)
    {
        var psi = new ProcessStartInfo("ffmpeg")
        {
            Arguments = "-i pipe:0 -ar 16000 -ac 1 -f wav pipe:1",
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = Process.Start(psi) ?? throw new InvalidOperationException("Failed to start ffmpeg");

        try
        {
            var writeTask = Task.Run(async () =>
            {
                await input.CopyToAsync(process.StandardInput.BaseStream, ct);
                process.StandardInput.Close();
            }, ct);

            var wav = new MemoryStream();
            var readStdoutTask = process.StandardOutput.BaseStream.CopyToAsync(wav, ct);
            var stderrBuilder = new System.Text.StringBuilder();
            var readStderrTask = Task.Run(async () =>
            {
                var line = await process.StandardError.ReadLineAsync(ct);
                while (line is not null)
                {
                    stderrBuilder.AppendLine(line);
                    line = await process.StandardError.ReadLineAsync(ct);
                }
            }, ct);

            await Task.WhenAll(writeTask, readStdoutTask, readStderrTask);
            await process.WaitForExitAsync(ct);

            if (process.ExitCode != 0)
                throw new InvalidOperationException("Audio conversion failed.");

            return wav.ToArray();
        }
        catch
        {
            process.Kill(entireProcessTree: true);
            throw;
        }
    }
}
