using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LangTeach.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly ILogger<AuthController> _logger;

    public AuthController(ILogger<AuthController> logger)
    {
        _logger = logger;
    }

    [HttpGet("me")]
    public IActionResult Me()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value ?? "";

        _logger.LogInformation("Auth/Me called. Sub={Sub} Email={Email}", sub, email);

        // T5 will inject ITeacherService and upsert teacher record here
        return Ok(new { sub, email });
    }
}
