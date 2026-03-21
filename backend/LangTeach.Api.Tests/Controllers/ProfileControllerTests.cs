using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.Tests.Fixtures;

namespace LangTeach.Api.Tests.Controllers;

[Collection("ApiTests")]
public class ProfileControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public ProfileControllerTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Get_NewTeacher_HasCompletedOnboardingIsFalse()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|onboarding-new", "onboarding-new@example.com", "New Teacher");

        var response = await client.GetAsync("/api/profile");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("hasCompletedOnboarding").GetBoolean().Should().BeFalse();
        doc.RootElement.GetProperty("hasSettings").GetBoolean().Should().BeFalse();
        doc.RootElement.GetProperty("hasStudents").GetBoolean().Should().BeFalse();
        doc.RootElement.GetProperty("hasLessons").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task CompleteOnboarding_SetsFlag()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|onboarding-complete", "onboarding-complete@example.com", "Complete Teacher");

        // Ensure teacher exists
        await client.GetAsync("/api/profile");

        // Complete onboarding
        var response = await client.PostAsync("/api/profile/complete-onboarding", null);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify flag is set
        var profileResponse = await client.GetAsync("/api/profile");
        var json = await profileResponse.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("hasCompletedOnboarding").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task CompleteOnboarding_IsIdempotent()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|onboarding-idempotent", "onboarding-idempotent@example.com", "Idempotent Teacher");

        await client.GetAsync("/api/profile");

        var first = await client.PostAsync("/api/profile/complete-onboarding", null);
        first.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var second = await client.PostAsync("/api/profile/complete-onboarding", null);
        second.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Get_HasStudentsAndHasLessons_ReflectData()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|onboarding-data", "onboarding-data@example.com", "Data Teacher");

        // Get profile, initially no students or lessons
        var response = await client.GetAsync("/api/profile");
        var json = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("hasStudents").GetBoolean().Should().BeFalse();
        doc.RootElement.GetProperty("hasLessons").GetBoolean().Should().BeFalse();

        // Create a student
        var studentResponse = await client.PostAsJsonAsync("/api/students", new
        {
            name = "Test Student",
            learningLanguage = "English",
            cefrLevel = "B1",
            interests = Array.Empty<string>(),
            learningGoals = Array.Empty<string>(),
            weaknesses = Array.Empty<string>(),
            difficulties = Array.Empty<object>(),
        });
        studentResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        // Now profile should have hasStudents = true
        response = await client.GetAsync("/api/profile");
        json = await response.Content.ReadAsStringAsync();
        doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("hasStudents").GetBoolean().Should().BeTrue();
    }
}
