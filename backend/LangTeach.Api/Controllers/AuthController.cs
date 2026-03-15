using System.Security.Claims;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly IUserInfoService _userInfoService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IProfileService profileService, IUserInfoService userInfoService, ILogger<AuthController> logger)
    {
        _profileService = profileService;
        _userInfoService = userInfoService;
        _logger = logger;
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var sub   = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "";
        var email = await ResolveEmailAsync();

        _logger.LogInformation("Auth/Me called. Sub={Sub} Email={Email}", sub, email);

        await _profileService.UpsertTeacherAsync(sub, email);

        return Ok(new { sub, email });
    }

    private async Task<string> ResolveEmailAsync()
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? "";
        if (!string.IsNullOrEmpty(email)) return email;

        var token = Request.Headers.Authorization.ToString()["Bearer ".Length..].Trim();
        return await _userInfoService.GetEmailAsync(token);
    }
}
