using System.Globalization;
using System.Net.Http.Headers;
using System.Security.Claims;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;
using LangTeach.Api.Services;
using LangTeach.Api.Services.CorrectionDocxExport;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/students/{studentId:guid}/corrections")]
[Authorize]
public class CorrectionsController : ControllerBase
{
    private readonly ICorrectionService _corrections;
    private readonly IRedaccionCorrectionService _redaccionCorrections;
    private readonly ICorrectionDocxExportService _docxExport;
    private readonly IProfileService _profileService;
    private readonly IAssistantFeedbackService _feedbackService;
    private readonly ILogger<CorrectionsController> _logger;

    private const string DocxContentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    public CorrectionsController(
        ICorrectionService corrections,
        IRedaccionCorrectionService redaccionCorrections,
        ICorrectionDocxExportService docxExport,
        IProfileService profileService,
        IAssistantFeedbackService feedbackService,
        ILogger<CorrectionsController> logger)
    {
        _corrections = corrections;
        _redaccionCorrections = redaccionCorrections;
        _docxExport = docxExport;
        _profileService = profileService;
        _feedbackService = feedbackService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<IActionResult> List(Guid studentId, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var list = await _corrections.ListAsync(teacherId, studentId, cancellationToken);
        if (list is null)
        {
            _logger.LogWarning("GET corrections: student not found or not owned. TeacherId={TeacherId} StudentId={StudentId}", teacherId, studentId);
            return NotFound();
        }
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid studentId, [FromBody] CreateCorrectionRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var detail = await _corrections.CreateAsync(teacherId, studentId, request, cancellationToken);
        if (detail is null) return NotFound();

        return CreatedAtAction(nameof(GetById), new { studentId, id = detail.Id }, detail);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid studentId, Guid id, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var detail = await _corrections.GetByIdAsync(teacherId, studentId, id, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid studentId, Guid id, [FromBody] UpdateCorrectionRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        try
        {
            var detail = await _corrections.UpdateAsync(teacherId, studentId, id, request, cancellationToken);
            return detail is null ? NotFound() : Ok(detail);
        }
        catch (CorrectionStudentTextLockedException ex)
        {
            ModelState.AddModelError(nameof(request.StudentText), ex.Message);
            return BadRequest(ModelState);
        }
    }

    [HttpPost("{id:guid}/corregir")]
    [EnableRateLimiting("corregir")]
    public async Task<IActionResult> Corregir(Guid studentId, Guid id, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            var detail = await _redaccionCorrections.CorregirAsync(teacherId, studentId, id, cancellationToken);
            return Ok(detail);
        }
        catch (CorrectionNotFoundException)
        {
            return NotFound();
        }
        catch (CorrectionInvalidStateException ex)
        {
            return Conflict(new { code = ex.Code, message = ex.Message });
        }
    }

    [HttpGet("{id:guid}/export.docx")]
    public async Task<IActionResult> ExportDocx(Guid studentId, Guid id, [FromQuery] string? view, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        CorrectionExportData? data;
        try
        {
            data = await _corrections.GetForExportAsync(teacherId, studentId, id, cancellationToken);
        }
        catch (CorrectionInvalidStateException ex)
        {
            return Conflict(new { code = ex.Code, message = ex.Message });
        }

        if (data is null) return NotFound();

        // view=teacher → full-diagnostic with above-level errors; anything else → student
        // handout (default, level-filtered, unchanged). Filename carries the variant so the
        // two downloads are unambiguous (#1351).
        var teacherView = string.Equals(view, "teacher", StringComparison.OrdinalIgnoreCase);
        var bytes = _docxExport.Generate(data.Detail, data.StudentName, includeAboveLevel: teacherView);
        var dateStr = (data.Detail.CorrectedAt ?? data.Detail.UpdatedAt).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var slug = FileNameHelper.SlugifyName(data.StudentName);
        var suffix = teacherView ? "-completa" : "";
        var asciiName = $"redaccion-{slug}-{dateStr}{suffix}.docx";
        var utf8Name = $"redaccion-{data.StudentName}-{dateStr}{suffix}.docx";

        // RFC 5987: emit both filename= (ASCII fallback) and filename*=UTF-8'' so non-ASCII
        // student names survive across Word for macOS / Firefox. The default File(...,
        // fileDownloadName) overload only writes filename=, percent-encoded.
        var disposition = new ContentDispositionHeaderValue("attachment")
        {
            FileName = asciiName,
            FileNameStar = utf8Name,
        };
        Response.Headers.ContentDisposition = disposition.ToString();

        return File(bytes, DocxContentType);
    }

    [HttpPost("{id:guid}/feedback")]
    public async Task<IActionResult> SubmitFeedback(Guid studentId, Guid id, [FromBody] CorrectionFeedbackRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var result = await _feedbackService.SubmitForCorrectionAsync(teacherId, studentId, id, request.Rating, request.Reason, cancellationToken);

        return result switch
        {
            CorrectionFeedbackResult.CorrectionNotFound => NotFound(),
            _ => NoContent(),
        };
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid studentId, Guid id, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var deleted = await _corrections.SoftDeleteAsync(teacherId, studentId, id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
