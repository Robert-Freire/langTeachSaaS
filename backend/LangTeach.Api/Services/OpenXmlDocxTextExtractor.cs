using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace LangTeach.Api.Services;

public class OpenXmlDocxTextExtractor : ITextExtractor
{
    public bool CanHandle(string contentType) =>
        contentType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    public Task<string> ExtractTextAsync(Stream stream, string contentType, CancellationToken ct = default)
    {
        string text;
        try
        {
            using var doc = WordprocessingDocument.Open(stream, isEditable: false);
            var body = doc.MainDocumentPart?.Document?.Body
                ?? throw new OcrException("No se pudo extraer texto del archivo Word.");

            var paragraphs = body.Descendants<Paragraph>()
                .Select(p => p.InnerText)
                .Where(t => !string.IsNullOrWhiteSpace(t));

            text = string.Join("\n", paragraphs);
        }
        catch (OcrException)
        {
            throw;
        }
        catch (Exception ex) when (ex is OpenXmlPackageException || ex is System.IO.FileFormatException)
        {
            throw new OcrException("El archivo Word no es válido o está dañado.");
        }

        if (string.IsNullOrWhiteSpace(text))
            throw new OcrException("No se pudo extraer texto del archivo Word.");

        return Task.FromResult(text);
    }
}
