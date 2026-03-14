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
    private readonly ILogger<ProfileController> _logger;

    public ProfileController(IProfileService profileService, ILogger<ProfileController> logger)
    {
        _profileService = profileService;
        _logger = logger;
    }

    private string Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var profile = await _profileService.GetProfileAsync(Auth0Id);
        if (profile is null)
        {
            _logger.LogWarning("GET /api/profile — teacher not found. Auth0Id={Auth0Id}", Auth0Id);
            return NotFound();
        }

        _logger.LogInformation("GET /api/profile. TeacherId={TeacherId}", profile.Id);
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

        var updated = await _profileService.UpdateProfileAsync(Auth0Id, request);
        _logger.LogInformation("PUT /api/profile. TeacherId={TeacherId} DisplayName={DisplayName}",
            updated.Id, updated.DisplayName);
        return Ok(updated);
    }
}
