using System.Security.Claims;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/students/{studentId:guid}/corrections")]
[Authorize]
public class CorrectionsController : ControllerBase
{
    private readonly ICorrectionService _corrections;
    private readonly IRedaccionCorrectionService _redaccionCorrections;
    private readonly IProfileService _profileService;
    private readonly ILogger<CorrectionsController> _logger;

    public CorrectionsController(
        ICorrectionService corrections,
        IRedaccionCorrectionService redaccionCorrections,
        IProfileService profileService,
        ILogger<CorrectionsController> logger)
    {
        _corrections = corrections;
        _redaccionCorrections = redaccionCorrections;
        _profileService = profileService;
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
        catch (CorrectionGenerationException ex)
        {
            _logger.LogWarning(ex, "Redaccion generation failed. StudentId={StudentId} CorrectionId={CorrectionId} Code={Code}",
                studentId, id, ex.Code);
            return StatusCode(StatusCodes.Status502BadGateway, new { code = ex.Code, message = ex.Message });
        }
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
