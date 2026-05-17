namespace LangTeach.Api.Services;

public class StubTextExtractor : ITextExtractor
{
    public bool CanHandle(string contentType) => true;

    public Task<string> ExtractTextAsync(Stream stream, string contentType, CancellationToken ct = default)
    {
        return Task.FromResult(
            "Este es un texto de prueba extraído por el servicio OCR de pruebas. " +
            "Contiene acentos: á, é, í, ó, ú, ñ. " +
            "El alumno escribió esta redacción en clase."
        );
    }
}
