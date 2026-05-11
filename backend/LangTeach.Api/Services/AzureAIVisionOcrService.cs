using Azure;
using Azure.AI.Vision.ImageAnalysis;

namespace LangTeach.Api.Services;

public class AzureAIVisionOcrService : IOcrService
{
    private readonly ImageAnalysisClient _client;
    private readonly ILogger<AzureAIVisionOcrService> _logger;

    public AzureAIVisionOcrService(IConfiguration configuration, ILogger<AzureAIVisionOcrService> logger)
    {
        var endpoint = configuration["AzureAIVision:Endpoint"]
            ?? throw new InvalidOperationException("AzureAIVision:Endpoint is not configured.");
        var key = configuration["AzureAIVision:Key"]
            ?? throw new InvalidOperationException("AzureAIVision:Key is not configured.");

        _client = new ImageAnalysisClient(new Uri(endpoint), new AzureKeyCredential(key));
        _logger = logger;
    }

    public async Task<string> ExtractTextAsync(Stream imageStream, string contentType, CancellationToken ct = default)
    {
        var imageData = BinaryData.FromStream(imageStream);
        var result = await _client.AnalyzeAsync(imageData, VisualFeatures.Read, cancellationToken: ct);

        var readResult = result.Value.Read;
        if (readResult is null || readResult.Blocks.Count == 0)
        {
            _logger.LogWarning("Azure AI Vision returned no text blocks.");
            throw new OcrException("No text could be extracted from the image.");
        }

        var lines = readResult.Blocks
            .SelectMany(b => b.Lines)
            .Select(l => l.Text);

        return string.Join("\n", lines);
    }
}
