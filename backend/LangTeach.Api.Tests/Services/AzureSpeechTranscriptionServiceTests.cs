using FluentAssertions;
using LangTeach.Api.Services;

namespace LangTeach.Api.Tests.Services;

public class AzureSpeechTranscriptionServiceTests
{
    // Builds a minimal PCM WAV byte array: 44-byte standard header + pcmLength bytes.
    // dataChunkSize overrides the value written into the data chunk size field;
    // pass 0 or -1 (0xFFFFFFFF) to simulate ffmpeg pipe-mode sentinels.
    private static byte[] BuildTestWav(int pcmLength, int? dataChunkSize = null)
    {
        var buf = new byte[44 + pcmLength];
        // RIFF
        "RIFF"u8.CopyTo(buf.AsSpan(0));
        BitConverter.TryWriteBytes(buf.AsSpan(4), 36 + pcmLength);
        "WAVE"u8.CopyTo(buf.AsSpan(8));
        // fmt
        "fmt "u8.CopyTo(buf.AsSpan(12));
        BitConverter.TryWriteBytes(buf.AsSpan(16), 16);
        BitConverter.TryWriteBytes(buf.AsSpan(20), (short)1);   // PCM
        BitConverter.TryWriteBytes(buf.AsSpan(22), (short)1);   // mono
        BitConverter.TryWriteBytes(buf.AsSpan(24), 16_000);     // sample rate
        BitConverter.TryWriteBytes(buf.AsSpan(28), 32_000);     // byte rate
        BitConverter.TryWriteBytes(buf.AsSpan(32), (short)2);   // block align
        BitConverter.TryWriteBytes(buf.AsSpan(34), (short)16);  // bits/sample
        // data
        "data"u8.CopyTo(buf.AsSpan(36));
        BitConverter.TryWriteBytes(buf.AsSpan(40), dataChunkSize ?? pcmLength);
        // PCM payload: sequential bytes so we can verify slicing
        for (var i = 0; i < pcmLength; i++)
            buf[44 + i] = (byte)(i % 251);
        return buf;
    }

    [Fact]
    public void ParseWavDataInfo_StandardHeader_ReturnsDataOffsetAndLength()
    {
        const int pcmLength = 64_000; // 2 seconds
        var wavBytes = BuildTestWav(pcmLength);

        var (offset, length) = AzureSpeechTranscriptionService.ParseWavDataInfo(wavBytes);

        offset.Should().Be(44);
        length.Should().Be(pcmLength);
    }

    [Fact]
    public void BuildWavChunk_SingleChunk_ProducesValidHeader()
    {
        const int pcmLength = 32_000; // 1 second
        var sourceBytes = BuildTestWav(pcmLength);

        var chunk = AzureSpeechTranscriptionService.BuildWavChunk(sourceBytes, 44, pcmLength);

        var chunkBytes = chunk.ToArray();
        // RIFF marker
        chunkBytes[..4].Should().Equal("RIFF"u8.ToArray());
        // WAVE marker at offset 8
        chunkBytes[8..12].Should().Equal("WAVE"u8.ToArray());
        // data marker at offset 36
        chunkBytes[36..40].Should().Equal("data"u8.ToArray());
        // declared data length
        BitConverter.ToInt32(chunkBytes, 40).Should().Be(pcmLength);
        // total chunk length
        chunkBytes.Length.Should().Be(44 + pcmLength);
    }

    [Fact]
    public void BuildWavChunk_SlicesPreservePcmBytes()
    {
        // 90 seconds of unique-ish PCM
        const int totalPcm = 90 * AzureSpeechTranscriptionService.BytesPerSecond; // 2 880 000 bytes
        var sourceBytes = BuildTestWav(totalPcm);

        // Chunk 1: first 55 seconds
        var chunk1Pcm = AzureSpeechTranscriptionService.MaxChunkDataBytes;
        var chunk1 = AzureSpeechTranscriptionService.BuildWavChunk(sourceBytes, 44, chunk1Pcm);
        // Chunk 2: remaining 35 seconds
        var chunk2Pcm = totalPcm - chunk1Pcm;
        var chunk2 = AzureSpeechTranscriptionService.BuildWavChunk(sourceBytes, 44 + chunk1Pcm, chunk2Pcm);

        var c1 = chunk1.ToArray();
        var c2 = chunk2.ToArray();

        // Data lengths match declared sizes
        BitConverter.ToInt32(c1, 40).Should().Be(chunk1Pcm);
        BitConverter.ToInt32(c2, 40).Should().Be(chunk2Pcm);

        // PCM content from chunks reconstructs original PCM
        var reconstructed = c1[44..].Concat(c2[44..]).ToArray();
        reconstructed.Should().Equal(sourceBytes[44..]);
    }

    [Fact]
    public void ParseWavDataInfo_StreamingWavZeroChunkSize_FallsBackToRemainingBytes()
    {
        // ffmpeg pipe sentinel: chunkSize written as 0
        const int pcmLength = 64_000; // 2 seconds
        var wavBytes = BuildTestWav(pcmLength, dataChunkSize: 0);

        var (offset, length) = AzureSpeechTranscriptionService.ParseWavDataInfo(wavBytes);

        offset.Should().Be(44);
        length.Should().Be(pcmLength);
    }

