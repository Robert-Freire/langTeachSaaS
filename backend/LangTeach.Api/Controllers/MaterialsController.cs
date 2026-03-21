using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/lessons/{lessonId:guid}/sections/{sectionId:guid}/materials")]
[Authorize]
public class MaterialsController : ControllerBase
{
    private readonly IMaterialService _materialService;
    private readonly IProfileService _profileService;
    private readonly ILogger<MaterialsController> _logger;

    public MaterialsController(
        IMaterialService materialService,
        IProfileService profileService,
        ILogger<MaterialsController> logger)
    {
        _materialService = materialService;
        _profileService = profileService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpPost]
    [RequestSizeLimit(10_485_760)]
    public async Task<IActionResult> Upload(Guid lessonId, Guid sectionId, IFormFile file, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        try
        {
            var material = await _materialService.UploadAsync(teacherId, lessonId, sectionId, file, cancellationToken);
            _logger.LogInformation("POST material uploaded. LessonId={LessonId} SectionId={SectionId} MaterialId={MaterialId}",
                lessonId, sectionId, material.Id);
            return CreatedAtAction(nameof(GetDownloadUrl), new { lessonId, sectionId, id = material.Id }, material);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("POST material upload failed. LessonId={LessonId} SectionId={SectionId} Error={Error}",
                lessonId, sectionId, ex.Message);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> List(Guid lessonId, Guid sectionId, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var materials = await _materialService.ListAsync(teacherId, lessonId, sectionId, cancellationToken);
        return Ok(materials);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDownloadUrl(Guid lessonId, Guid sectionId, Guid id, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var url = await _materialService.GetDownloadUrlAsync(teacherId, lessonId, sectionId, id, cancellationToken);
        if (url is null)
        {
            _logger.LogWarning("GET material not found. LessonId={LessonId} SectionId={SectionId} MaterialId={MaterialId}",
                lessonId, sectionId, id);
            return NotFound();
        }

        return Redirect(url);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid lessonId, Guid sectionId, Guid id, CancellationToken cancellationToken)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var deleted = await _materialService.DeleteAsync(teacherId, lessonId, sectionId, id, cancellationToken);
        if (!deleted)
        {
            _logger.LogWarning("DELETE material not found. LessonId={LessonId} SectionId={SectionId} MaterialId={MaterialId}",
                lessonId, sectionId, id);
            return NotFound();
        }

        return NoContent();
    }
}
