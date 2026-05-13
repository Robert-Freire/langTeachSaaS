namespace LangTeach.Api.Services;

public interface ITextExtractor
{
    bool CanHandle(string contentType);
    Task<string> ExtractTextAsync(Stream stream, string contentType, CancellationToken ct = default);
}
