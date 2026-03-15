using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LangTeach.Api.Tests.Fixtures;

namespace LangTeach.Api.Tests.Controllers;

[Collection("ApiTests")]
public class AuthControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public AuthControllerTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Me_WithStandardEmailClaim_ReturnsEmail()
    {
        var client = _factory.CreateAuthenticatedClient(
            "auth0|auth-std", "std@example.com");

        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<MeResponse>();
        body!.Email.Should().Be("std@example.com");
    }

    [Fact]
    public async Task Me_WithCustomNamespaceClaim_ReturnsEmail()
    {
        var client = _factory.CreateAuthenticatedClient(
            "auth0|auth-ns", "ns@example.com",
            emailClaimType: "https://langteach.app/email",
            nameClaimType: "https://langteach.app/name");

        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<MeResponse>();
        body!.Email.Should().Be("ns@example.com");
    }

    private record MeResponse(string Sub, string Email);
}
