namespace LangTeach.Api.Services;

public interface IBlobStorageService
{
    Task<Uri> UploadAsync(Stream stream, string blobPath, string contentType, CancellationToken cancellationToken = default);
    Task DeleteAsync(string blobPath, CancellationToken cancellationToken = default);
    Task<string> GetDownloadUrlAsync(string blobPath);
}
