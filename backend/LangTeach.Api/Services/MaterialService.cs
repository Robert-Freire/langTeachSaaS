using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class MaterialService : IMaterialService
{
    private readonly AppDbContext _db;
    private readonly IBlobStorageService _blobStorage;
    private readonly ILogger<MaterialService> _logger;

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    private static readonly Dictionary<string, HashSet<string>> AllowedExtensionsByType = new(StringComparer.OrdinalIgnoreCase)
    {
        ["application/pdf"] = new(StringComparer.OrdinalIgnoreCase) { ".pdf" },
        ["image/jpeg"] = new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg" },
        ["image/png"] = new(StringComparer.OrdinalIgnoreCase) { ".png" },
        ["image/webp"] = new(StringComparer.OrdinalIgnoreCase) { ".webp" },
    };

    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    public MaterialService(AppDbContext db, IBlobStorageService blobStorage, ILogger<MaterialService> logger)
    {
        _db = db;
        _blobStorage = blobStorage;
        _logger = logger;
    }

    public async Task<MaterialDto> UploadAsync(Guid teacherId, Guid lessonId, Guid sectionId, IFormFile file, CancellationToken cancellationToken = default)
    {
        var section = await _db.LessonSections
            .Include(s => s.Lesson)
            .FirstOrDefaultAsync(s => s.Id == sectionId && s.LessonId == lessonId && s.Lesson.TeacherId == teacherId && !s.Lesson.IsDeleted, cancellationToken);

        if (section is null)
            throw new InvalidOperationException("Section not found or access denied.");

        if (file.Length > MaxFileSizeBytes)
            throw new InvalidOperationException($"File size exceeds the maximum allowed size of {MaxFileSizeBytes / (1024 * 1024)} MB.");

        if (!AllowedContentTypes.Contains(file.ContentType))
            throw new InvalidOperationException($"File type '{file.ContentType}' is not supported. Allowed types: PDF, JPEG, PNG, WebP.");

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedExtensionsByType.TryGetValue(file.ContentType, out var allowedExts) || !allowedExts.Contains(extension))
            throw new InvalidOperationException($"File extension '{extension}' does not match content type '{file.ContentType}'.");

        var materialId = Guid.NewGuid();
        var sanitizedFileName = Path.GetFileName(file.FileName);
        var blobPath = $"{teacherId}/{lessonId}/{materialId}_{sanitizedFileName}";

        await using var stream = file.OpenReadStream();
        await _blobStorage.UploadAsync(stream, blobPath, file.ContentType, cancellationToken);

        var material = new Material
        {
            Id = materialId,
            LessonSectionId = sectionId,
            FileName = sanitizedFileName,
            ContentType = file.ContentType,
            SizeBytes = file.Length,
            BlobPath = blobPath,
            CreatedAt = DateTime.UtcNow
        };

        _db.Materials.Add(material);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Material uploaded. MaterialId={MaterialId} SectionId={SectionId} FileName={FileName}", materialId, sectionId, sanitizedFileName);

        var previewUrl = await _blobStorage.GetDownloadUrlAsync(blobPath);
        return new MaterialDto(material.Id, material.FileName, material.ContentType, material.SizeBytes, material.BlobPath, previewUrl, material.CreatedAt);
    }

    public async Task<List<MaterialDto>> ListAsync(Guid teacherId, Guid lessonId, Guid sectionId, CancellationToken cancellationToken = default)
    {
        var materials = await _db.Materials
            .Where(m => m.LessonSectionId == sectionId
                && m.LessonSection.LessonId == lessonId
                && m.LessonSection.Lesson.TeacherId == teacherId
                && !m.LessonSection.Lesson.IsDeleted)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);

        var dtos = new List<MaterialDto>(materials.Count);
        foreach (var m in materials)
        {
            var url = await _blobStorage.GetDownloadUrlAsync(m.BlobPath);
            dtos.Add(new MaterialDto(m.Id, m.FileName, m.ContentType, m.SizeBytes, m.BlobPath, url, m.CreatedAt));
        }
        return dtos;
    }

    public async Task<string?> GetDownloadUrlAsync(Guid teacherId, Guid lessonId, Guid sectionId, Guid materialId, CancellationToken cancellationToken = default)
    {
        var material = await _db.Materials
            .Where(m => m.Id == materialId
                && m.LessonSectionId == sectionId
                && m.LessonSection.LessonId == lessonId
                && m.LessonSection.Lesson.TeacherId == teacherId
                && !m.LessonSection.Lesson.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (material is null) return null;

        return await _blobStorage.GetDownloadUrlAsync(material.BlobPath);
    }

    public async Task<bool> DeleteAsync(Guid teacherId, Guid lessonId, Guid sectionId, Guid materialId, CancellationToken cancellationToken = default)
    {
        var material = await _db.Materials
            .Where(m => m.Id == materialId
                && m.LessonSectionId == sectionId
                && m.LessonSection.LessonId == lessonId
                && m.LessonSection.Lesson.TeacherId == teacherId
                && !m.LessonSection.Lesson.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (material is null) return false;

        var blobPath = material.BlobPath;
        _db.Materials.Remove(material);
        await _db.SaveChangesAsync(cancellationToken);

        try
        {
            await _blobStorage.DeleteAsync(blobPath, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete blob {BlobPath} after removing DB record. Orphaned blob may remain.", blobPath);
        }

        _logger.LogInformation("Material deleted. MaterialId={MaterialId} SectionId={SectionId}", materialId, sectionId);
        return true;
    }

    public async Task DeleteBlobsForSectionsAsync(IEnumerable<Guid> sectionIds, CancellationToken cancellationToken = default)
    {
        var sectionIdSet = sectionIds.ToHashSet();
        var materials = await _db.Materials
            .Where(m => sectionIdSet.Contains(m.LessonSectionId))
            .ToListAsync(cancellationToken);

        foreach (var m in materials)
        {
            await _blobStorage.DeleteAsync(m.BlobPath, cancellationToken);
        }

        _logger.LogInformation("Deleted {Count} blobs for {SectionCount} removed sections", materials.Count, sectionIdSet.Count);
    }

    public async Task EnrichWithPreviewUrls(List<LessonSectionDto> sections)
    {
        foreach (var section in sections)
        {
            for (var i = 0; i < section.Materials.Count; i++)
            {
                var mat = section.Materials[i];
                if (mat.PreviewUrl is null && !string.IsNullOrEmpty(mat.BlobPath))
                {
                    var url = await _blobStorage.GetDownloadUrlAsync(mat.BlobPath);
                    section.Materials[i] = mat with { PreviewUrl = url };
                }
            }
        }
    }
}
