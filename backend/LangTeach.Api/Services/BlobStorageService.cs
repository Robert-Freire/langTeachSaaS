using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

namespace LangTeach.Api.Services;

public class BlobStorageService : IBlobStorageService
{
    private readonly BlobContainerClient _container;
    private readonly ILogger<BlobStorageService> _logger;

    public BlobStorageService(BlobServiceClient blobServiceClient, ILogger<BlobStorageService> logger)
    {
        _container = blobServiceClient.GetBlobContainerClient("materials");
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        await _container.CreateIfNotExistsAsync();
        _logger.LogInformation("Blob container 'materials' ready");
    }

    public async Task<Uri> UploadAsync(Stream stream, string blobPath, string contentType, CancellationToken cancellationToken = default)
    {
        var blob = _container.GetBlobClient(blobPath);
        var headers = new BlobHttpHeaders { ContentType = contentType };
        await blob.UploadAsync(stream, new BlobUploadOptions { HttpHeaders = headers }, cancellationToken);
        _logger.LogInformation("Blob uploaded: {BlobPath}", blobPath);
        return blob.Uri;
    }

    public async Task<Stream> DownloadAsync(string blobPath, CancellationToken cancellationToken = default)
    {
        var blob = _container.GetBlobClient(blobPath);
        return await blob.OpenReadAsync(cancellationToken: cancellationToken);
    }

    public async Task DeleteAsync(string blobPath, CancellationToken cancellationToken = default)
    {
        var blob = _container.GetBlobClient(blobPath);
        await blob.DeleteIfExistsAsync(cancellationToken: cancellationToken);
        _logger.LogInformation("Blob deleted: {BlobPath}", blobPath);
    }

    public Task<string> GetDownloadUrlAsync(string blobPath)
    {
        var blob = _container.GetBlobClient(blobPath);

        if (blob.CanGenerateSasUri)
        {
            var sasBuilder = new BlobSasBuilder
            {
                BlobContainerName = _container.Name,
                BlobName = blobPath,
                Resource = "b",
                ExpiresOn = DateTimeOffset.UtcNow.AddMinutes(15)
            };
            sasBuilder.SetPermissions(BlobSasPermissions.Read);
            var sasUri = blob.GenerateSasUri(sasBuilder);
            return Task.FromResult(sasUri.ToString());
        }

        // Azurite with connection string: return direct URL (no SAS needed in dev)
        return Task.FromResult(blob.Uri.ToString());
    }
}
