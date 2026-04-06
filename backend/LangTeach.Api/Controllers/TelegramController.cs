using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Infrastructure;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/telegram")]
[Authorize]
public class TelegramController : ControllerBase
{
    private static readonly TimeSpan ConnectCodeExpiry = TimeSpan.FromMinutes(10);

    private readonly AppDbContext _db;
    private readonly ITelegramStateStore _stateStore;
    private readonly TelegramConversationService _conversationService;
    private readonly IProfileService _profileService;
    private readonly ILogger<TelegramController> _logger;

    public TelegramController(
        AppDbContext db,
        ITelegramStateStore stateStore,
        TelegramConversationService conversationService,
        IProfileService profileService,
        ILogger<TelegramController> logger)
    {
        _db = db;
        _stateStore = stateStore;
        _conversationService = conversationService;
        _profileService = profileService;
        _logger = logger;
    }

    private string? Auth0Id => User.FindFirstValue(ClaimTypes.NameIdentifier);
    private string Email => User.FindFirstValue(ClaimTypes.Email) ?? "";

    [HttpPost("connect-code")]
    public async Task<IActionResult> GenerateConnectCode(CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var code = GenerateCode();
        var expiresAt = DateTime.UtcNow.Add(ConnectCodeExpiry);
        _stateStore.SetConnectCode(code, teacherId, ConnectCodeExpiry);

        _logger.LogInformation("Telegram connect code generated for TeacherId={TeacherId}", teacherId);
        return Ok(new TelegramConnectCodeResponse(code, expiresAt));
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus(CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var link = await _db.Set<TelegramLink>()
            .FirstOrDefaultAsync(l => l.TeacherId == teacherId, ct);

        return Ok(new TelegramStatusResponse(link is not null, link?.CreatedAt));
    }

    [HttpDelete("link")]
    public async Task<IActionResult> DeleteLink(CancellationToken ct)
    {
        if (Auth0Id is null) return Unauthorized();
        var teacherId = await _profileService.UpsertTeacherAsync(Auth0Id, Email);

        var link = await _db.Set<TelegramLink>()
            .FirstOrDefaultAsync(l => l.TeacherId == teacherId, ct);

        if (link is null) return NotFound();

        _db.Set<TelegramLink>().Remove(link);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("TelegramLink removed for TeacherId={TeacherId}", teacherId);
        return NoContent();
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    [TypeFilter(typeof(TelegramWebhookSecretFilter))]
    public async Task<IActionResult> Webhook([FromBody] TelegramUpdate update, CancellationToken ct)
    {
        try
        {
            await _conversationService.HandleUpdateAsync(update, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error processing Telegram update {UpdateId}", update.UpdateId);
        }
        // Always return 200 to Telegram to prevent retries
        return Ok();
    }

    private static string GenerateCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var rng = new Random();
        return new string(Enumerable.Range(0, 8).Select(_ => chars[rng.Next(chars.Length)]).ToArray());
    }
}
