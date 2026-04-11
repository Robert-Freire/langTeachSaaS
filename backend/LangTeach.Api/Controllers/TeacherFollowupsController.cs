using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/teacher-followups")]
[Authorize]
public class TeacherFollowupsController : ControllerBase
{
    private readonly ITeacherFollowupService _followupService;
    private readonly IProfileService _profileService;
    private readonly ILogger<TeacherFollowupsController> _logger;

    public TeacherFollowupsController(
        ITeacherFollowupService followupService,
        IProfileService profileService,
        ILogger<TeacherFollowupsController> logger)
    {
        _followupService = followupService;
        _profileService = profileService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? studentId, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        List<TeacherFollowupDto> result;
        if (studentId is not null)
        {
            if (!Guid.TryParse(studentId, out var sid))
                return ValidationProblem("studentId must be a valid GUID.");
            result = await _followupService.GetByStudentAsync(teacherId, sid, cancellationToken);
        }
        else
        {
            result = await _followupService.GetAllAsync(teacherId, cancellationToken);
        }

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTeacherFollowupRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        try
        {
            var dto = await _followupService.CreateAsync(teacherId, request, cancellationToken);
            _logger.LogInformation("POST /api/teacher-followups Id={Id} TeacherId={TeacherId}", dto.Id, teacherId);
            return CreatedAtAction(nameof(Get), new { }, dto);
        }
        catch (ValidationException ex)
        {
            return ValidationProblem(ex.Message);
        }
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTeacherFollowupRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var dto = await _followupService.UpdateStatusAsync(teacherId, id, request, cancellationToken);
        if (dto is null) return NotFound();

        return Ok(dto);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var deleted = await _followupService.DeleteAsync(teacherId, id, cancellationToken);
        if (!deleted) return NotFound();

        return NoContent();
    }
}
