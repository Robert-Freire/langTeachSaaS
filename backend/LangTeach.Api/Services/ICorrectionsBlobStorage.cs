namespace LangTeach.Api.Services;

public interface ICorrectionsBlobStorage
{
    Task InitializeAsync();
    Task UploadAsync(Stream stream, string blobPath, string contentType, CancellationToken ct = default);
    Task<string> GetDownloadUrlAsync(string blobPath);
}
