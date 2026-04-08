using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Services;

/// <summary>
/// Transcription service backed by Azure AI Speech (Speech-to-Text) REST API.
/// Audio is converted to PCM WAV (16kHz mono) via ffmpeg before sending, which is
/// the most reliably supported format for the Azure Speech simple recognition endpoint.
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

        var wavStream = await ConvertToWavAsync(audio, ct);

        var content = new StreamContent(wavStream);
        content.Headers.ContentType = new MediaTypeHeaderValue("audio/wav");

        var url = $"https://{_opts.Region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1" +
                  $"?language={Uri.EscapeDataString(_opts.Language)}&format=simple";

        logger.LogInformation("Sending audio to Azure Speech for transcription. FileName={FileName} Language={Language} WavBytes={Bytes}",
            fileName, _opts.Language, wavStream.Length);

        using var response = await client.PostAsync(url, content, ct);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Azure Speech transcription failed. Status={Status}", response.StatusCode);
            throw new InvalidOperationException($"Transcription failed: {response.StatusCode}");
        }

        var body = await response.Content.ReadAsStringAsync(ct);
        logger.LogDebug("Azure Speech raw response: {Body}", body);
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

    private async Task<MemoryStream> ConvertToWavAsync(Stream input, CancellationToken ct)
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
            // Drain stdout and stderr concurrently to prevent buffer deadlock.
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
            {
                logger.LogError("ffmpeg conversion failed. ExitCode={ExitCode} Stderr={Stderr}", process.ExitCode, stderrBuilder.ToString());
                throw new InvalidOperationException("Audio conversion failed.");
            }

            wav.Position = 0;
            return wav;
        }
        catch
        {
            process.Kill(entireProcessTree: true);
            throw;
        }
    }
}
