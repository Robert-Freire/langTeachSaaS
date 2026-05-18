using LangTeach.Api.AI;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Services;

public class PdfClaudeExtractor : ITextExtractor
{
    private readonly IClaudeClient _claude;
    private readonly IPromptService _prompts;
    private readonly OcrOptions _options;
    private readonly ILogger<PdfClaudeExtractor> _logger;

    public PdfClaudeExtractor(IClaudeClient claude, IPromptService prompts, IOptions<OcrOptions> options, ILogger<PdfClaudeExtractor> logger)
    {
        _claude = claude;
        _prompts = prompts;
        _options = options.Value;
        _logger = logger;
    }

    public bool CanHandle(string contentType) =>
        string.Equals(contentType?.Split(';', 2)[0].Trim(), "application/pdf", StringComparison.OrdinalIgnoreCase);

    public async Task<string> ExtractTextAsync(Stream stream, string contentType, CancellationToken ct = default)
    {
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();

        if (bytes.Length > _options.PdfClaudeMaxFileBytes)
            throw new OcrException("El PDF supera el tamaño máximo permitido para el procesamiento por IA.");

        var request = _prompts.BuildPdfOcrPrompt(bytes);

        try
        {
            var response = await _claude.CompleteAsync(request, ct);
            _logger.LogInformation("PdfClaudeExtractor: extracted {Chars} chars via Claude.", response.Content.Length);
            return response.Content;
        }
        catch (ClaudeRateLimitException)
        {
            throw new OcrException("El servicio no está disponible ahora mismo. Inténtalo en un momento.");
        }
        catch (ClaudeApiException ex)
        {
            _logger.LogWarning(ex, "PdfClaudeExtractor: Claude API error.");
            throw new OcrException("No se pudo procesar el PDF escaneado. Inténtalo de nuevo.");
        }
    }
}
