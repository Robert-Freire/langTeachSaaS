using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/generate")]
[Authorize]
public class GenerateController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly IStudentService _studentService;
    private readonly IPromptService _promptService;
    private readonly IClaudeClient _claudeClient;
    private readonly IMaterialService _materialService;
    private readonly AppDbContext _db;
    private readonly ILogger<GenerateController> _logger;

    public GenerateController(
        IProfileService profileService,
        IStudentService studentService,
        IPromptService promptService,
        IClaudeClient claudeClient,
        IMaterialService materialService,
        AppDbContext db,
        ILogger<GenerateController> logger)
    {
        _profileService = profileService;
        _studentService = studentService;
        _promptService = promptService;
        _claudeClient = claudeClient;
        _materialService = materialService;
        _db = db;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    private static readonly IReadOnlyDictionary<ContentBlockType, Func<IPromptService, GenerationContext, ClaudeRequest>> PromptBuilders =
        new Dictionary<ContentBlockType, Func<IPromptService, GenerationContext, ClaudeRequest>>
        {
            [ContentBlockType.LessonPlan]   = (svc, ctx) => svc.BuildLessonPlanPrompt(ctx),
            [ContentBlockType.Vocabulary]   = (svc, ctx) => svc.BuildVocabularyPrompt(ctx),
            [ContentBlockType.Grammar]      = (svc, ctx) => svc.BuildGrammarPrompt(ctx),
            [ContentBlockType.Exercises]    = (svc, ctx) => svc.BuildExercisesPrompt(ctx),
            [ContentBlockType.Conversation] = (svc, ctx) => svc.BuildConversationPrompt(ctx),
            [ContentBlockType.Reading]      = (svc, ctx) => svc.BuildReadingPrompt(ctx),
            [ContentBlockType.Homework]     = (svc, ctx) => svc.BuildHomeworkPrompt(ctx),
        };

    [HttpPost("{taskType}/stream")]
    public async Task Stream(string taskType, [FromBody] GenerateRequest request, CancellationToken ct)
    {
        if (!ContentBlockTypeExtensions.TryFromKebabCase(taskType, out var blockTypeEnum) ||
            !PromptBuilders.TryGetValue(blockTypeEnum, out var buildPrompt))
        {
            Response.StatusCode = 404;
            return;
        }

        if (Auth0Id is null)
        {
            Response.StatusCode = 401;
            return;
        }

        if (!ModelState.IsValid)
        {
            Response.StatusCode = 400;
            return;
        }

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);
        var teacher = await _db.Teachers.FindAsync(new object[] { teacherId }, ct);
        if (teacher is null || !teacher.IsApproved)
        {
            _logger.LogWarning("Stream/{TaskType} rejected: teacher not approved. TeacherId={TeacherId}", taskType, teacherId);
            Response.StatusCode = 403;
            return;
        }

        var lesson = await _db.Lessons.FindAsync(new object[] { request.LessonId }, ct);
        if (lesson is null || lesson.TeacherId != teacherId || lesson.IsDeleted)
        {
            Response.StatusCode = 404;
            await Response.WriteAsync("Lesson not found.", ct);
            return;
        }

        StudentDto? student = null;
        if (request.StudentId.HasValue)
        {
            student = await _studentService.GetByIdAsync(teacherId, request.StudentId.Value, ct);
            if (student is null)
            {
                Response.StatusCode = 404;
                await Response.WriteAsync("Student not found.", ct);
                return;
            }
        }

        var language = request.Language.Trim();
        var cefrLevel = request.CefrLevel.Trim();
        var topic = request.Topic.Trim();
        if (language.Length == 0 || cefrLevel.Length == 0 || topic.Length == 0)
        {
            Response.StatusCode = 400;
            await Response.WriteAsync("Language, CefrLevel, and Topic must not be blank.", ct);
            return;
        }

        var materials = await _materialService.GetMaterialContentsAsync(teacherId, lesson.Id, ct);
        var materialFileNames = materials.Count > 0
            ? materials.Select(m => m.FileName).ToArray()
            : null;

        var ctx = new GenerationContext(
            Language: language,
            CefrLevel: cefrLevel,
            Topic: topic,
            Style: request.Style,
            DurationMinutes: lesson.DurationMinutes,
            StudentName: student?.Name,
            StudentNativeLanguage: student?.NativeLanguage,
            StudentInterests: student?.Interests.ToArray(),
            StudentGoals: student?.LearningGoals.ToArray(),
            StudentWeaknesses: student?.Weaknesses.ToArray(),
            ExistingNotes: request.ExistingNotes,
            Direction: request.Direction,
            MaterialFileNames: materialFileNames
        );

        var claudeRequest = buildPrompt(_promptService, ctx);
        claudeRequest = AttachMaterials(claudeRequest, materials);

        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no";

        try
        {
            await foreach (var token in _claudeClient.StreamAsync(claudeRequest, ct))
            {
                await Response.WriteAsync($"data: {JsonSerializer.Serialize(token)}\n\n", ct);
                await Response.Body.FlushAsync(ct);
            }
            await Response.WriteAsync("data: [DONE]\n\n", ct);
            await Response.Body.FlushAsync(ct);
            _logger.LogInformation("Stream/{TaskType} succeeded. LessonId={LessonId}", taskType, lesson.Id);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // Client aborted — normal
        }
        catch (ClaudeRateLimitException ex)
        {
            _logger.LogWarning(ex, "Stream/{TaskType} rate limited. LessonId={LessonId}", taskType, lesson.Id);
            await Response.WriteAsync("data: {\"error\":\"rate_limit\"}\n\n", CancellationToken.None);
            await Response.Body.FlushAsync(CancellationToken.None);
        }
        catch (ClaudeApiException ex)
        {
            _logger.LogError(ex, "Stream/{TaskType} provider error. LessonId={LessonId}", taskType, lesson.Id);
            await Response.WriteAsync("data: {\"error\":\"provider_error\"}\n\n", CancellationToken.None);
            await Response.Body.FlushAsync(CancellationToken.None);
        }
    }

    [HttpPost("lesson-plan")]
    public Task<IActionResult> LessonPlan([FromBody] GenerateRequest request, CancellationToken ct) =>
        Generate(request, ContentBlockType.LessonPlan, ctx => _promptService.BuildLessonPlanPrompt(ctx), ct);

    [HttpPost("vocabulary")]
    public Task<IActionResult> Vocabulary([FromBody] GenerateRequest request, CancellationToken ct) =>
        Generate(request, ContentBlockType.Vocabulary, ctx => _promptService.BuildVocabularyPrompt(ctx), ct);

    [HttpPost("grammar")]
    public Task<IActionResult> Grammar([FromBody] GenerateRequest request, CancellationToken ct) =>
        Generate(request, ContentBlockType.Grammar, ctx => _promptService.BuildGrammarPrompt(ctx), ct);

    [HttpPost("exercises")]
    public Task<IActionResult> Exercises([FromBody] GenerateRequest request, CancellationToken ct) =>
        Generate(request, ContentBlockType.Exercises, ctx => _promptService.BuildExercisesPrompt(ctx), ct);

    [HttpPost("conversation")]
    public Task<IActionResult> Conversation([FromBody] GenerateRequest request, CancellationToken ct) =>
        Generate(request, ContentBlockType.Conversation, ctx => _promptService.BuildConversationPrompt(ctx), ct);

    [HttpPost("reading")]
    public Task<IActionResult> Reading([FromBody] GenerateRequest request, CancellationToken ct) =>
        Generate(request, ContentBlockType.Reading, ctx => _promptService.BuildReadingPrompt(ctx), ct);

    [HttpPost("homework")]
    public Task<IActionResult> Homework([FromBody] GenerateRequest request, CancellationToken ct) =>
        Generate(request, ContentBlockType.Homework, ctx => _promptService.BuildHomeworkPrompt(ctx), ct);

    private async Task<IActionResult> Generate(
        GenerateRequest request,
        ContentBlockType blockType,
        Func<GenerationContext, ClaudeRequest> buildPrompt,
        CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var teacher = await _db.Teachers.FindAsync(new object[] { teacherId }, ct);
        if (teacher is null || !teacher.IsApproved)
        {
            _logger.LogWarning("Generate/{BlockType} rejected: teacher not approved. TeacherId={TeacherId}", blockType, teacherId);
            return Forbid();
        }

        var lesson = await _db.Lessons.FindAsync(new object[] { request.LessonId }, ct);
        if (lesson is null || lesson.TeacherId != teacherId || lesson.IsDeleted)
        {
            _logger.LogWarning("Generate/{BlockType} lesson not found. LessonId={LessonId} TeacherId={TeacherId}", blockType, request.LessonId, teacherId);
            return NotFound("Lesson not found.");
        }

        StudentDto? student = null;
        if (request.StudentId.HasValue)
        {
            student = await _studentService.GetByIdAsync(teacherId, request.StudentId.Value, ct);
            if (student is null)
            {
                _logger.LogWarning("Generate/{BlockType} student not found. StudentId={StudentId} TeacherId={TeacherId}", blockType, request.StudentId, teacherId);
                return NotFound("Student not found.");
            }
        }

        var language = request.Language.Trim();
        var cefrLevel = request.CefrLevel.Trim();
        var topic = request.Topic.Trim();

        if (language.Length == 0 || cefrLevel.Length == 0 || topic.Length == 0)
            return BadRequest("Language, CefrLevel, and Topic must not be blank.");

        var materials = await _materialService.GetMaterialContentsAsync(teacherId, lesson.Id, ct);
        var materialFileNames = materials.Count > 0
            ? materials.Select(m => m.FileName).ToArray()
            : null;

        var ctx = new GenerationContext(
            Language: language,
            CefrLevel: cefrLevel,
            Topic: topic,
            Style: request.Style,
            DurationMinutes: lesson.DurationMinutes,
            StudentName: student?.Name,
            StudentNativeLanguage: student?.NativeLanguage,
            StudentInterests: student?.Interests.ToArray(),
            StudentGoals: student?.LearningGoals.ToArray(),
            StudentWeaknesses: student?.Weaknesses.ToArray(),
            ExistingNotes: request.ExistingNotes,
            Direction: request.Direction,
            MaterialFileNames: materialFileNames
        );

        var claudeRequest = buildPrompt(ctx);
        claudeRequest = AttachMaterials(claudeRequest, materials);

        ClaudeResponse response;
        try
        {
            response = await _claudeClient.CompleteAsync(claudeRequest, ct);
        }
        catch (ClaudeRateLimitException ex)
        {
            _logger.LogWarning(ex, "Generate/{BlockType} rate limited. LessonId={LessonId}", blockType, lesson.Id);
            return StatusCode(503, "AI provider rate limit reached. Please try again shortly.");
        }
        catch (ClaudeApiException ex)
        {
            _logger.LogError(ex, "Generate/{BlockType} provider error. LessonId={LessonId}", blockType, lesson.Id);
            return StatusCode(502, "AI provider returned an error. Please try again.");
        }

        var block = new LessonContentBlock
        {
            Id = Guid.NewGuid(),
            LessonId = lesson.Id,
            LessonSectionId = null,
            BlockType = blockType,
            GeneratedContent = response.Content,
            GenerationParams = JsonSerializer.Serialize(request),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.LessonContentBlocks.Add(block);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Generate/{BlockType} succeeded. LessonId={LessonId} BlockId={BlockId} InputTokens={InputTokens} OutputTokens={OutputTokens}",
            blockType, lesson.Id, block.Id, response.InputTokens, response.OutputTokens);

        return Ok(new GenerationResultDto(block.Id, block.BlockType, block.GeneratedContent));
    }

    private static ClaudeRequest AttachMaterials(ClaudeRequest claudeRequest, List<MaterialContent> materials)
    {
        if (materials.Count == 0)
            return claudeRequest;

        var attachments = materials
            .Select(m => new ContentAttachment(m.ContentType, m.Data, m.FileName))
            .ToArray();

        claudeRequest = claudeRequest with { Attachments = attachments };

        // Haiku does not support PDF document blocks; upgrade to Sonnet when PDFs are present
        if (claudeRequest.Model == ClaudeModel.Haiku &&
            materials.Any(m => m.ContentType == "application/pdf"))
        {
            claudeRequest = claudeRequest with { Model = ClaudeModel.Sonnet };
        }

        return claudeRequest;
    }
}
