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
[Route("api/corrections/extract-text")]
[Authorize]
public class FileTextExtractController : ControllerBase
{
    private readonly IEnumerable<ITextExtractor> _extractors;
    private readonly ICorrectionsBlobStorage _blob;
    private readonly IProfileService _profileService;
    private readonly OcrOptions _options;
    private readonly ILogger<FileTextExtractController> _logger;

    private static readonly Dictionary<string, string> ExtensionToMime = new(StringComparer.OrdinalIgnoreCase)
    {
        { ".jpg",  "image/jpeg" },
        { ".jpeg", "image/jpeg" },
        { ".png",  "image/png" },
        { ".webp", "image/webp" },
        { ".pdf",  "application/pdf" },
        { ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    };

    public FileTextExtractController(
        IEnumerable<ITextExtractor> extractors,
        ICorrectionsBlobStorage blob,
        IProfileService profileService,
        IOptions<OcrOptions> options,
        ILogger<FileTextExtractController> logger)
    {
        _extractors = extractors;
        _blob = blob;
        _profileService = profileService;
        _options = options.Value;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    // Browsers can send unexpected Content-Type values for the same file (e.g. application/octet-stream
    // for a dragged .jpg). Fall back to extension-based MIME detection so valid files are not rejected.
    internal static string ResolveEffectiveContentType(IFormFile file, string[] acceptedContentTypes)
    {
        if (acceptedContentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
            return file.ContentType;

        var ext = Path.GetExtension(file.FileName);
        if (!string.IsNullOrEmpty(ext) && ExtensionToMime.TryGetValue(ext, out var mapped))
            return mapped;

        return file.ContentType;
    }

    [HttpPost]
    [RequestSizeLimit(11_534_336)] // 11 MB hard limit (10 MB file + headers/overhead)
    public async Task<IActionResult> Extract(IFormFile file, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();

        if (file is null || file.Length == 0)
            return BadRequest(new { code = "OCR_NO_FILE", message = "No se recibió ningún archivo." });

        var effectiveContentType = ResolveEffectiveContentType(file, _options.AcceptedContentTypes);

        if (!_options.AcceptedContentTypes.Contains(effectiveContentType, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { code = "OCR_FORMAT_UNSUPPORTED", message = "Formato no compatible. Usa JPG, PNG, WEBP, PDF o DOCX." });

        if (file.Length > _options.MaxBytes)
            return BadRequest(new { code = "OCR_FILE_TOO_LARGE", message = $"El archivo supera el tamaño máximo de {_options.MaxBytes / 1_048_576} MB." });

        var hasExtractor = _extractors.Any(e => e.CanHandle(effectiveContentType));
        if (!hasExtractor)
        {
            _logger.LogError("No ITextExtractor registered for content type {ContentType}", effectiveContentType);
            return BadRequest(new { code = "OCR_FORMAT_UNSUPPORTED", message = "Formato no compatible. Usa JPG, PNG, WEBP, PDF o DOCX." });
        }

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var ext = Path.GetExtension(file.FileName).TrimStart('.').ToLowerInvariant();
        if (string.IsNullOrEmpty(ext))
            ext = effectiveContentType.Split('/').Last();

        var blobPath = $"{teacherId}/{Guid.NewGuid()}/source.{ext}";

        // Copy to MemoryStream to guarantee seekability for both upload and extraction.
        // IFormFile.OpenReadStream() may return a non-seekable stream in some hosting environments.
        using var memStream = new MemoryStream();
        await file.CopyToAsync(memStream, cancellationToken);
        memStream.Position = 0;

        string blobUrl;
        try
        {
            await _blob.UploadAsync(memStream, blobPath, effectiveContentType, cancellationToken);
            blobUrl = await _blob.GetDownloadUrlAsync(blobPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload source file. BlobPath={BlobPath}", blobPath);
            return StatusCode(500, new { code = "OCR_UPLOAD_FAILED", message = "No se pudo almacenar el archivo. Inténtalo de nuevo." });
        }

        memStream.Position = 0;
        string? text = null;
        OcrException? lastOcrError = null;
        foreach (var extractor in _extractors.Where(e => e.CanHandle(effectiveContentType)))
        {
            try
            {
                text = await extractor.ExtractTextAsync(memStream, effectiveContentType, cancellationToken);
                break;
            }
            catch (OcrFallbackException)
            {
                memStream.Position = 0;
                continue;
            }
            catch (OcrException ex)
            {
                lastOcrError = ex;
                break;
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Text extractor error. BlobPath={BlobPath}", blobPath);
                return StatusCode(500, new { code = "OCR_SERVICE_ERROR", message = "El servicio de extracción no está disponible. Inténtalo de nuevo." });
            }
        }
        if (text is null)
        {
            var msg = lastOcrError?.Message ?? "No se pudo extraer texto del archivo.";
            _logger.LogWarning("No extractor succeeded. BlobPath={BlobPath}", blobPath);
            return UnprocessableEntity(new { code = "OCR_NO_TEXT", message = msg });
        }

        _logger.LogInformation(
            "Text extraction complete. TeacherId={TeacherId} BlobPath={BlobPath} ExtractedChars={Chars}",
            teacherId, blobPath, text.Length);

        return Ok(new OcrResultDto(text, blobUrl, Incomplete: text.Length < _options.MinExtractedChars));
    }
}
