namespace LangTeach.Api.Services;

public interface ICorrectionsBlobStorage
{
    Task InitializeAsync();
    Task UploadAsync(Stream stream, string blobPath, string contentType, CancellationToken ct = default);
    Task<string> GetDownloadUrlAsync(string blobPath);

    // Deletes an uploaded blob. Used to clean up an orphan after a failed OCR extraction so
    // the corrections container does not accumulate leaked source files (#1237). No-op if the
    // blob is already absent.
    Task DeleteAsync(string blobPath, CancellationToken ct = default);
}
