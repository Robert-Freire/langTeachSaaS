using LangTeach.Api.AI;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface ICurriculumGenerationService
{
    Task<(List<CurriculumEntry> Entries, List<CurriculumWarning> Warnings)> GenerateAsync(CurriculumContext ctx, CancellationToken ct = default);
}
