using LangTeach.Api.DTOs;
using LangTeach.Api.Services;

namespace LangTeach.Api.Tests.Helpers;

public class StubReflectionExtractionService : IReflectionExtractionService
{
    private readonly ExtractedReflectionDto _result;

    public StubReflectionExtractionService(ExtractedReflectionDto result)
    {
        _result = result;
    }

    public Task<ExtractedReflectionDto> ExtractAsync(string text, CancellationToken ct = default) =>
        Task.FromResult(_result);
}
