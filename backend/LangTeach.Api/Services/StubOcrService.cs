namespace LangTeach.Api.Services;

public class StubOcrService : IOcrService
{
    public Task<string> ExtractTextAsync(Stream imageStream, string contentType, CancellationToken ct = default)
    {
        return Task.FromResult(
            "Este es un texto de prueba extraído por el servicio OCR de pruebas. " +
            "Contiene acentos: á, é, í, ó, ú, ñ. " +
            "El alumno escribió esta redacción en clase."
        );
    }
}
