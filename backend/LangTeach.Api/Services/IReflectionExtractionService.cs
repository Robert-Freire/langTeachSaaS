using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IReflectionExtractionService
{
    Task<ExtractedReflectionDto> ExtractAsync(string text, IReadOnlyList<string>? knownDifficulties = null, bool hasOpenSession = false, CancellationToken ct = default);
}
