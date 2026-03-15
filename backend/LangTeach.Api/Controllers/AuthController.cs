using System.Security.Claims;
using System.Text.Json;
using LangTeach.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IProfileService profileService,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<AuthController> logger)
    {
        _profileService = profileService;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "";

        // Auth0 access tokens don't include email by default — fall back to /userinfo
        var email = User.FindFirst(ClaimTypes.Email)?.Value
                 ?? User.FindFirst("email")?.Value
                 ?? await FetchEmailFromUserInfoAsync();

        _logger.LogInformation("Auth/Me called. Sub={Sub} Email={Email}", sub, email);

        await _profileService.UpsertTeacherAsync(sub, email);

        return Ok(new { sub, email });
    }

    private async Task<string> FetchEmailFromUserInfoAsync()
    {
        try
        {
            var domain = _configuration["Auth0:Domain"];
            var token  = Request.Headers.Authorization.ToString()["Bearer ".Length..].Trim();

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetStringAsync($"https://{domain}/userinfo");
            var doc      = JsonDocument.Parse(response);

            return doc.RootElement.TryGetProperty("email", out var emailProp)
                ? emailProp.GetString() ?? ""
                : "";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch email from /userinfo — teacher will be stored without email.");
            return "";
        }
    }
}
