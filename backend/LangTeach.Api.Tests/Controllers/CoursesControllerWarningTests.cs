using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Fixtures;
using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Tests.Controllers;

internal sealed class FakeGenerationServiceWithWarnings : ICurriculumGenerationService
{
    private readonly List<CurriculumWarning> _warnings;

    public FakeGenerationServiceWithWarnings(params CurriculumWarning[] warnings)
    {
        _warnings = [.. warnings];
    }

    public Task<(List<CurriculumEntry> Entries, List<CurriculumWarning> Warnings)> GenerateAsync(CurriculumContext ctx, CancellationToken ct = default) =>
        Task.FromResult<(List<CurriculumEntry>, List<CurriculumWarning>)>((
            [new() { Id = Guid.NewGuid(), OrderIndex = 1, Topic = "Session With Warning", Status = "planned", GrammarFocus = "Subjunctive Mood" }],
            _warnings
        ));
}

[Collection("ApiTests")]
public class CoursesControllerWarningTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public CoursesControllerWarningTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private HttpClient CreateClient(
        string auth0Id,
        string email,
        ICurriculumGenerationService? generationService = null)
    {
        var client = _factory
            .WithWebHostBuilder(b => b.ConfigureServices(services =>
            {
                var existing = services.FirstOrDefault(d => d.ServiceType == typeof(ICurriculumGenerationService));
                if (existing is not null) services.Remove(existing);
                var svc = generationService ?? new FakeCurriculumGenerationService();
                services.AddScoped<ICurriculumGenerationService>(_ => svc);
            }))
            .CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Auth0Id", auth0Id);
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        return client;
    }

    private async Task SeedApprovedTeacher(string auth0Id, string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (db.Teachers.Any(t => t.Auth0UserId == auth0Id)) return;
        db.Teachers.Add(new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = auth0Id,
            Email = email,
            DisplayName = "Warning Tester",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task CreateCourse_WithNoWarnings_ReturnsNullWarningsField()
    {
        const string auth0Id = "auth0|warning-test-1";
        const string email = "warning1@test.com";
        await SeedApprovedTeacher(auth0Id, email);
        var client = CreateClient(auth0Id, email);

        var response = await client.PostAsJsonAsync("/api/courses", new
        {
            name = "Test Course",
            language = "Spanish",
            mode = "general",
            targetCefrLevel = "A1",
            sessionCount = 1
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var course = await response.Content.ReadFromJsonAsync<CourseDto>();
        course!.Warnings.Should().BeNullOrEmpty();
    }

    [Fact]
    public async Task CreateCourse_WithWarnings_ReturnsWarningsInResponse()
    {
        const string auth0Id = "auth0|warning-test-2";
        const string email = "warning2@test.com";
        await SeedApprovedTeacher(auth0Id, email);
        var warning = new CurriculumWarning(1, "Subjunctive Mood", "C1 structure, above A1.", "C1");
        var client = CreateClient(auth0Id, email, new FakeGenerationServiceWithWarnings(warning));

        var response = await client.PostAsJsonAsync("/api/courses", new
        {
            name = "Test Course Warnings",
            language = "Spanish",
            mode = "general",
            targetCefrLevel = "A1",
            sessionCount = 1
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var course = await response.Content.ReadFromJsonAsync<CourseDto>();
        course!.Warnings.Should().HaveCount(1);
        course.Warnings![0].GrammarFocus.Should().Be("Subjunctive Mood");
        course.Warnings![0].SuggestedLevel.Should().Be("C1");
    }

    [Fact]
    public async Task DismissWarning_ReturnsNoContent_AndPersistsDismissal()
    {
        const string auth0Id = "auth0|warning-test-3";
        const string email = "warning3@test.com";
        await SeedApprovedTeacher(auth0Id, email);
        var warning = new CurriculumWarning(1, "Subjunctive Mood", "C1 structure.", "C1");
        var client = CreateClient(auth0Id, email, new FakeGenerationServiceWithWarnings(warning));

        // Create course
        var createResponse = await client.PostAsJsonAsync("/api/courses", new
        {
            name = "Dismiss Test",
            language = "Spanish",
            mode = "general",
            targetCefrLevel = "A1",
            sessionCount = 1
        });
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var course = await createResponse.Content.ReadFromJsonAsync<CourseDto>();
        var courseId = course!.Id;

        // Dismiss the warning
        var dismissResponse = await client.PostAsJsonAsync(
            $"/api/courses/{courseId}/warnings/dismiss",
            new { warningKey = "session:1:Subjunctive Mood" });

        dismissResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // GET course and verify dismissed key is returned
        var getResponse = await client.GetAsync($"/api/courses/{courseId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedCourse = await getResponse.Content.ReadFromJsonAsync<CourseDto>();
        updatedCourse!.DismissedWarningKeys.Should().Contain("session:1:Subjunctive Mood");
    }

    [Fact]
    public async Task DismissWarning_WrongOwner_ReturnsNotFound()
    {
        const string ownerAuth0Id = "auth0|warning-owner-4";
        const string otherAuth0Id = "auth0|warning-other-4";
        const string ownerEmail = "owner4@test.com";
        const string otherEmail = "other4@test.com";
        await SeedApprovedTeacher(ownerAuth0Id, ownerEmail);
        await SeedApprovedTeacher(otherAuth0Id, otherEmail);

        var ownerClient = CreateClient(ownerAuth0Id, ownerEmail);
        var otherClient = CreateClient(otherAuth0Id, otherEmail);

        var createResponse = await ownerClient.PostAsJsonAsync("/api/courses", new
        {
            name = "Owner Course",
            language = "Spanish",
            mode = "general",
            targetCefrLevel = "A1",
            sessionCount = 1
        });
        var course = await createResponse.Content.ReadFromJsonAsync<CourseDto>();
        var courseId = course!.Id;

        // Other teacher tries to dismiss
        var dismissResponse = await otherClient.PostAsJsonAsync(
            $"/api/courses/{courseId}/warnings/dismiss",
            new { warningKey = "session:1:SomeGrammar" });

        dismissResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
