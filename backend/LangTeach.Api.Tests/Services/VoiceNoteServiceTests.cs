using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class VoiceNoteServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly IDbContextFactory<AppDbContext> _dbFactory;
    private readonly VoiceNoteService _sut;
    private readonly Guid _teacherId = Guid.NewGuid();

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
    public async Task UploadAsync_ValidFile_ReturnsTranscribedNote()
    {
        var file = MakeFormFile("recording.webm", "audio/webm", 1024);

        var result = await _sut.UploadAsync(_teacherId, file);

        result.Should().NotBeNull();
        result.TranscribedAt.Should().NotBeNull();
        result.Transcription.Should().Be("[Test transcription]");
        result.OriginalFileName.Should().Be("recording.webm");
        result.ContentType.Should().Be("audio/webm");
    }

    [Fact]
    public async Task UploadAsync_FileTooLarge_ThrowsInvalidOperation()
    {
        var oversizeFile = MakeFormFile("big.webm", "audio/webm", sizeBytes: 51 * 1024 * 1024);

        var act = () => _sut.UploadAsync(_teacherId, oversizeFile);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*exceeds maximum*");
    }

    [Fact]
    public async Task UploadAsync_UnsupportedContentType_ThrowsInvalidOperation()
    {
        var file = MakeFormFile("video.mp4", "video/mp4", 1024);

        var act = () => _sut.UploadAsync(_teacherId, file);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not supported*");
    }

    [Fact]
    public async Task GetByIdAsync_ExistingNote_ReturnsNote()
    {
        var file = MakeFormFile("recording.webm", "audio/webm", 1024);
        var created = await _sut.UploadAsync(_teacherId, file);

        var result = await _sut.GetByIdAsync(_teacherId, created.Id);

        result.Should().NotBeNull();
        result!.Id.Should().Be(created.Id);
    }

    [Fact]
    public async Task GetByIdAsync_OtherTeacherNote_ReturnsNull()
    {
        var file = MakeFormFile("recording.webm", "audio/webm", 1024);
        var created = await _sut.UploadAsync(_teacherId, file);
        var otherTeacherId = Guid.NewGuid();

        var result = await _sut.GetByIdAsync(otherTeacherId, created.Id);

        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateTranscriptionAsync_ValidNote_UpdatesText()
    {
        var file = MakeFormFile("recording.webm", "audio/webm", 1024);
        var created = await _sut.UploadAsync(_teacherId, file);

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

    public void Dispose() => _db.Dispose();

    private static IFormFile MakeFormFile(string fileName, string contentType, long sizeBytes)
    {
        var bytes = new byte[sizeBytes];
        var stream = new MemoryStream(bytes);
        var file = new FormFile(stream, 0, sizeBytes, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType,
        };
        return file;
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
