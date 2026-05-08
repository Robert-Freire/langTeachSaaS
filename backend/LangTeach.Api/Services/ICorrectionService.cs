using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface ICorrectionService
{
    Task<IReadOnlyList<CorrectionSummaryDto>?> ListAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken = default);
    Task<CorrectionDetailDto?> CreateAsync(Guid teacherId, Guid studentId, CreateCorrectionRequest request, CancellationToken cancellationToken = default);
    Task<CorrectionDetailDto?> GetByIdAsync(Guid teacherId, Guid studentId, Guid correctionId, CancellationToken cancellationToken = default);
    Task<CorrectionDetailDto?> UpdateAsync(Guid teacherId, Guid studentId, Guid correctionId, UpdateCorrectionRequest request, CancellationToken cancellationToken = default);
    Task<bool> SoftDeleteAsync(Guid teacherId, Guid studentId, Guid correctionId, CancellationToken cancellationToken = default);
}

public class CorrectionStudentTextLockedException : Exception
{
    public CorrectionStudentTextLockedException()
        : base("Cannot modify StudentText after a correction has been marked Corregida.") { }
}
