using System.Diagnostics;

namespace LangTeach.Api.Services;

/// <summary>
/// Converts audio streams to 16 kHz mono PCM WAV via ffmpeg.
/// Shared by all transcription service implementations.
/// </summary>
internal static class FfmpegAudioConverter
{
    /// <summary>
    /// Converts the given audio stream to a 16 kHz mono PCM WAV byte array.
    /// Throws <see cref="InvalidOperationException"/> if ffmpeg is not on the PATH
    /// or if the conversion fails.
    /// </summary>
    public static async Task<byte[]> ConvertToWavAsync(Stream input, CancellationToken ct = default)
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

        Process process;
        try
        {
            process = Process.Start(psi) ?? throw new InvalidOperationException("Failed to start ffmpeg");
        }
        catch (System.ComponentModel.Win32Exception ex)
        {
            throw new InvalidOperationException("ffmpeg not found on PATH. Ensure ffmpeg is installed in the container.", ex);
        }

        using var _ = process;
        try
        {
            var writeTask = Task.Run(async () =>
            {
                await input.CopyToAsync(process.StandardInput.BaseStream, ct);
                process.StandardInput.Close();
            }, ct);

            using var wav = new MemoryStream();
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
                throw new InvalidOperationException($"Audio conversion failed. ffmpeg stderr: {stderrBuilder}");

            return wav.ToArray();
        }
        catch
        {
            try
            {
                if (!process.HasExited)
                    process.Kill(entireProcessTree: true);
            }
            catch
            {
                // Suppress kill failures so the original exception is preserved.
            }
            throw;
        }
    }
}
