using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
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

    // Each validator receives up to 16 header bytes and returns true if they match the format.
    private static readonly Dictionary<string, Func<byte[], bool>> MagicByteValidators = new(StringComparer.OrdinalIgnoreCase)
    {
        // EBML header (Matroska / WebM)
        ["audio/webm"] = h => h.Length >= 4 && h[0] == 0x1A && h[1] == 0x45 && h[2] == 0xDF && h[3] == 0xA3,
        // ISO Base Media File Format: "ftyp" box at offset 4
        ["audio/mp4"]  = h => h.Length >= 8 && h[4] == (byte)'f' && h[5] == (byte)'t' && h[6] == (byte)'y' && h[7] == (byte)'p',
        ["audio/x-m4a"]= h => h.Length >= 8 && h[4] == (byte)'f' && h[5] == (byte)'t' && h[6] == (byte)'y' && h[7] == (byte)'p',
        // RIFF container with WAVE tag at offset 8
        ["audio/wav"]  = h => h.Length >= 12
                              && h[0] == (byte)'R' && h[1] == (byte)'I' && h[2] == (byte)'F' && h[3] == (byte)'F'
                              && h[8] == (byte)'W' && h[9] == (byte)'A' && h[10] == (byte)'V' && h[11] == (byte)'E',
        // Ogg bitstream capture pattern
        ["audio/ogg"]  = h => h.Length >= 4 && h[0] == (byte)'O' && h[1] == (byte)'g' && h[2] == (byte)'g' && h[3] == (byte)'S',
        // ID3 tag or MPEG sync word (0xFF followed by 0xFB / 0xF3 / 0xF2)
        ["audio/mpeg"] = h => h.Length >= 3
                              && (
                                  (h[0] == (byte)'I' && h[1] == (byte)'D' && h[2] == (byte)'3')
                                  || (h[0] == 0xFF && (h[1] == 0xFB || h[1] == 0xF3 || h[1] == 0xF2))
                              ),
    };

    private const long MaxFileSizeBytes = 50 * 1024 * 1024; // 50 MB

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

    public async Task<VoiceNoteDto> UploadAsync(Guid teacherId, Stream audio, string fileName, string contentType, long sizeBytes, CancellationToken ct = default)
    {
        if (sizeBytes == 0)
            throw new InvalidOperationException("An audio file is required and cannot be empty.");

        if (sizeBytes > MaxFileSizeBytes)
            throw new InvalidOperationException($"File exceeds maximum allowed size of {MaxFileSizeBytes / (1024 * 1024)} MB.");

        // Browsers send MIME types with codec parameters (e.g. "audio/webm;codecs=opus").
        // Strip parameters before validation and storage so the base type matches AllowedContentTypes.
        var baseContentType = contentType.Split(';')[0].Trim();

        if (!AllowedContentTypes.Contains(baseContentType))
            throw new InvalidOperationException($"File type '{baseContentType}' is not supported. Supported types: webm, mp4, mpeg, wav, ogg.");

        var id = Guid.NewGuid();
        var ext = Path.GetExtension(fileName);
        var blobPath = $"teachers/{teacherId}/{id}{ext}";

        // Buffer the stream so we can reuse the bytes for blob upload and transcription
        using var buffer = new MemoryStream();
        await audio.CopyToAsync(buffer, ct);
        buffer.Position = 0;

        // Verify magic bytes match the declared content type to prevent MIME spoofing
        var header = new byte[16];
        var bytesRead = await buffer.ReadAsync(header, 0, header.Length, ct);
        var effectiveHeader = header[..bytesRead]; // slice to actual bytes; short files fail h.Length guards
        if (!MagicByteValidators.TryGetValue(baseContentType, out var isValidMagic) || !isValidMagic(effectiveHeader))
            throw new InvalidOperationException($"File content does not match the declared type '{baseContentType}'.");
        buffer.Position = 0;

        // Upload audio to blob storage
        await _blobStorage.UploadAsync(buffer, blobPath, baseContentType, ct);

        _logger.LogInformation("Voice note uploaded to blob. TeacherId={TeacherId} BlobPath={BlobPath}", teacherId, blobPath);

        buffer.Position = 0;
        var transcription = await _transcription.TranscribeAsync(buffer, fileName, baseContentType, ct);

        var note = new VoiceNote
        {
            Id = id,
            TeacherId = teacherId,
            BlobPath = blobPath,
            OriginalFileName = Path.GetFileName(fileName),
            ContentType = baseContentType,
            SizeBytes = sizeBytes,
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

    public async Task<bool> DeleteAsync(Guid teacherId, Guid id, CancellationToken ct = default)
    {
        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var note = await db.VoiceNotes
            .FirstOrDefaultAsync(v => v.Id == id && v.TeacherId == teacherId, ct);
        if (note is null) return false;

        var blobPath = note.BlobPath;

        // Null out any feedback rows referencing this VoiceNote before deletion.
        // The FK uses NoAction (SQL Server cascade cycle constraint), so we must
        // clear the reference explicitly or the Remove will throw a FK violation.
        // Load-and-set instead of ExecuteUpdateAsync so InMemory tests work.
        var feedbackRows = await db.AssistantTurnFeedbacks
            .Where(f => f.VoiceNoteId == id)
            .ToListAsync(ct);
        foreach (var row in feedbackRows)
            row.VoiceNoteId = null;

        db.VoiceNotes.Remove(note);
        await db.SaveChangesAsync(ct);

        try
        {
            await _blobStorage.DeleteAsync(blobPath, ct);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Blob delete failed for orphaned path. Id={Id} BlobPath={BlobPath}", id, blobPath);
        }

        return true;
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
