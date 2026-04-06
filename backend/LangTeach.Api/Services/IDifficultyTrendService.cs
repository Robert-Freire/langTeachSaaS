namespace LangTeach.Api.Services;

public interface IDifficultyTrendService
{
    Task RecomputeAsync(Guid teacherId, Guid studentId, CancellationToken ct = default);
}
