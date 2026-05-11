using System.Security.Claims;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Controllers;

// Separate controller from CorrectionsController because this endpoint has no studentId --
// it is a stateless pre-upload step scoped to the teacher, not to a specific correction.
[ApiController]
[Route("api/corrections/ocr")]
[Authorize]
public class OcrController : ControllerBase
{
    private readonly IOcrService _ocr;
    private readonly ICorrectionsBlobStorage _blob;
    private readonly IProfileService _profileService;
    private readonly OcrOptions _options;
    private readonly ILogger<OcrController> _logger;

    public OcrController(
        IOcrService ocr,
        ICorrectionsBlobStorage blob,
        IProfileService profileService,
        IOptions<OcrOptions> options,
        ILogger<OcrController> logger)
    {
        _ocr = ocr;
        _blob = blob;
        _profileService = profileService;
        _options = options.Value;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpPost]
    [RequestSizeLimit(11_534_336)] // 11 MB hard limit (10 MB file + headers/overhead)
    public async Task<IActionResult> Extract(IFormFile file, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();

        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No se recibió ningún archivo." });

        if (!_options.AcceptedContentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { message = $"Formato no compatible. Usa JPG, PNG, WEBP o PDF." });

        if (file.Length > _options.MaxBytes)
            return BadRequest(new { message = $"El archivo supera el tamaño máximo de {_options.MaxBytes / 1_048_576} MB." });

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var ext = Path.GetExtension(file.FileName).TrimStart('.').ToLowerInvariant();
        if (string.IsNullOrEmpty(ext))
            ext = file.ContentType.Split('/').Last();

        var blobPath = $"corrections/{teacherId}/{Guid.NewGuid()}/source.{ext}";

        await using var stream = file.OpenReadStream();

        string blobUrl;
        try
        {
            await _blob.UploadAsync(stream, blobPath, file.ContentType, cancellationToken);
            blobUrl = await _blob.GetDownloadUrlAsync(blobPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload OCR source image. BlobPath={BlobPath}", blobPath);
            return StatusCode(500, new { message = "No se pudo almacenar el archivo. Inténtalo de nuevo." });
        }

        stream.Position = 0;
        string text;
        try
        {
            text = await _ocr.ExtractTextAsync(stream, file.ContentType, cancellationToken);
        }
        catch (OcrException ex)
        {
            _logger.LogWarning("OCR returned no text. BlobPath={BlobPath} Message={Message}", blobPath, ex.Message);
            return UnprocessableEntity(new { message = "No se pudo extraer texto del archivo. Comprueba que la imagen sea legible." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OCR service error. BlobPath={BlobPath}", blobPath);
            return StatusCode(500, new { message = "El servicio de OCR no está disponible. Inténtalo de nuevo." });
        }

        _logger.LogInformation(
            "OCR extraction complete. TeacherId={TeacherId} BlobPath={BlobPath} ExtractedChars={Chars}",
            teacherId, blobPath, text.Length);

        return Ok(new OcrResultDto(text, blobUrl));
    }
}
