using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface ISessionLogService
{
    Task<List<SessionLogDto>> ListAsync(Guid teacherId, Guid studentId, CancellationToken cancellationToken = default);
    Task<SessionLogDto?> GetByIdAsync(Guid teacherId, Guid studentId, Guid sessionId, CancellationToken cancellationToken = default);
    Task<SessionLogDto> CreateAsync(Guid teacherId, Guid studentId, CreateSessionLogRequest request, CancellationToken cancellationToken = default);
    Task<SessionLogDto?> UpdateAsync(Guid teacherId, Guid studentId, Guid sessionId, UpdateSessionLogRequest request, CancellationToken cancellationToken = default);
    Task<bool> SoftDeleteAsync(Guid teacherId, Guid studentId, Guid sessionId, CancellationToken cancellationToken = default);

    // Group-target session operations (Groups sprint #1326).
    Task<List<SessionLogDto>> ListForGroupAsync(Guid teacherId, Guid groupId, CancellationToken cancellationToken = default);
    Task<SessionLogDto?> GetGroupSessionByIdAsync(Guid teacherId, Guid groupId, Guid sessionId, CancellationToken cancellationToken = default);
    Task<SessionLogDto> CreateForGroupAsync(Guid teacherId, Guid groupId, CreateSessionLogRequest request, CancellationToken cancellationToken = default);
    Task<SessionLogDto?> UpdateGroupSessionAsync(Guid teacherId, Guid groupId, Guid sessionId, UpdateSessionLogRequest request, CancellationToken cancellationToken = default);
}
