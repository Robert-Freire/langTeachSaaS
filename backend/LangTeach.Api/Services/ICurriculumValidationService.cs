using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface ICurriculumValidationService
{
    Task<List<CurriculumWarning>> ValidateAsync(
        List<CurriculumEntry> entries,
        string targetLevel,
        IReadOnlyList<string> allowedGrammar,
        CancellationToken ct = default);
}
