using System.ComponentModel.DataAnnotations;
using LangTeach.Api.AI;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/courses")]
[Authorize]
public class CoursesController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly ICourseService _courseService;
    private readonly ILogger<CoursesController> _logger;

    public CoursesController(
        IProfileService profileService,
        ICourseService courseService,
        ILogger<CoursesController> logger)
    {
        _profileService = profileService;
        _courseService = courseService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        return Ok(await _courseService.ListAsync(teacherId, ct));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCourseRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            var (dto, warnings) = await _courseService.CreateAsync(teacherId, request, ct);
            _logger.LogInformation(
                "POST /api/courses created. CourseId={CourseId} TeacherId={TeacherId} Warnings={Warnings}",
                dto.Id, teacherId, warnings.Count);
            return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
        }
        catch (ValidationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (CurriculumGenerationException ex)
        {
            _logger.LogError(ex, "Curriculum generation failed for TeacherId={TeacherId}", teacherId);
            return StatusCode(502, new { error = "Curriculum generation failed. Please try again." });
        }
        catch (System.Text.Json.JsonException ex)
        {
            _logger.LogError(ex, "Curriculum generation returned invalid JSON for TeacherId={TeacherId}", teacherId);
            return StatusCode(502, new { error = "Curriculum generation failed. Please try again." });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var course = await _courseService.GetByIdAsync(teacherId, id, ct);
        if (course is null) return NotFound();
        return Ok(course);
    }

    [HttpPost("{id:guid}/warnings/dismiss")]
    public async Task<IActionResult> DismissWarning(Guid id, [FromBody] DismissWarningRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var found = await _courseService.DismissWarningAsync(teacherId, id, request.WarningKey, ct);
        if (!found) return NotFound();
        return NoContent();
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCourseRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var found = await _courseService.UpdateAsync(teacherId, id, request, ct);
        if (!found) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var found = await _courseService.DeleteAsync(teacherId, id, ct);
        if (!found) return NotFound();
        return NoContent();
    }

    [HttpPost("{id:guid}/curriculum")]
    public async Task<IActionResult> AddEntry(Guid id, [FromBody] AddCurriculumEntryRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var (courseFound, entry) = await _courseService.AddEntryAsync(teacherId, id, request, ct);
        if (!courseFound) return NotFound();
        return CreatedAtAction(nameof(GetById), new { id }, entry);
    }

    [HttpDelete("{id:guid}/curriculum/{entryId:guid}")]
    public async Task<IActionResult> DeleteEntry(Guid id, Guid entryId, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var (courseFound, entryFound) = await _courseService.DeleteEntryAsync(teacherId, id, entryId, ct);
        if (!courseFound || !entryFound) return NotFound();
        return NoContent();
    }

    [HttpPut("{id:guid}/curriculum/reorder")]
    public async Task<IActionResult> Reorder(Guid id, [FromBody] ReorderCurriculumRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var result = await _courseService.ReorderEntriesAsync(teacherId, id, request, ct);
        return result switch
        {
            ReorderResult.CourseNotFound => NotFound(),
            ReorderResult.InvalidEntryIds => BadRequest("OrderedEntryIds must contain all entry IDs for this course exactly once."),
            _ => NoContent()
        };
    }

    [HttpPut("{id:guid}/curriculum/{entryId:guid}")]
    public async Task<IActionResult> UpdateEntry(Guid id, Guid entryId, [FromBody] UpdateCurriculumEntryRequest request, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var (courseFound, entry) = await _courseService.UpdateEntryAsync(teacherId, id, entryId, request, ct);
        if (!courseFound || entry is null) return NotFound();
        return Ok(entry);
    }

    [HttpPost("{id:guid}/curriculum/{entryId:guid}/lesson")]
    public async Task<IActionResult> GenerateLessonFromEntry(Guid id, Guid entryId, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var lessonId = await _courseService.GenerateLessonFromEntryAsync(teacherId, id, entryId, ct);
        if (lessonId is null) return NotFound();

        _logger.LogInformation(
            "POST /api/courses/{CourseId}/curriculum/{EntryId}/lesson created LessonId={LessonId}",
            id, entryId, lessonId);

        return Ok(new { lessonId });
    }
}
