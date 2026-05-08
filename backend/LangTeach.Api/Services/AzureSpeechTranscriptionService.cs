using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Services;

/// <summary>
/// Transcription service backed by Azure AI Speech (Speech-to-Text) REST API.
/// Audio is converted to PCM WAV (16kHz mono) via ffmpeg before sending.
/// Recordings longer than 55 seconds are split into chunks and transcribed sequentially,
/// working around the Azure Speech simple endpoint's 60-second limit.
/// </summary>
public class AzureSpeechTranscriptionService(
    IHttpClientFactory httpClientFactory,
    IOptions<AzureSpeechOptions> options,
    ILogger<AzureSpeechTranscriptionService> logger)
    : ITranscriptionService
{
    private readonly AzureSpeechOptions _opts = options.Value;

    private const int SampleRate = 16_000;
    private const int BytesPerSample = 2; // 16-bit
    private const int Channels = 1;
    internal const int BytesPerSecond = SampleRate * BytesPerSample * Channels; // 32 000
    private const int MaxChunkSeconds = 55;
    internal const int MaxChunkDataBytes = MaxChunkSeconds * BytesPerSecond; // 1 760 000

    // Placed in the transcript where Azure Speech rejects a chunk (InitialSilenceTimeout / NoMatch).
    // Downstream consumers that need to detect or filter this value should reference this constant.
    internal const string UnintelligibleMarker = "[unintelligible]";

    // Safety cap: full WAV in memory must not exceed 300 MB (~156 minutes of recording).
    // The upstream VoiceNoteService already rejects uploads over 50 MB (compressed),
    // which decompresses to well under this limit.
    private const long MaxFullWavBytes = 300L * 1024 * 1024;

    public async Task<string> TranscribeAsync(Stream audio, string fileName, string contentType, CancellationToken ct = default)
    {
        var client = httpClientFactory.CreateClient("AzureSpeech");
        var url = $"https://{_opts.Region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1" +
                  $"?language={Uri.EscapeDataString(_opts.Language)}&format=simple";

        var wavBytes = await FfmpegAudioConverter.ConvertToWavAsync(audio, ct);

        if (wavBytes.Length > MaxFullWavBytes)
            throw new InvalidOperationException($"Converted audio exceeds maximum allowed size ({MaxFullWavBytes / (1024 * 1024)} MB). Shorten the recording.");
        var (dataOffset, dataLength) = ParseWavDataInfo(wavBytes);

        if (dataLength == 0)
            logger.LogWarning(
                "WAV data chunk has zero length after parsing — transcription will be empty. FileName={FileName}",
                fileName);

        var totalChunks = (int)Math.Ceiling((double)dataLength / MaxChunkDataBytes);
        logger.LogInformation(
            "Starting transcription. FileName={FileName} Language={Language} WavBytes={Bytes} DurationSeconds={Duration:F1} Chunks={Chunks}",
            fileName, _opts.Language, wavBytes.Length,
            (double)dataLength / BytesPerSecond,
            totalChunks);
        var results = new List<string>(totalChunks);

        for (var i = 0; i < totalChunks; i++)
        {
            var chunkOffset = i * MaxChunkDataBytes;
            var chunkLength = Math.Min(MaxChunkDataBytes, dataLength - chunkOffset);
            var chunkStartSec = (double)chunkOffset / BytesPerSecond;
            var chunkEndSec = (double)(chunkOffset + chunkLength) / BytesPerSecond;
            var chunkStream = BuildWavChunk(wavBytes, dataOffset + chunkOffset, chunkLength);

            var text = await TranscribeChunkAsync(client, url, chunkStream, i, chunkStartSec, chunkEndSec, ct);
            results.Add(text);
        }

        var joined = string.Join(" ", results.Where(r => !string.IsNullOrWhiteSpace(r)));
        var unintelligibleCount = results.Count(r => r == UnintelligibleMarker);
        if (unintelligibleCount > 0)
            logger.LogWarning(
                "Transcription complete with {Unintelligible} unintelligible chunk(s). Chunks={Chunks} TranscriptLength={Length}",
                unintelligibleCount, totalChunks, joined.Length);
        else
            logger.LogInformation("Transcription complete. Chunks={Chunks} TranscriptLength={Length}", totalChunks, joined.Length);
        return joined;
    }

    private async Task<string> TranscribeChunkAsync(HttpClient client, string url, MemoryStream chunkStream, int chunkIndex, double startSec, double endSec, CancellationToken ct)
    {
        var content = new StreamContent(chunkStream);
        content.Headers.ContentType = new MediaTypeHeaderValue("audio/wav");

        using var response = await client.PostAsync(url, content, ct);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Azure Speech transcription failed. Status={Status}", response.StatusCode);
            throw new InvalidOperationException($"Transcription failed: {response.StatusCode}");
        }

        var body = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(body);

        var status = doc.RootElement.TryGetProperty("RecognitionStatus", out var s) ? s.GetString() : null;
        if (status == "InitialSilenceTimeout" || status == "NoMatch")
        {
            logger.LogWarning(
                "Azure Speech chunk rejected — audio will appear as [unintelligible] in transcript. Chunk={Chunk} StartSec={Start:F1} EndSec={End:F1} Status={Status}",
                chunkIndex, startSec, endSec, status);
            return UnintelligibleMarker;
        }

        if (status != "Success")
        {
            logger.LogError("Azure Speech returned non-success status. Status={Status}", status);
            throw new InvalidOperationException($"Transcription was not successful. Status: {status ?? "Unknown"}");
        }

        return doc.RootElement.TryGetProperty("DisplayText", out var t) ? t.GetString() ?? string.Empty : string.Empty;
    }

    /// <summary>
    /// Scans the RIFF chunk list to find the "data" chunk.
    /// Returns its byte offset within the stream and its declared length.
    /// </summary>
    internal static (int dataOffset, int dataLength) ParseWavDataInfo(byte[] bytes)
    {
        var len = bytes.Length;

        // RIFF(4) + fileSize(4) + WAVE(4) = 12 bytes preamble
        if (len < 12) throw new InvalidOperationException("WAV stream too short.");

        var pos = 12;
        while (pos + 8 <= len)
        {
            var chunkId = System.Text.Encoding.ASCII.GetString(bytes, pos, 4);
            var chunkSize = BitConverter.ToInt32(bytes, pos + 4);
            if (chunkId == "data")
            {
                // ffmpeg writing to a non-seekable pipe emits chunkSize=0 or 0xFFFFFFFF (-1 as
                // Int32) because it cannot seek back to fill in the size. Fall back to the
                // remaining bytes in the buffer (the actual PCM payload) in both cases, and
                // also whenever the declared size exceeds what is actually in the buffer.
                var remaining = bytes.Length - (pos + 8);
                var actualLength = (chunkSize <= 0 || chunkSize > remaining) ? remaining : chunkSize;
                return (pos + 8, actualLength);
            }
            if (chunkSize < 0 || (long)pos + 8 + chunkSize > len)
                throw new InvalidOperationException(
                    $"WAV chunk '{chunkId}' has invalid size {chunkSize} at offset {pos} (buffer length {len}).");
            pos += 8 + chunkSize;
            if (chunkSize % 2 != 0 && pos < len) pos++; // WAV padding byte
        }

        throw new InvalidOperationException("WAV 'data' chunk not found.");
    }

    /// <summary>
    /// Builds a new PCM WAV MemoryStream from a slice of the source byte array.
    /// </summary>
    internal static MemoryStream BuildWavChunk(byte[] sourceBytes, int pcmOffset, int pcmLength)
    {
        const int blockAlign = BytesPerSample * Channels;
        var ms = new MemoryStream(44 + pcmLength);
        var w = new BinaryWriter(ms);

        // RIFF header
        w.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));
        w.Write(36 + pcmLength);
        w.Write(System.Text.Encoding.ASCII.GetBytes("WAVE"));

        // fmt chunk
        w.Write(System.Text.Encoding.ASCII.GetBytes("fmt "));
        w.Write(16);                    // chunk size
        w.Write((short)1);              // PCM
        w.Write((short)Channels);
        w.Write(SampleRate);
        w.Write(BytesPerSecond);
        w.Write((short)blockAlign);
        w.Write((short)(BytesPerSample * 8));

        // data chunk
        w.Write(System.Text.Encoding.ASCII.GetBytes("data"));
        w.Write(pcmLength);
        ms.Write(sourceBytes, pcmOffset, pcmLength);

        ms.Position = 0;
        return ms;
    }

}
