using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.Tests.Fixtures;

public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Test";
    public const string DefaultAuth0Id = "auth0|test-teacher-1";
    public const string DefaultEmail = "test@example.com";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var auth0Id = Request.Headers["X-Test-Auth0Id"].FirstOrDefault() ?? DefaultAuth0Id;
        var email = Request.Headers["X-Test-Email"].FirstOrDefault() ?? DefaultEmail;

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, auth0Id),
            new Claim(ClaimTypes.Email, email),
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
