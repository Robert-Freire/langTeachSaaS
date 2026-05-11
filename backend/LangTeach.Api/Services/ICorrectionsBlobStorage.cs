namespace LangTeach.Api.Services;

public interface ICorrectionsBlobStorage
{
    Task UploadAsync(Stream stream, string blobPath, string contentType, CancellationToken ct = default);
    Task<string> GetDownloadUrlAsync(string blobPath);
}
