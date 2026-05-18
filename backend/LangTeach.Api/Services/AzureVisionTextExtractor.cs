using Azure;
using Azure.AI.Vision.ImageAnalysis;

namespace LangTeach.Api.Services;

public class AzureVisionTextExtractor : ITextExtractor
{
    private readonly ImageAnalysisClient? _client;
    private readonly ILogger<AzureVisionTextExtractor> _logger;

    public AzureVisionTextExtractor(IConfiguration configuration, ILogger<AzureVisionTextExtractor> logger)
    {
        _logger = logger;
        var endpoint = configuration["AzureAIVision:Endpoint"];
        var key = configuration["AzureAIVision:Key"];
        if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(key))
        {
            _logger.LogWarning("AzureAIVision:Endpoint or Key is not configured. Image OCR will be unavailable.");
            return;
        }
        if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            _logger.LogWarning("AzureAIVision:Endpoint '{Endpoint}' is not a valid HTTP/HTTPS URI. Image OCR will be unavailable.", endpoint);
            return;
        }
        _client = new ImageAnalysisClient(uri, new AzureKeyCredential(key));
    }

    public bool CanHandle(string contentType)
    {
        if (_client is null) return false;
        var mime = contentType?.Split(';', 2)[0].Trim() ?? string.Empty;
        return mime.Equals("image/jpeg", StringComparison.OrdinalIgnoreCase)
            || mime.Equals("image/png", StringComparison.OrdinalIgnoreCase)
            || mime.Equals("image/webp", StringComparison.OrdinalIgnoreCase);
    }

    public async Task<string> ExtractTextAsync(Stream stream, string contentType, CancellationToken ct = default)
    {
        if (_client is null)
            throw new OcrException("El servicio de reconocimiento de imagen no está configurado.");

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