    [Fact]
    public void ParseWavDataInfo_StreamingWavNegativeOneChunkSize_FallsBackToRemainingBytes()
    {
        // ffmpeg pipe sentinel: chunkSize written as 0xFFFFFFFF (-1 as Int32)
        const int pcmLength = 64_000; // 2 seconds
        var wavBytes = BuildTestWav(pcmLength, dataChunkSize: -1);

        var (offset, length) = AzureSpeechTranscriptionService.ParseWavDataInfo(wavBytes);

        offset.Should().Be(44);
        length.Should().Be(pcmLength);
    }

    [Fact]
    public void ParseWavDataInfo_ZeroChunkSizeAndNoData_ReturnsZero()
    {
        // Genuinely empty: data header present but no PCM bytes follow.
        var wavBytes = BuildTestWav(0, dataChunkSize: 0);

        var (offset, length) = AzureSpeechTranscriptionService.ParseWavDataInfo(wavBytes);

        offset.Should().Be(44);
        length.Should().Be(0);
    }

    // Builds a WAV with a JUNK chunk before the data chunk; chunkSizeOverride controls
    // the JUNK chunk's declared size so we can simulate a malformed non-data chunk.
    private static byte[] BuildWavWithJunkChunk(int junkPayloadLength, int junkChunkSizeOverride, int pcmLength)
    {
        // RIFF(12) + fmt(24) + JUNK header(8) + JUNK payload + data(8) + payload
        var buf = new byte[12 + 24 + 8 + junkPayloadLength + 8 + pcmLength];
        "RIFF"u8.CopyTo(buf.AsSpan(0));
        BitConverter.TryWriteBytes(buf.AsSpan(4), buf.Length - 8);
        "WAVE"u8.CopyTo(buf.AsSpan(8));
        "fmt "u8.CopyTo(buf.AsSpan(12));
        BitConverter.TryWriteBytes(buf.AsSpan(16), 16);
        BitConverter.TryWriteBytes(buf.AsSpan(20), (short)1);
        BitConverter.TryWriteBytes(buf.AsSpan(22), (short)1);
        BitConverter.TryWriteBytes(buf.AsSpan(24), 16_000);
        BitConverter.TryWriteBytes(buf.AsSpan(28), 32_000);
        BitConverter.TryWriteBytes(buf.AsSpan(32), (short)2);
        BitConverter.TryWriteBytes(buf.AsSpan(34), (short)16);
        "JUNK"u8.CopyTo(buf.AsSpan(36));
        BitConverter.TryWriteBytes(buf.AsSpan(40), junkChunkSizeOverride);
        var dataStart = 44 + junkPayloadLength;
        "data"u8.CopyTo(buf.AsSpan(dataStart));
        BitConverter.TryWriteBytes(buf.AsSpan(dataStart + 4), pcmLength);
        return buf;
    }

    [Fact]
    public void ParseWavDataInfo_NegativeNonDataChunkSize_Throws()
    {
        var bytes = BuildWavWithJunkChunk(junkPayloadLength: 4, junkChunkSizeOverride: -16, pcmLength: 32);

        var act = () => AzureSpeechTranscriptionService.ParseWavDataInfo(bytes);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*JUNK*invalid size*");
    }

    [Fact]
    public void ParseWavDataInfo_OversizedNonDataChunkSize_Throws()
    {
        // Declared size is larger than what's actually in the buffer.
        var bytes = BuildWavWithJunkChunk(junkPayloadLength: 4, junkChunkSizeOverride: 1_000_000, pcmLength: 32);

        var act = () => AzureSpeechTranscriptionService.ParseWavDataInfo(bytes);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*JUNK*invalid size*");
    }

    [Fact]
    public void ParseWavDataInfo_ValidNonDataChunkBeforeData_AdvancesAndFindsData()
    {
        var bytes = BuildWavWithJunkChunk(junkPayloadLength: 4, junkChunkSizeOverride: 4, pcmLength: 32);

        var (offset, length) = AzureSpeechTranscriptionService.ParseWavDataInfo(bytes);

        offset.Should().Be(12 + 24 + 8 + 4 + 8); // = 56
        length.Should().Be(32);
    }

    [Fact]
    public void ParseWavDataInfo_ThenBuildChunks_RoundTripsCorrectly()
    {
        const int pcmLength = 3 * AzureSpeechTranscriptionService.BytesPerSecond; // 3 seconds
        var sourceBytes = BuildTestWav(pcmLength);

        var (dataOffset, dataLength) = AzureSpeechTranscriptionService.ParseWavDataInfo(sourceBytes);

        var chunk = AzureSpeechTranscriptionService.BuildWavChunk(sourceBytes, dataOffset, dataLength);
        chunk.Length.Should().Be(44 + pcmLength);
        chunk.ToArray()[44..].Should().Equal(sourceBytes[44..]);
    }
}
