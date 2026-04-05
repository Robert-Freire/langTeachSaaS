using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface IReflectionExtractionService
{
    Task<ExtractedReflectionDto> ExtractAsync(string text, CancellationToken ct = default);
}
