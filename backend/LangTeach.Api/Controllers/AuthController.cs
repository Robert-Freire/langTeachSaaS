using System.Security.Claims;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private const string CustomEmailClaim = "https://langteach.app/email";
    private const string CustomNameClaim = "https://langteach.app/name";

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
        var sub      = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "";
        var userInfo = await ResolveUserInfoAsync();

        _logger.LogDebug("Auth/Me called. Sub={Sub}", sub);

        await _profileService.UpsertTeacherAsync(sub, userInfo.Email, userInfo.Name);

        return Ok(new { sub, email = userInfo.Email, name = userInfo.Name });
    }

    private async Task<Auth0UserInfo> ResolveUserInfoAsync()
    {
        var email = User.FindFirstValue(ClaimTypes.Email)
                 ?? User.FindFirstValue("email")
                 ?? User.FindFirstValue(CustomEmailClaim)
                 ?? "";
        var name  = User.FindFirstValue(ClaimTypes.Name)
                 ?? User.FindFirstValue("name")
                 ?? User.FindFirstValue(CustomNameClaim)
                 ?? "";
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(name))
        {
            var authHeader = Request.Headers.Authorization.ToString();
            var token = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? authHeader["Bearer ".Length..].Trim()
                : "";
            var fallback = await _userInfoService.GetUserInfoAsync(token);
            if (string.IsNullOrEmpty(email)) email = fallback.Email;
            if (string.IsNullOrEmpty(name))  name  = fallback.Name;
        }

        return new Auth0UserInfo(email, name);
    }
}
