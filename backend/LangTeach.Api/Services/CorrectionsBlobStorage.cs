using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

namespace LangTeach.Api.Services;

public class CorrectionsBlobStorage : ICorrectionsBlobStorage
{
    private readonly BlobContainerClient _container;
    private readonly ILogger<CorrectionsBlobStorage> _logger;

    public CorrectionsBlobStorage(BlobServiceClient blobServiceClient, ILogger<CorrectionsBlobStorage> logger)
    {
        _container = blobServiceClient.GetBlobContainerClient("corrections");
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        await _container.CreateIfNotExistsAsync();
        _logger.LogInformation("Blob container 'corrections' ready");
    }

    public async Task UploadAsync(Stream stream, string blobPath, string contentType, CancellationToken ct = default)
    {
        var headers = new BlobHttpHeaders { ContentType = contentType };
        await _container.GetBlobClient(blobPath)
            .UploadAsync(stream, new BlobUploadOptions { HttpHeaders = headers }, ct);
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
                ExpiresOn = DateTimeOffset.UtcNow.AddMinutes(15),
            };
            sasBuilder.SetPermissions(BlobSasPermissions.Read);
            return Task.FromResult(blob.GenerateSasUri(sasBuilder).ToString());
        }

        return Task.FromResult(blob.Uri.ToString());
    }
}
