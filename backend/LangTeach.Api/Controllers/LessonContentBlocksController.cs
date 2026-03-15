using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/lessons/{lessonId:guid}/content-blocks")]
[Authorize]
public class LessonContentBlocksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IProfileService _profileService;
    private readonly ILogger<LessonContentBlocksController> _logger;

    public LessonContentBlocksController(
        AppDbContext db,
        IProfileService profileService,
        ILogger<LessonContentBlocksController> logger)
    {
        _db = db;
        _profileService = profileService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    private static ContentBlockDto ToDto(LessonContentBlock b) => new(
        b.Id,
        b.LessonSectionId,
        b.BlockType,
        b.GeneratedContent,
        b.EditedContent,
        b.EditedContent != null,
        b.GenerationParams,
        b.CreatedAt);

    private async Task<(Guid teacherId, LessonContentBlock? block)> ResolveBlock(
        Guid lessonId, Guid blockId, CancellationToken ct)
    {
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id!, Email);
        var block = await _db.LessonContentBlocks
            .Include(b => b.Lesson)
            .FirstOrDefaultAsync(b => b.Id == blockId && b.LessonId == lessonId, ct);
        if (block is null || block.Lesson.TeacherId != teacherId || block.Lesson.IsDeleted)
            return (teacherId, null);
        return (teacherId, block);
    }

    [HttpPost]
    public async Task<IActionResult> Save(
        Guid lessonId,
        [FromBody] SaveContentBlockRequest request,
        CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var lesson = await _db.Lessons.FindAsync(new object[] { lessonId }, ct);
        if (lesson is null || lesson.TeacherId != teacherId || lesson.IsDeleted)
            return NotFound("Lesson not found.");

        if (request.LessonSectionId.HasValue)
        {
            var section = await _db.LessonSections.FindAsync(new object[] { request.LessonSectionId.Value }, ct);
            if (section is null || section.LessonId != lessonId)
                return NotFound("Section not found.");
        }

        var block = new LessonContentBlock
        {
            Id = Guid.NewGuid(),
            LessonId = lessonId,
            LessonSectionId = request.LessonSectionId,
            BlockType = request.BlockType,
            GeneratedContent = request.GeneratedContent,
            GenerationParams = request.GenerationParams,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.LessonContentBlocks.Add(block);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "POST content-block saved. LessonId={LessonId} BlockId={BlockId} BlockType={BlockType}",
            lessonId, block.Id, block.BlockType);

        return CreatedAtAction(nameof(Get), new { lessonId }, ToDto(block));
    }

    [HttpGet]
    public async Task<IActionResult> Get(Guid lessonId, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var lesson = await _db.Lessons.FindAsync(new object[] { lessonId }, ct);
        if (lesson is null || lesson.TeacherId != teacherId || lesson.IsDeleted)
            return NotFound("Lesson not found.");

        var blocks = await _db.LessonContentBlocks
            .Where(b => b.LessonId == lessonId)
            .OrderBy(b => b.CreatedAt)
            .ToListAsync(ct);

        return Ok(blocks.Select(ToDto));
    }

    [HttpPut("{blockId:guid}/edited-content")]
    public async Task<IActionResult> UpdateEditedContent(
        Guid lessonId,
        Guid blockId,
        [FromBody] UpdateEditedContentRequest request,
        CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (_, block) = await ResolveBlock(lessonId, blockId, ct);
        if (block is null) return NotFound("Content block not found.");

        block.EditedContent = request.EditedContent;
        block.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "PUT edited-content updated. LessonId={LessonId} BlockId={BlockId}", lessonId, blockId);

        return Ok(ToDto(block));
    }

    [HttpDelete("{blockId:guid}")]
    public async Task<IActionResult> Delete(Guid lessonId, Guid blockId, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();

        var (_, block) = await ResolveBlock(lessonId, blockId, ct);
        if (block is null) return NotFound("Content block not found.");

        _db.LessonContentBlocks.Remove(block);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "DELETE content-block removed. LessonId={LessonId} BlockId={BlockId}", lessonId, blockId);

        return NoContent();
    }

    [HttpDelete("{blockId:guid}/edited-content")]
    public async Task<IActionResult> ResetEditedContent(Guid lessonId, Guid blockId, CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();

        var (_, block) = await ResolveBlock(lessonId, blockId, ct);
        if (block is null) return NotFound("Content block not found.");

        block.EditedContent = null;
        block.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "DELETE edited-content reset. LessonId={LessonId} BlockId={BlockId}", lessonId, blockId);

        return Ok(ToDto(block));
    }
}
