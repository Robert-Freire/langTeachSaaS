using LangTeach.Api.AI;
using LangTeach.Api.Data.Models;

namespace LangTeach.Api.Services;

public interface ICurriculumGenerationService
{
    Task<List<CurriculumEntry>> GenerateAsync(CurriculumContext ctx, CancellationToken ct = default);
}
