using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IProgressService
{
    Task<StudentProgressDto?> GetAsync(Guid teacherId, Guid studentId, CancellationToken ct = default);
}
