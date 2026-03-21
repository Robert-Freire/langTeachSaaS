using LangTeach.Api.Services;

namespace LangTeach.Api.Tests.Helpers;

public class InMemoryBlobStorageService : IBlobStorageService
{
    private readonly Dictionary<string, byte[]> _blobs = new();

    public Task<Uri> UploadAsync(Stream stream, string blobPath, string contentType, CancellationToken cancellationToken = default)
    {
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        _blobs[blobPath] = ms.ToArray();
        return Task.FromResult(new Uri($"http://localhost:10000/devstoreaccount1/materials/{blobPath}"));
    }

    public Task DeleteAsync(string blobPath, CancellationToken cancellationToken = default)
    {
        _blobs.Remove(blobPath);
        return Task.CompletedTask;
    }

    public Task<string> GetDownloadUrlAsync(string blobPath)
    {
        return Task.FromResult($"http://localhost:10000/devstoreaccount1/materials/{blobPath}");
    }

    public bool HasBlob(string blobPath) => _blobs.ContainsKey(blobPath);
    public int BlobCount => _blobs.Count;
}
