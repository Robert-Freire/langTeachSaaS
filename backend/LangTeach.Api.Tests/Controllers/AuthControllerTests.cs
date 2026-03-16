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

    [Fact]
    public async Task Me_WithEmailButNoName_PreservesEmailFromClaims()
    {
        var client = _factory.CreateAuthenticatedClient(
            "auth0|auth-partial", "partial@example.com",
            name: null);

        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<MeResponse>();
        body!.Email.Should().Be("partial@example.com");
    }

    [Fact]
    public async Task Me_ReturnsNameInResponse()
    {
        var client = _factory.CreateAuthenticatedClient(
            "auth0|auth-name", "name@example.com",
            name: "Jane Doe");

        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<MeResponse>();
        body!.Name.Should().Be("Jane Doe");
    }

    [Fact]
    public async Task Me_ProviderSwitch_PreservesTeacherIdentity()
    {
        // First login with auth0 email/password provider
        var client1 = _factory.CreateAuthenticatedClient(
            "auth0|provider-switch-1", "switch@example.com", name: "Switch User");
        var response1 = await client1.GetAsync("/api/auth/me");
        response1.StatusCode.Should().Be(HttpStatusCode.OK);
        var body1 = await response1.Content.ReadFromJsonAsync<MeResponse>();
        body1!.Sub.Should().Be("auth0|provider-switch-1");
        body1.Email.Should().Be("switch@example.com");

        // Second login with Google provider, same email — teacher identity must be preserved
        var client2 = _factory.CreateAuthenticatedClient(
            "google-oauth2|provider-switch-2", "switch@example.com", name: "Switch User");
        var response2 = await client2.GetAsync("/api/auth/me");
        response2.StatusCode.Should().Be(HttpStatusCode.OK);
        var body2 = await response2.Content.ReadFromJsonAsync<MeResponse>();
        body2!.Sub.Should().Be("google-oauth2|provider-switch-2");
        body2.Email.Should().Be("switch@example.com");

        // Third call with the new provider should still work (Auth0UserId was updated)
        var response3 = await client2.GetAsync("/api/auth/me");
        response3.StatusCode.Should().Be(HttpStatusCode.OK);
        var body3 = await response3.Content.ReadFromJsonAsync<MeResponse>();
        body3!.Sub.Should().Be("google-oauth2|provider-switch-2");
        body3.Email.Should().Be("switch@example.com");
    }

    [Fact]
    public async Task Me_EmptyEmail_FallsBackToAuth0UserId()
    {
        // First call with empty email
        var client1 = _factory.CreateAuthenticatedClient(
            "auth0|empty-email-fallback", "", name: "No Email");
        var response1 = await client1.GetAsync("/api/auth/me");
        response1.StatusCode.Should().Be(HttpStatusCode.OK);

        // Second call with same auth0Id and empty email should find the same teacher
        var response2 = await client1.GetAsync("/api/auth/me");
        response2.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response2.Content.ReadFromJsonAsync<MeResponse>();
        body!.Sub.Should().Be("auth0|empty-email-fallback");
        body.Email.Should().Be("auth0|empty-email-fallback");
    }

    private record MeResponse(string Sub, string Email, string? Name);
}
