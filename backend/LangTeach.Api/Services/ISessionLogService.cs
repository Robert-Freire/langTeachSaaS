using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface ISessionLogService
{
    Task<List<SessionLogDto>> ListAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken = default);
    Task<SessionLogDto?> GetByIdAsync(Guid teacherId, Guid studentId, Guid sessionId, CancellationToken cancellationToken = default);
    Task<SessionLogDto> CreateAsync(Guid teacherId, Guid studentId, CreateSessionLogRequest request, CancellationToken cancellationToken = default);
    Task<SessionLogDto?> UpdateAsync(Guid teacherId, Guid studentId, Guid sessionId, UpdateSessionLogRequest request, CancellationToken cancellationToken = default);
}
