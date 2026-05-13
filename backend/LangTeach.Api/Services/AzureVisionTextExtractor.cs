using Azure;
using Azure.AI.Vision.ImageAnalysis;

namespace LangTeach.Api.Services;

public class AzureVisionTextExtractor : ITextExtractor
{
    private readonly ImageAnalysisClient _client;
    private readonly ILogger<AzureVisionTextExtractor> _logger;

    public AzureVisionTextExtractor(IConfiguration configuration, ILogger<AzureVisionTextExtractor> logger)
    {
        var endpoint = configuration["AzureAIVision:Endpoint"]
            ?? throw new InvalidOperationException("AzureAIVision:Endpoint is not configured.");
        var key = configuration["AzureAIVision:Key"]
            ?? throw new InvalidOperationException("AzureAIVision:Key is not configured.");

        _client = new ImageAnalysisClient(new Uri(endpoint), new AzureKeyCredential(key));
        _logger = logger;
    }

    public bool CanHandle(string contentType)
    {
        var mime = contentType?.Split(';', 2)[0].Trim() ?? string.Empty;
        return mime.Equals("image/jpeg", StringComparison.OrdinalIgnoreCase)
            || mime.Equals("image/png", StringComparison.OrdinalIgnoreCase)
            || mime.Equals("image/webp", StringComparison.OrdinalIgnoreCase)
            || mime.Equals("application/pdf", StringComparison.OrdinalIgnoreCase);
    }

    public async Task<string> ExtractTextAsync(Stream stream, string contentType, CancellationToken ct = default)
    {
        var imageData = BinaryData.FromStream(stream);
        var result = await _client.AnalyzeAsync(imageData, VisualFeatures.Read, cancellationToken: ct);

        var readResult = result.Value.Read;
        if (readResult is null || readResult.Blocks.Count == 0)
        {
            _logger.LogWarning("Azure AI Vision returned no text blocks.");
            throw new OcrException("No se pudo extraer texto del archivo. Comprueba que la imagen sea legible.");
        }

        var lines = readResult.Blocks
            .SelectMany(b => b.Lines)
            .Select(l => l.Text);

        return string.Join("\n", lines);
    }
}
