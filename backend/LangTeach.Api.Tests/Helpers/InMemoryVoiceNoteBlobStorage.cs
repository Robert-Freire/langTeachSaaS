using LangTeach.Api.Services;

namespace LangTeach.Api.Tests.Helpers;

public class InMemoryVoiceNoteBlobStorage : IVoiceNoteBlobStorage
{
    private readonly Dictionary<string, byte[]> _blobs = new();

    public Task InitializeAsync() => Task.CompletedTask;

    public Task UploadAsync(Stream stream, string blobPath, string contentType, CancellationToken ct = default)
    {
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        _blobs[blobPath] = ms.ToArray();
        return Task.CompletedTask;
    }

    public Task<string> GetDownloadUrlAsync(string blobPath)
        => Task.FromResult($"http://localhost/voice-notes/{blobPath}");
}
