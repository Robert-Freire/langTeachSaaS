using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IDashboardService
{
    Task<DashboardDto> GetAsync(Guid teacherId, CancellationToken cancellationToken = default);
    Task<SessionsListDto> GetSessionsListAsync(Guid teacherId, Guid? studentId, CancellationToken cancellationToken = default);
}
