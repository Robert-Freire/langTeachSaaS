using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly IUserInfoService _userInfoService;
    private readonly ILogger<ProfileController> _logger;

    public ProfileController(IProfileService profileService, IUserInfoService userInfoService, ILogger<ProfileController> logger)
    {
        _profileService = profileService;
        _userInfoService = userInfoService;
        _logger = logger;
    }

    private string Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task<string> ResolveEmailAsync()
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? "";
        if (!string.IsNullOrEmpty(email)) return email;

        var token = Request.Headers.Authorization.ToString()["Bearer ".Length..].Trim();
        return await _userInfoService.GetEmailAsync(token);
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        await _profileService.UpsertTeacherAsync(Auth0Id, await ResolveEmailAsync());
        var profile = await _profileService.GetProfileAsync(Auth0Id);
        _logger.LogInformation("GET /api/profile. TeacherId={TeacherId}", profile!.Id);
        return Ok(profile);
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateProfileRequest request)
    {
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("PUT /api/profile — validation failed. Auth0Id={Auth0Id} Errors={Errors}",
                Auth0Id, ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
            return BadRequest(ModelState);
        }

        await _profileService.UpsertTeacherAsync(Auth0Id, await ResolveEmailAsync());
        var updated = await _profileService.UpdateProfileAsync(Auth0Id, request);
        _logger.LogInformation("PUT /api/profile. TeacherId={TeacherId} DisplayName={DisplayName}",
            updated.Id, updated.DisplayName);
        return Ok(updated);
    }
}
