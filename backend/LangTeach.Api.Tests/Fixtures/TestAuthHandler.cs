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
    public const string DefaultName = "Test User";
    // Sentinel sent via header to force the email claim to be absent (empty string headers are dropped by HttpClient)
    public const string NoEmailSentinel = "__no_email__";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var auth0Id = Request.Headers["X-Test-Auth0Id"].FirstOrDefault() ?? DefaultAuth0Id;
        var rawEmail = Request.Headers["X-Test-Email"].FirstOrDefault() ?? DefaultEmail;
        var email = rawEmail == NoEmailSentinel ? "" : rawEmail;
        var name = Request.Headers["X-Test-Name"].FirstOrDefault() ?? DefaultName;
        var emailClaimType = Request.Headers["X-Test-EmailClaimType"].FirstOrDefault() ?? ClaimTypes.Email;
        var nameClaimType = Request.Headers["X-Test-NameClaimType"].FirstOrDefault() ?? ClaimTypes.Name;

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, auth0Id),
        };

        if (!string.IsNullOrEmpty(email))
        {
            claims.Add(new Claim(emailClaimType, email));
        }

        if (!string.IsNullOrEmpty(name))
        {
            claims.Add(new Claim(nameClaimType, name));
        }

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
