using Microsoft.Extensions.Options;
using UglyToad.PdfPig;

namespace LangTeach.Api.Services;

public class PdfTextExtractor : ITextExtractor
{
    private readonly OcrOptions _options;
    private readonly ILogger<PdfTextExtractor> _logger;

    public PdfTextExtractor(IOptions<OcrOptions> options, ILogger<PdfTextExtractor> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public bool CanHandle(string contentType) =>
        string.Equals(contentType?.Split(';', 2)[0].Trim(), "application/pdf", StringComparison.OrdinalIgnoreCase);

    public Task<string> ExtractTextAsync(Stream stream, string contentType, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        try
        {
            using var pdf = PdfDocument.Open(stream);
            var sb = new System.Text.StringBuilder();
            foreach (var page in pdf.GetPages())
            {
                ct.ThrowIfCancellationRequested();
                foreach (var word in page.GetWords())
                    sb.Append(word.Text).Append(' ');
                sb.AppendLine();
            }
            var text = sb.ToString().Trim();
            if (text.Length >= _options.MinExtractedChars)
            {
                _logger.LogInformation("PdfTextExtractor: extracted {Chars} chars via text layer.", text.Length);
                return Task.FromResult(text);
            }
            _logger.LogInformation("PdfTextExtractor: text layer too short ({Chars} chars).", text.Length);
            throw new OcrException("No se pudo extraer texto del PDF. Asegúrate de que el archivo no sea una imagen escaneada.");
        }
        catch (OcrFallbackException)
        {
            throw;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "PdfTextExtractor: could not read PDF text layer.");
            throw new OcrException("El archivo PDF no es válido o no contiene texto extraíble.");
        }
    }
}
