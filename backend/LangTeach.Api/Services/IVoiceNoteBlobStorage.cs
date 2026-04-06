namespace LangTeach.Api.Services;

public interface IVoiceNoteBlobStorage
{
    Task InitializeAsync();
    Task UploadAsync(Stream stream, string blobPath, string contentType, CancellationToken ct = default);
    Task<string> GetDownloadUrlAsync(string blobPath);
    Task DeleteAsync(string blobPath, CancellationToken ct = default);
}
