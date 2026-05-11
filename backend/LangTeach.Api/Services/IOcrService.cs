namespace LangTeach.Api.Services;

public interface IOcrService
{
    Task<string> ExtractTextAsync(Stream imageStream, string contentType, CancellationToken ct = default);
}
