using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using LangTeach.Api.Helpers;
using System.Text.Json;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/lessons/{lessonId:guid}/content-blocks")]
[Authorize]
public class LessonContentBlocksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IProfileService _profileService;
    private readonly ILessonService _lessonService;
    private readonly IGrammarValidationService _grammarValidation;
    private readonly ILogger<LessonContentBlocksController> _logger;

    public LessonContentBlocksController(
        AppDbContext db,
        IProfileService profileService,
        ILessonService lessonService,
        IGrammarValidationService grammarValidation,
        ILogger<LessonContentBlocksController> logger)
    {
        _db = db;
        _profileService = profileService;
        _lessonService = lessonService;
        _grammarValidation = grammarValidation;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    internal static object? TryParseContent(string? content)
    {
        var stripped = ContentJsonHelper.StripFences(content);
        if (stripped is null) return null;
        try { return JsonSerializer.Deserialize<JsonElement>(stripped); }
        catch { return null; }
    }

    // No-warnings overload for PUT/DELETE endpoints that don't have language context
    private static ContentBlockDto ToDto(LessonContentBlock b) => new(
        b.Id,
        b.LessonSectionId,
        b.BlockType,
        b.GeneratedContent,
        b.EditedContent,
        b.EditedContent != null,
        b.GenerationParams,
        TryParseContent(b.EditedContent ?? b.GeneratedContent),
        b.CreatedAt);

    // With grammar warnings for GET and POST endpoints that have language context
    private ContentBlockDto ToDtoWithWarnings(LessonContentBlock b, string language) => new(
        b.Id,
        b.LessonSectionId,
        b.BlockType,
        b.GeneratedContent,
        b.EditedContent,
        b.EditedContent != null,
        b.GenerationParams,
        TryParseContent(b.EditedContent ?? b.GeneratedContent),
        b.CreatedAt,
        ToGrammarWarnings(b.GeneratedContent, language, ExtractGrammarFocus(b.GenerationParams)));

    private AI.GrammarWarning[]? ToGrammarWarnings(string content, string language, string? grammarFocus)
    {
        var warnings = _grammarValidation.Validate(content, language, grammarFocus);
        return warnings.Length > 0 ? warnings : null;
    }

    internal static string? ExtractGrammarFocus(string? generationParams)
    {
        if (generationParams is null) return null;
        try
        {
            using var doc = JsonDocument.Parse(generationParams);
            if (doc.RootElement.TryGetProperty("grammarConstraints", out var el) &&
                el.ValueKind == JsonValueKind.String)
                return el.GetString();
        }
        catch (JsonException) { }
        return null;
    }

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

        await _lessonService.EnsureLearningTargetsAsync(lesson, ct);

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

        return CreatedAtAction(nameof(Get), new { lessonId }, ToDtoWithWarnings(block, lesson.Language));
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

        return Ok(blocks.Select(b => ToDtoWithWarnings(b, lesson.Language)));
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
