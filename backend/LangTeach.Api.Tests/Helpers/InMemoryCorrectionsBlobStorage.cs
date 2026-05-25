using System.Collections.Concurrent;
using LangTeach.Api.Services;

namespace LangTeach.Api.Tests.Helpers;

public class InMemoryCorrectionsBlobStorage : ICorrectionsBlobStorage
{
    private readonly ConcurrentDictionary<string, byte[]> _blobs = new();

    public Task InitializeAsync() => Task.CompletedTask;

    public Task UploadAsync(Stream stream, string blobPath, string contentType, CancellationToken ct = default)
    {
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        _blobs[blobPath] = ms.ToArray();
        return Task.CompletedTask;
    }

    public Task<string> GetDownloadUrlAsync(string blobPath)
        => Task.FromResult($"http://localhost/corrections/{blobPath}");

    public Task DeleteAsync(string blobPath, CancellationToken ct = default)
    {
        _blobs.TryRemove(blobPath, out _);
        Interlocked.Increment(ref _deleteCount);
        return Task.CompletedTask;
    }

    // Atomic so parallel-delete assertions cannot lose increments (matches the ConcurrentDictionary above).
    private int _deleteCount;
    public int DeleteCount => Volatile.Read(ref _deleteCount);

    public bool ContainsBlob(string blobPath) => _blobs.ContainsKey(blobPath);
}
