using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class VoiceNoteService : IVoiceNoteService
{
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "audio/webm",
        "audio/mp4",
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
        "audio/x-m4a",
    };

    private const long MaxFileSizeBytes = 50 * 1024 * 1024; // 50 MB
    private const int MaxDurationSeconds = 5 * 60;           // 5 minutes

    private readonly IDbContextFactory<AppDbContext> _dbFactory;
    private readonly IVoiceNoteBlobStorage _blobStorage;
    private readonly ITranscriptionService _transcription;
    private readonly ILogger<VoiceNoteService> _logger;

    public VoiceNoteService(
        IDbContextFactory<AppDbContext> dbFactory,
        IVoiceNoteBlobStorage blobStorage,
        ITranscriptionService transcription,
        ILogger<VoiceNoteService> logger)
    {
        _dbFactory = dbFactory;
        _blobStorage = blobStorage;
        _transcription = transcription;
        _logger = logger;
    }

    public async Task<VoiceNoteDto> UploadAsync(Guid teacherId, IFormFile file, CancellationToken ct = default)
    {
        if (file.Length > MaxFileSizeBytes)
            throw new InvalidOperationException($"File exceeds maximum allowed size of {MaxFileSizeBytes / (1024 * 1024)} MB.");

        if (!AllowedContentTypes.Contains(file.ContentType))
            throw new InvalidOperationException($"File type '{file.ContentType}' is not supported. Supported types: webm, mp4, mpeg, wav, ogg.");

        var id = Guid.NewGuid();
        var ext = Path.GetExtension(file.FileName);
        var blobPath = $"teachers/{teacherId}/{id}{ext}";

        // Buffer the file so we can reuse the bytes for blob upload and transcription
        using var buffer = new MemoryStream();
        await file.CopyToAsync(buffer, ct);
        buffer.Position = 0;

        // Upload audio to blob storage
        await _blobStorage.UploadAsync(buffer, blobPath, file.ContentType, ct);

        _logger.LogInformation("Voice note uploaded to blob. TeacherId={TeacherId} BlobPath={BlobPath}", teacherId, blobPath);

        buffer.Position = 0;
        var transcription = await _transcription.TranscribeAsync(buffer, file.FileName, file.ContentType, ct);

        var note = new VoiceNote
        {
            Id = id,
            TeacherId = teacherId,
            BlobPath = blobPath,
            OriginalFileName = Path.GetFileName(file.FileName),
            ContentType = file.ContentType,
            SizeBytes = file.Length,
            DurationSeconds = 0, // Duration extraction not yet implemented; field reserved for future use
            Transcription = transcription,
            TranscribedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
        };

        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        db.VoiceNotes.Add(note);
        await db.SaveChangesAsync(ct);

        _logger.LogInformation("VoiceNote persisted. Id={Id} TeacherId={TeacherId}", id, teacherId);
        return ToDto(note);
    }

    public async Task<VoiceNoteDto?> GetByIdAsync(Guid teacherId, Guid id, CancellationToken ct = default)
    {
        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var note = await db.VoiceNotes
            .FirstOrDefaultAsync(v => v.Id == id && v.TeacherId == teacherId, ct);
        return note is null ? null : ToDto(note);
    }

    public async Task<VoiceNoteDto?> UpdateTranscriptionAsync(Guid teacherId, Guid id, string transcription, CancellationToken ct = default)
    {
        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var note = await db.VoiceNotes
            .FirstOrDefaultAsync(v => v.Id == id && v.TeacherId == teacherId, ct);
        if (note is null) return null;

        note.Transcription = transcription;
        await db.SaveChangesAsync(ct);
        return ToDto(note);
    }

    public async Task<string?> GetAudioUrlAsync(Guid teacherId, Guid id, CancellationToken ct = default)
    {
        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var note = await db.VoiceNotes
            .FirstOrDefaultAsync(v => v.Id == id && v.TeacherId == teacherId, ct);
        if (note is null) return null;

        return await _blobStorage.GetDownloadUrlAsync(note.BlobPath);
    }

    private static VoiceNoteDto ToDto(VoiceNote note) => new(
        note.Id,
        note.OriginalFileName,
        note.ContentType,
        note.SizeBytes,
        note.DurationSeconds,
        note.Transcription,
        note.TranscribedAt,
        note.CreatedAt
    );
}
