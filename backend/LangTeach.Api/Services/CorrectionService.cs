using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services.CorrectionDocxExport;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Services;

public class CorrectionService : ICorrectionService
{
    private readonly AppDbContext _db;
    private readonly ILogger<CorrectionService> _logger;

    public CorrectionService(AppDbContext db, ILogger<CorrectionService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<IReadOnlyList<CorrectionSummaryDto>?> ListAsync(
        Guid teacherId, Guid studentId, CancellationToken cancellationToken = default)
    {
        if (!await StudentBelongsToTeacherAsync(teacherId, studentId, cancellationToken))
            return null;

        // Staleness recovery: a background AI task that failed silently leaves the
        // correction stuck in Corrigiendo. After StaleCorrigiendoSeconds we revert to
        // Entregada so the teacher can retry. Must exceed p99 Claude latency (~30s).
        const int StaleCorrigiendoSeconds = 60;
        var staleThreshold = DateTime.UtcNow.AddSeconds(-StaleCorrigiendoSeconds);
        var stale = await _db.Corrections
            .Where(c => c.TeacherId == teacherId && c.StudentId == studentId
                     && c.DeletedAt == null
                     && c.Status == CorrectionStatus.Corrigiendo
                     && c.UpdatedAt < staleThreshold)
            .ToListAsync(cancellationToken);
        if (stale.Count > 0)
        {
            var now = DateTime.UtcNow;
            foreach (var s in stale)
            {
                s.Status = CorrectionStatus.Entregada;
                s.UpdatedAt = now;
            }
            await _db.SaveChangesAsync(cancellationToken);
        }

        var rows = await _db.Corrections
            .Where(c => c.TeacherId == teacherId && c.StudentId == studentId && c.DeletedAt == null)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new CorrectionSummaryDto(c.Id, c.AssignmentTitle, c.Status, c.CreatedAt, c.CorrectedAt))
            .ToListAsync(cancellationToken);

        return rows;
    }

    public async Task<CorrectionDetailDto?> CreateAsync(
        Guid teacherId, Guid studentId, CreateCorrectionRequest request, CancellationToken cancellationToken = default)
    {
        if (!await StudentBelongsToTeacherAsync(teacherId, studentId, cancellationToken))
            return null;

        var now = DateTime.UtcNow;
        var hasText = !string.IsNullOrWhiteSpace(request.StudentText);
        var correction = new Correction
        {
            Id = Guid.NewGuid(),
            TeacherId = teacherId,
            StudentId = studentId,
            SchemaVersion = 1,
            Status = hasText ? CorrectionStatus.Entregada : CorrectionStatus.Pendiente,
            AssignmentTitle = DefaultIfBlank(request.AssignmentTitle, now),
            AssignmentPrompt = NullIfBlank(request.AssignmentPrompt),
            StudentText = hasText ? request.StudentText : null,
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.Corrections.Add(correction);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Correction created. CorrectionId={CorrectionId} TeacherId={TeacherId} StudentId={StudentId} Status={Status}",
            correction.Id, teacherId, studentId, correction.Status);

        return ToDetail(correction, []);
    }

    public async Task<CorrectionDetailDto?> GetByIdAsync(
        Guid teacherId, Guid studentId, Guid correctionId, CancellationToken cancellationToken = default)
    {
        var correction = await _db.Corrections
            .Include(c => c.Tags)
            .FirstOrDefaultAsync(
                c => c.Id == correctionId
                  && c.TeacherId == teacherId
                  && c.StudentId == studentId
                  && c.DeletedAt == null,
                cancellationToken);

        return correction is null ? null : ToDetail(correction, correction.Tags);
    }

    public async Task<CorrectionDetailDto?> UpdateAsync(
        Guid teacherId, Guid studentId, Guid correctionId, UpdateCorrectionRequest request, CancellationToken cancellationToken = default)
    {
        var correction = await _db.Corrections
            .Include(c => c.Tags)
            .FirstOrDefaultAsync(
                c => c.Id == correctionId
                  && c.TeacherId == teacherId
                  && c.StudentId == studentId
                  && c.DeletedAt == null,
                cancellationToken);

        if (correction is null) return null;

        if (request.AssignmentTitle is not null)
        {
            // Treat blank as a "reset to default" signal rather than an error.
            correction.AssignmentTitle = DefaultIfBlank(request.AssignmentTitle, correction.CreatedAt);
        }

        if (request.AssignmentPrompt is not null)
            correction.AssignmentPrompt = NullIfBlank(request.AssignmentPrompt);

        if (request.StudentText is not null)
        {
            // StudentText is locked once the correction is Corregida; the markup tags reference
            // character offsets that would no longer match.
            if (correction.Status == CorrectionStatus.Corregida || correction.Status == CorrectionStatus.Corrigiendo)
                throw new CorrectionStudentTextLockedException();

            var trimmed = string.IsNullOrWhiteSpace(request.StudentText) ? null : request.StudentText;
            correction.StudentText = trimmed;
            if (trimmed is not null && correction.Status is CorrectionStatus.Pendiente or CorrectionStatus.CorreccionFallida)
                correction.Status = CorrectionStatus.Entregada;
            else if (trimmed is null && correction.Status is CorrectionStatus.Entregada or CorrectionStatus.CorreccionFallida)
                correction.Status = CorrectionStatus.Pendiente;
        }

        correction.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return ToDetail(correction, correction.Tags);
    }

    public async Task<bool> SoftDeleteAsync(
        Guid teacherId, Guid studentId, Guid correctionId, CancellationToken cancellationToken = default)
    {
        var correction = await _db.Corrections.FirstOrDefaultAsync(
            c => c.Id == correctionId
              && c.TeacherId == teacherId
              && c.StudentId == studentId
              && c.DeletedAt == null,
            cancellationToken);

        if (correction is null) return false;

        correction.DeletedAt = DateTime.UtcNow;
        correction.UpdatedAt = correction.DeletedAt.Value;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<CorrectionExportData?> GetForExportAsync(
        Guid teacherId, Guid studentId, Guid correctionId, CancellationToken cancellationToken = default)
    {
        var row = await (
            from c in _db.Corrections.Include(c => c.Tags)
            join s in _db.Students on c.StudentId equals s.Id
            where c.Id == correctionId
                  && c.TeacherId == teacherId
                  && c.StudentId == studentId
                  && c.DeletedAt == null
                  && s.TeacherId == teacherId
                  && !s.IsDeleted
            select new { Correction = c, StudentName = s.Name }
        ).FirstOrDefaultAsync(cancellationToken);

        if (row is null) return null;

        if (row.Correction.Status != CorrectionStatus.Corregida)
            throw new CorrectionInvalidStateException("not_corregida", "Correction is not in the Corregida state.");

        return new CorrectionExportData(
            CorrectionDtoMapper.ToDetail(row.Correction, row.Correction.Tags),
            row.StudentName);
    }

    private async Task<bool> StudentBelongsToTeacherAsync(Guid teacherId, Guid studentId, CancellationToken ct) =>
        await _db.Students.AnyAsync(s => s.Id == studentId && s.TeacherId == teacherId && !s.IsDeleted, ct);

    private static string DefaultIfBlank(string? title, DateTime asOf) =>
        string.IsNullOrWhiteSpace(title)
            ? $"Redacción {asOf:yyyy-MM-dd}"
            : title.Trim();

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static CorrectionDetailDto ToDetail(Correction c, IEnumerable<CorrectionTag> tags) =>
        CorrectionDtoMapper.ToDetail(c, tags);
}
