namespace LangTeach.Api.Services;

public class StubTranscriptionService : ITranscriptionService
{
    public Task<string> TranscribeAsync(Stream audio, string fileName, string contentType, CancellationToken ct = default)
        => Task.FromResult("[Test transcription]");
}
