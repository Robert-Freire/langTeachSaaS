using LangTeach.Api.Services;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IProfileService profileService, ILogger<AuthController> logger)
    {
        _profileService = profileService;
        _logger = logger;
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "";
        var email = User.FindFirst(ClaimTypes.Email)?.Value ?? "";

        _logger.LogInformation("Auth/Me called. Sub={Sub} Email={Email}", sub, email);

        await _profileService.UpsertTeacherAsync(sub, email);

        return Ok(new { sub, email });
    }
}
