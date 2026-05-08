using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface ICorrectionService
{
    Task<IReadOnlyList<CorrectionSummaryDto>?> ListAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken = default);
    Task<CorrectionDetailDto?> CreateAsync(Guid teacherId, Guid studentId, CreateCorrectionRequest request, CancellationToken cancellationToken = default);
    Task<CorrectionDetailDto?> GetByIdAsync(Guid teacherId, Guid studentId, Guid correctionId, CancellationToken cancellationToken = default);
    Task<CorrectionDetailDto?> UpdateAsync(Guid teacherId, Guid studentId, Guid correctionId, UpdateCorrectionRequest request, CancellationToken cancellationToken = default);
    Task<bool> SoftDeleteAsync(Guid teacherId, Guid studentId, Guid correctionId, CancellationToken cancellationToken = default);

    // Returns the correction joined to its student name. Null when missing or owned by
    // another teacher (caller surfaces 404 either way -- no leak between the two cases).
    // Throws CorrectionInvalidStateException("not_corregida", ...) when the correction
    // exists but is not yet in the Corregida status (caller surfaces 409).
    Task<CorrectionExportData?> GetForExportAsync(Guid teacherId, Guid studentId, Guid correctionId, CancellationToken cancellationToken = default);
}

public record CorrectionExportData(CorrectionDetailDto Detail, string StudentName);

public class CorrectionStudentTextLockedException : Exception
{
    public CorrectionStudentTextLockedException()
        : base("Cannot modify StudentText after a correction has been marked Corregida.") { }
}
