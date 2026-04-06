using System.Security.Claims;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/students/{studentId:guid}/sessions")]
[Authorize]
public class SessionsController : ControllerBase
{
    private readonly IStudentService _studentService;
    private readonly IReflectionExtractionService _extractionService;
    private readonly IProfileService _profileService;
    private readonly ILogger<SessionsController> _logger;

    public SessionsController(
        IStudentService studentService,
        IReflectionExtractionService extractionService,
        IProfileService profileService,
        ILogger<SessionsController> logger)
    {
        _studentService = studentService;
        _extractionService = extractionService;
        _profileService = profileService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpPost("extract")]
    public async Task<IActionResult> Extract(Guid studentId, [FromBody] ExtractReflectionRequest request, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var student = await _studentService.GetByIdAsync(teacherId, studentId, cancellationToken);
        if (student is null) return NotFound();

        _logger.LogInformation("POST /api/students/{StudentId}/sessions/extract. TeacherId={TeacherId}", studentId, teacherId);
        var extracted = await _extractionService.ExtractAsync(request.Text, cancellationToken);
        return Ok(extracted);
    }
}
