using System.Collections.Concurrent;
using LangTeach.Api.Services;

namespace LangTeach.Api.Tests.Helpers;

public class InMemoryBlobStorageService : IBlobStorageService
{
    private readonly ConcurrentDictionary<string, byte[]> _blobs = new();

    public Task<Uri> UploadAsync(Stream stream, string blobPath, string contentType, CancellationToken cancellationToken = default)
    {
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        _blobs[blobPath] = ms.ToArray();
        return Task.FromResult(new Uri($"http://localhost:10000/devstoreaccount1/materials/{blobPath}"));
    }

    public Task<Stream> DownloadAsync(string blobPath, CancellationToken cancellationToken = default)
    {
        if (!_blobs.TryGetValue(blobPath, out var data))
            throw new InvalidOperationException($"Blob not found: {blobPath}");
        return Task.FromResult<Stream>(new MemoryStream(data));
    }

    public Task DeleteAsync(string blobPath, CancellationToken cancellationToken = default)
    {
        _blobs.TryRemove(blobPath, out _);
        return Task.CompletedTask;
    }

    public Task<string> GetDownloadUrlAsync(string blobPath)
    {
        return Task.FromResult($"http://localhost:10000/devstoreaccount1/materials/{blobPath}");
    }

    public bool HasBlob(string blobPath) => _blobs.ContainsKey(blobPath);
    public int BlobCount => _blobs.Count;
}
