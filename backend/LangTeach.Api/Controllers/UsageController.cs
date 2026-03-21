using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/usage")]
[Authorize]
public class UsageController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly IUsageLimitService _usageLimitService;

    public UsageController(IProfileService profileService, IUsageLimitService usageLimitService)
    {
        _profileService = profileService;
        _usageLimitService = usageLimitService;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<IActionResult> GetUsage(CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var status = await _usageLimitService.GetUsageStatusAsync(teacherId, ct);
        return Ok(status);
    }
}
