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
        // SessionCount is derived from entries when template is used
        course.SessionCount.Should().Be(course.Entries.Count);
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
            TemplateLevel = "B1.999", // valid format, non-existent template
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

    // -------------------------------------------------------------------------
    // Integration tests using real CurriculumGenerationService + fake Claude
    // -------------------------------------------------------------------------

    /// <summary>
    /// Creates a client that uses the real CurriculumGenerationService but replaces IClaudeClient
    /// so no real AI calls are made.
    /// </summary>
    private HttpClient CreateClientWithRealCurriculumAndFakeClaude(
        string auth0Id, string email, string claudeResponse = "[]")
    {
        var client = _factory
            .WithWebHostBuilder(b => b.ConfigureServices(services =>
            {
                var existingClaude = services.FirstOrDefault(d => d.ServiceType == typeof(IClaudeClient));
                if (existingClaude is not null) services.Remove(existingClaude);
                services.AddScoped<IClaudeClient>(_ => new FakeClaudeClient { FixedContent = claudeResponse });
            }))
            .CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Auth0Id", auth0Id);
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        return client;
    }

    [Fact]
    public async Task CreateCourse_A1_1Template_NoStudent_EntriesAlignToA1_1Units()
    {
        const string auth0Id = "auth0|course-a1-real-svc";
        const string email = "course-a1-real-svc@example.com";
        await SeedApprovedTeacher(auth0Id, email);
        // No student → AI should NOT be called; FakeClaudeClient content is irrelevant
        var client = CreateClientWithRealCurriculumAndFakeClaude(auth0Id, email);

        var request = new CreateCourseRequest
        {
            Name = "A1.1 Real Service Test",
            Language = "Spanish",
            Mode = "general",
            TargetCefrLevel = "A1",
            SessionCount = 99,  // ignored for template path
            TemplateLevel = "A1.1",
        };

        var response = await client.PostAsJsonAsync("/api/courses", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var course = await response.Content.ReadFromJsonAsync<CourseDto>();
        course.Should().NotBeNull();

        // A1.1 has 4 units (unit_number 0–3)
        course!.Entries.Should().HaveCount(4);
        course.SessionCount.Should().Be(4);

        // All entries must have TemplateUnitRef set
        course.Entries.Should().OnlyContain(e => e.TemplateUnitRef != null);

        // All entries must have CompetencyFocus set (A1.1 JSON now has competency_focus on every unit)
        course.Entries.Should().OnlyContain(e => e.CompetencyFocus != null);

        // Grammar focus should be populated from the template
        course.Entries.Should().Contain(e => e.GrammarFocus != null && e.GrammarFocus.Length > 0);

        // Entries must be in order
        course.Entries.Select(e => e.OrderIndex).Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task CreateCourse_A1_1Template_WithStudent_PersonalizedTopicsFromAi()
    {
        const string auth0Id = "auth0|course-a1-personalized";
        const string email = "course-a1-personalized@example.com";
        await SeedApprovedTeacher(auth0Id, email);

        // Seed a student linked to this teacher
        Guid studentId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var teacher = db.Teachers.First(t => t.Auth0UserId == auth0Id);
            var student = new Student
            {
                Id = Guid.NewGuid(),
                TeacherId = teacher.Id,
                Name = "Marco",
                NativeLanguage = "Italian",
                Interests = "[]",
                LearningGoals = "[]",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.Students.Add(student);
            await db.SaveChangesAsync();
            studentId = student.Id;
        }

        // AI personalization response — 4 entries matching A1.1 unit count
        const string personalizationJson = """
            [
                {"orderIndex":1,"topic":"Marco greets his football team"},
                {"orderIndex":2,"topic":"Marco talks about why he loves football"},
                {"orderIndex":3,"topic":"Marco learns about football stadiums in Spain"},
                {"orderIndex":4,"topic":"Marco asks where the nearest stadium is"}
            ]
            """;
        var client = CreateClientWithRealCurriculumAndFakeClaude(auth0Id, email, personalizationJson);

        var request = new CreateCourseRequest
        {
            Name = "A1.1 Marco Personalized",
            Language = "Spanish",
            Mode = "general",
            TargetCefrLevel = "A1",
            SessionCount = 99,
            TemplateLevel = "A1.1",
            StudentId = studentId,
        };

        var response = await client.PostAsJsonAsync("/api/courses", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var course = await response.Content.ReadFromJsonAsync<CourseDto>();
        course.Should().NotBeNull();

        course!.Entries.Should().HaveCount(4);
        course.Entries[0].Topic.Should().Be("Marco greets his football team");

        // Grammar must be preserved from template, not touched by AI
        course.Entries[0].GrammarFocus.Should().Contain("llamarse");

        // TemplateUnitRef must still be set despite personalization
        course.Entries[0].TemplateUnitRef.Should().NotBeNullOrEmpty();
    }
}
