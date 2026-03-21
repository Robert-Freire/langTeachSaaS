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

/// <summary>
/// Fake curriculum generation service that returns a minimal curriculum without calling Claude.
/// </summary>
internal sealed class FakeCurriculumGenerationService : ICurriculumGenerationService
{
    public Task<List<CurriculumEntry>> GenerateAsync(CurriculumContext ctx, CancellationToken ct = default) =>
        Task.FromResult(new List<CurriculumEntry>
        {
            new() { Id = Guid.NewGuid(), OrderIndex = 1, Topic = "Fake Session", Status = "planned" }
        });
}

[Collection("ApiTests")]
public class CoursesControllerTemplateTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public CoursesControllerTemplateTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private HttpClient CreateClientWithFakeCurriculum(string auth0Id, string email)
    {
        var client = _factory
            .WithWebHostBuilder(b => b.ConfigureServices(services =>
            {
                var existing = services.FirstOrDefault(d => d.ServiceType == typeof(ICurriculumGenerationService));
                if (existing is not null) services.Remove(existing);
                services.AddScoped<ICurriculumGenerationService, FakeCurriculumGenerationService>();
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
            DisplayName = "Template Tester",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task CreateCourse_WithValidTemplateLevel_Returns201WithTemplateEntries()
    {
        const string auth0Id = "auth0|course-template-ok";
        const string email = "course-template-ok@example.com";
        await SeedApprovedTeacher(auth0Id, email);
        var client = CreateClientWithFakeCurriculum(auth0Id, email);

        var request = new CreateCourseRequest
        {
            Name = "A1.1 Spanish Course",
            Language = "Spanish",
            Mode = "general",
            TargetCefrLevel = "A1",
            SessionCount = 10,   // will be overridden by template unit count
            TemplateLevel = "A1.1",
        };

        var response = await client.PostAsJsonAsync("/api/courses", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var course = await response.Content.ReadFromJsonAsync<CourseDto>();
        course.Should().NotBeNull();
        course!.Entries.Should().NotBeEmpty();
        // Entries come from the template, not from AI generation
        course.SessionCount.Should().Be(course.Entries.Count);
        // GrammarFocus should be populated from the template's grammar field
        course.Entries.Should().Contain(e => e.GrammarFocus != null && e.GrammarFocus.Length > 0);
    }

    [Fact]
    public async Task CreateCourse_WithTemplateLevel_AndExamPrepMode_Returns400()
    {
        const string auth0Id = "auth0|course-template-badmode";
        const string email = "course-template-badmode@example.com";
        await SeedApprovedTeacher(auth0Id, email);
        var client = CreateClientWithFakeCurriculum(auth0Id, email);

        var request = new CreateCourseRequest
        {
            Name = "Bad Mode Course",
            Language = "Spanish",
            Mode = "exam-prep",
            TargetExam = "DELE",
            SessionCount = 10,
            TemplateLevel = "A1.1",
        };

        var response = await client.PostAsJsonAsync("/api/courses", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateCourse_WithUnknownTemplateLevel_Returns400()
    {
        const string auth0Id = "auth0|course-template-notfound";
        const string email = "course-template-notfound@example.com";
        await SeedApprovedTeacher(auth0Id, email);
        var client = CreateClientWithFakeCurriculum(auth0Id, email);

        var request = new CreateCourseRequest
        {
            Name = "Unknown Template Course",
            Language = "Spanish",
            Mode = "general",
            TargetCefrLevel = "B1",
            SessionCount = 10,
            TemplateLevel = "B9.9",
        };

        var response = await client.PostAsJsonAsync("/api/courses", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateCourse_WithoutTemplateLevel_UsesAiGeneration()
    {
        const string auth0Id = "auth0|course-no-template";
        const string email = "course-no-template@example.com";
        await SeedApprovedTeacher(auth0Id, email);
        var client = CreateClientWithFakeCurriculum(auth0Id, email);

        var request = new CreateCourseRequest
        {
            Name = "AI Course",
            Language = "English",
            Mode = "general",
            TargetCefrLevel = "B1",
            SessionCount = 5,
        };

        var response = await client.PostAsJsonAsync("/api/courses", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var course = await response.Content.ReadFromJsonAsync<CourseDto>();
        course!.Entries.Should().HaveCount(1); // fake service returns 1 entry
    }
}
