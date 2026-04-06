using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class VoiceNoteServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly IDbContextFactory<AppDbContext> _dbFactory;
    private readonly VoiceNoteService _sut;
    private readonly Guid _teacherId = Guid.NewGuid();

    // Magic byte prefixes for each supported audio type
    private static readonly byte[] WebmHeader  = [0x1A, 0x45, 0xDF, 0xA3];
    private static readonly byte[] Mp4Header   = [0x00, 0x00, 0x00, 0x00, (byte)'f', (byte)'t', (byte)'y', (byte)'p'];
    private static readonly byte[] WavHeader   = [(byte)'R', (byte)'I', (byte)'F', (byte)'F',
                                                   0x00, 0x00, 0x00, 0x00,
                                                   (byte)'W', (byte)'A', (byte)'V', (byte)'E'];
    private static readonly byte[] OggHeader   = [(byte)'O', (byte)'g', (byte)'g', (byte)'S'];
    private static readonly byte[] MpegId3Header  = [(byte)'I', (byte)'D', (byte)'3'];
    private static readonly byte[] MpegSyncHeader = [0xFF, 0xFB];

    public VoiceNoteServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _dbFactory = new FixedDbContextFactory(options);
        _sut = new VoiceNoteService(
            _dbFactory,
            new Helpers.InMemoryVoiceNoteBlobStorage(),
            new StubTranscriptionService(),
            NullLogger<VoiceNoteService>.Instance);

        SeedTeacher();
    }

    private void SeedTeacher()
    {
        _db.Teachers.Add(new Teacher
        {
            Id = _teacherId,
            Auth0UserId = "auth0|vn-test",
            Email = "vn@test.com",
            DisplayName = "VN Test",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();
    }

    [Fact]
    public async Task UploadAsync_ValidStream_ReturnsTranscribedNote()
    {
        using var stream = MakeStream(1024, WebmHeader);

        var result = await _sut.UploadAsync(_teacherId, stream, "recording.webm", "audio/webm", WebmHeader.Length + 1024);

        result.Should().NotBeNull();
        result.TranscribedAt.Should().NotBeNull();
        result.Transcription.Should().Be("[Test transcription]");
        result.OriginalFileName.Should().Be("recording.webm");
        result.ContentType.Should().Be("audio/webm");
    }

    [Fact]
    public async Task UploadAsync_StreamTooLarge_ThrowsInvalidOperation()
    {
        using var stream = MakeStream(1024, WebmHeader);
        var oversizeBytes = 51L * 1024 * 1024;

        var act = () => _sut.UploadAsync(_teacherId, stream, "big.webm", "audio/webm", oversizeBytes);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*exceeds maximum*");
    }

    [Fact]
    public async Task UploadAsync_UnsupportedContentType_ThrowsInvalidOperation()
    {
        using var stream = MakeStream(1024, WebmHeader);

        var act = () => _sut.UploadAsync(_teacherId, stream, "video.mp4", "video/mp4", 1024);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not supported*");
    }

    // --- Magic bytes happy-path tests ---

    [Fact]
    public async Task UploadAsync_WebmMagicBytes_Passes()
    {
        using var stream = MakeStream(512, WebmHeader);
        var result = await _sut.UploadAsync(_teacherId, stream, "rec.webm", "audio/webm", WebmHeader.Length + 512);
        result.ContentType.Should().Be("audio/webm");
    }

    [Fact]
    public async Task UploadAsync_Mp4MagicBytes_Passes()
    {
        using var stream = MakeStream(512, Mp4Header);
        var result = await _sut.UploadAsync(_teacherId, stream, "rec.mp4", "audio/mp4", Mp4Header.Length + 512);
        result.ContentType.Should().Be("audio/mp4");
    }

    [Fact]
    public async Task UploadAsync_XM4aMagicBytes_Passes()
    {
        using var stream = MakeStream(512, Mp4Header);
        var result = await _sut.UploadAsync(_teacherId, stream, "rec.m4a", "audio/x-m4a", Mp4Header.Length + 512);
        result.ContentType.Should().Be("audio/x-m4a");
    }

    [Fact]
    public async Task UploadAsync_WavMagicBytes_Passes()
    {
        using var stream = MakeStream(512, WavHeader);
        var result = await _sut.UploadAsync(_teacherId, stream, "rec.wav", "audio/wav", WavHeader.Length + 512);
        result.ContentType.Should().Be("audio/wav");
    }

    [Fact]
    public async Task UploadAsync_OggMagicBytes_Passes()
    {
        using var stream = MakeStream(512, OggHeader);
        var result = await _sut.UploadAsync(_teacherId, stream, "rec.ogg", "audio/ogg", OggHeader.Length + 512);
        result.ContentType.Should().Be("audio/ogg");
    }

    [Fact]
    public async Task UploadAsync_MpegId3MagicBytes_Passes()
    {
        using var stream = MakeStream(512, MpegId3Header);
        var result = await _sut.UploadAsync(_teacherId, stream, "rec.mp3", "audio/mpeg", MpegId3Header.Length + 512);
        result.ContentType.Should().Be("audio/mpeg");
    }

    [Fact]
    public async Task UploadAsync_MpegSyncWordMagicBytes_Passes()
    {
        using var stream = MakeStream(512, MpegSyncHeader);
        var result = await _sut.UploadAsync(_teacherId, stream, "rec.mp3", "audio/mpeg", MpegSyncHeader.Length + 512);
        result.ContentType.Should().Be("audio/mpeg");
    }

    // --- Spoofed MIME type test ---

    [Fact]
    public async Task UploadAsync_SpoofedMimeType_ThrowsInvalidOperation()
    {
        // Stream contains Ogg magic bytes but is declared as audio/webm
        using var stream = MakeStream(512, OggHeader);

        var act = () => _sut.UploadAsync(_teacherId, stream, "spoofed.webm", "audio/webm", OggHeader.Length + 512);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*does not match the declared type*");
    }

    // --- Other existing tests ---

    [Fact]
    public async Task GetByIdAsync_ExistingNote_ReturnsNote()
    {
        using var stream = MakeStream(1024, WebmHeader);
        var created = await _sut.UploadAsync(_teacherId, stream, "recording.webm", "audio/webm", WebmHeader.Length + 1024);

        var result = await _sut.GetByIdAsync(_teacherId, created.Id);

        result.Should().NotBeNull();
        result!.Id.Should().Be(created.Id);
    }

    [Fact]
    public async Task GetByIdAsync_OtherTeacherNote_ReturnsNull()
    {
        using var stream = MakeStream(1024, WebmHeader);
        var created = await _sut.UploadAsync(_teacherId, stream, "recording.webm", "audio/webm", WebmHeader.Length + 1024);
        var otherTeacherId = Guid.NewGuid();

        var result = await _sut.GetByIdAsync(otherTeacherId, created.Id);

        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateTranscriptionAsync_ValidNote_UpdatesText()
    {
        using var stream = MakeStream(1024, WebmHeader);
        var created = await _sut.UploadAsync(_teacherId, stream, "recording.webm", "audio/webm", WebmHeader.Length + 1024);

        var updated = await _sut.UpdateTranscriptionAsync(_teacherId, created.Id, "Edited text");

        updated.Should().NotBeNull();
        updated!.Transcription.Should().Be("Edited text");
    }

    [Fact]
    public async Task UpdateTranscriptionAsync_NotFound_ReturnsNull()
    {
        var result = await _sut.UpdateTranscriptionAsync(_teacherId, Guid.NewGuid(), "Text");

        result.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_ExistingNote_ReturnsTrueAndRemovesRow()
    {
        using var stream = MakeStream(1024, WebmHeader);
        var created = await _sut.UploadAsync(_teacherId, stream, "recording.webm", "audio/webm", WebmHeader.Length + 1024);

        var result = await _sut.DeleteAsync(_teacherId, created.Id);

        result.Should().BeTrue();
        var note = await _sut.GetByIdAsync(_teacherId, created.Id);
        note.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_ExistingNote_BlobDeleteCalledWithCorrectPath()
    {
        var blobStorage = new Helpers.InMemoryVoiceNoteBlobStorage();
        var sut = new VoiceNoteService(_dbFactory, blobStorage, new StubTranscriptionService(), NullLogger<VoiceNoteService>.Instance);
        using var stream = MakeStream(1024, WebmHeader);
        var created = await sut.UploadAsync(_teacherId, stream, "recording.webm", "audio/webm", WebmHeader.Length + 1024);

        await sut.DeleteAsync(_teacherId, created.Id);

        blobStorage.ContainsBlob($"teachers/{_teacherId}/{created.Id}.webm").Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_OtherTeacherNote_ReturnsFalse()
    {
        using var stream = MakeStream(1024, WebmHeader);
        var created = await _sut.UploadAsync(_teacherId, stream, "recording.webm", "audio/webm", WebmHeader.Length + 1024);
        var otherTeacherId = Guid.NewGuid();

        var result = await _sut.DeleteAsync(otherTeacherId, created.Id);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_NotFound_ReturnsFalse()
    {
        var result = await _sut.DeleteAsync(_teacherId, Guid.NewGuid());

        result.Should().BeFalse();
    }

    public void Dispose() => _db.Dispose();

    /// <summary>
    /// Creates a MemoryStream with optional magic bytes header followed by zeroed padding.
    /// </summary>
    /// <param name="zeroPaddingBytes">Number of zero bytes appended after the header.</param>
    /// <param name="header">Optional magic bytes prepended to the stream.</param>
    private static MemoryStream MakeStream(int zeroPaddingBytes, byte[]? header = null)
    {
        var total = (header?.Length ?? 0) + zeroPaddingBytes;
        var bytes = new byte[total];
        header?.CopyTo(bytes, 0);
        return new MemoryStream(bytes);
    }

    /// <summary>
    /// Simple IDbContextFactory implementation that creates contexts with pre-built options.
    /// </summary>
    private class FixedDbContextFactory : IDbContextFactory<AppDbContext>
    {
        private readonly DbContextOptions<AppDbContext> _options;
        public FixedDbContextFactory(DbContextOptions<AppDbContext> options) => _options = options;
        public AppDbContext CreateDbContext() => new(_options);
        public Task<AppDbContext> CreateDbContextAsync(CancellationToken ct = default)
            => Task.FromResult(new AppDbContext(_options));
    }
}
