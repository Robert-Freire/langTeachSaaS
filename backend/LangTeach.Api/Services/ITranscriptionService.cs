namespace LangTeach.Api.Services;

public interface ITranscriptionService
{
    Task<string> TranscribeAsync(Stream audio, string fileName, string contentType, CancellationToken ct = default);
}
