using System.Security.Claims;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/students/{studentId:guid}/progress")]
[Authorize]
public class ProgressController : ControllerBase
{
    private readonly IProgressService _progressService;
    private readonly IProfileService _profileService;

    public ProgressController(IProgressService progressService, IProfileService profileService)
    {
        _progressService = progressService;
        _profileService = profileService;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<IActionResult> Get(Guid studentId, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var result = await _progressService.GetAsync(teacherId, studentId, ct);
        if (result is null) return NotFound();
        return Ok(result);
    }
}
