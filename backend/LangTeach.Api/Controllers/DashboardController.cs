using System.Security.Claims;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    private readonly IProfileService _profileService;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(
        IDashboardService dashboardService,
        IProfileService profileService,
        ILogger<DashboardController> logger)
    {
        _dashboardService = dashboardService;
        _profileService = profileService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var dto = await _dashboardService.GetAsync(teacherId, cancellationToken);

        _logger.LogInformation(
            "GET /api/dashboard TeacherId={TeacherId} ActiveStudents={ActiveStudents} TodaySessions={TodaySessions}",
            teacherId, dto.ActiveStudents.Count, dto.TodaySessions.Count);

        return Ok(dto);
    }
}
