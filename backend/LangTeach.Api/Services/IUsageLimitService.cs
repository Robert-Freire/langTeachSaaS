using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IUsageLimitService
{
    Task<UsageStatusDto> GetUsageStatusAsync(Guid teacherId, CancellationToken ct = default);
    Task RecordGenerationAsync(Guid teacherId, ContentBlockType blockType, CancellationToken ct = default);
    Task<bool> CanGenerateAsync(Guid teacherId, CancellationToken ct = default);
}
