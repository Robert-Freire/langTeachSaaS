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
    private readonly IProfileService _profileService;
    private readonly ILogger<CorrectionsController> _logger;

    public CorrectionsController(
        ICorrectionService corrections,
        IProfileService profileService,
        ILogger<CorrectionsController> logger)
    {
        _corrections = corrections;
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
    public IActionResult Corregir(Guid studentId, Guid id)
    {
        // Stub: real AI generation lands in the prompt-service follow-up issue.
        // The endpoint exists so the frontend contract is fixed and clients receive a
        // deterministic 501 until generation is wired up.
        _logger.LogInformation("POST corregir stub. StudentId={StudentId} CorrectionId={CorrectionId}", studentId, id);
        return StatusCode(StatusCodes.Status501NotImplemented, new
        {
            message = "AI correction generation is not implemented yet."
        });
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
