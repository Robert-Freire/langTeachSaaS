using System.Security.Claims;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/courses/{courseId:guid}/suggestions")]
[Authorize]
public class CourseSuggestionsController : ControllerBase
{
    private readonly IReplanSuggestionService _suggestionService;
    private readonly IProfileService _profileService;
    private readonly ILogger<CourseSuggestionsController> _logger;

    public CourseSuggestionsController(
        IReplanSuggestionService suggestionService,
        IProfileService profileService,
        ILogger<CourseSuggestionsController> logger)
    {
        _suggestionService = suggestionService;
        _profileService = profileService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpPost("generate")]
    public async Task<IActionResult> Generate(Guid courseId, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            var suggestions = await _suggestionService.GenerateSuggestionsAsync(courseId, teacherId, cancellationToken);
            _logger.LogInformation("POST /api/courses/{CourseId}/suggestions/generate -> {Count} suggestions. TeacherId={TeacherId}",
                courseId, suggestions.Count, teacherId);
            return Ok(suggestions);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet]
    public async Task<IActionResult> Get(Guid courseId, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            var suggestions = await _suggestionService.GetSuggestionsAsync(courseId, teacherId, cancellationToken);
            return Ok(suggestions);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("{suggestionId:guid}/respond")]
    public async Task<IActionResult> Respond(
        Guid courseId,
        Guid suggestionId,
        [FromBody] RespondToSuggestionRequest request,
        CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (request.Action is not ("accept" or "dismiss"))
            return BadRequest(new { error = "Action must be 'accept' or 'dismiss'." });

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            var result = await _suggestionService.RespondAsync(
                courseId, suggestionId, teacherId, request.Action, request.TeacherEdit, cancellationToken);

            if (result is null) return NotFound();

            _logger.LogInformation(
                "POST /api/courses/{CourseId}/suggestions/{SuggestionId}/respond action={Action}. TeacherId={TeacherId}",
                courseId, suggestionId, request.Action, teacherId);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }
}
