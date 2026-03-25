using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface ISessionMappingService
{
    SessionMappingResult Compute(IReadOnlyList<CurriculumTemplateUnit> units, int sessionCount);
}
