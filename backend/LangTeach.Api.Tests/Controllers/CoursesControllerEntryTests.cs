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

[Collection("ApiTests")]
public class CoursesControllerEntryTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public CoursesControllerEntryTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private HttpClient CreateClient(string auth0Id, string email)
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

    private async Task<(Guid teacherId, Guid courseId, List<Guid> entryIds)> SeedCourseWithEntries(
        string auth0Id, string email, int entryCount = 3)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        Guid teacherId;
        var existing = db.Teachers.FirstOrDefault(t => t.Auth0UserId == auth0Id);
        if (existing is null)
        {
            var teacher = new Teacher
            {
                Id = Guid.NewGuid(),
                Auth0UserId = auth0Id,
                Email = email,
                DisplayName = "Entry Tester",
                IsApproved = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.Teachers.Add(teacher);
            await db.SaveChangesAsync();
            teacherId = teacher.Id;
        }
        else
        {
            teacherId = existing.Id;
        }

        var courseId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        db.Courses.Add(new Course
        {
            Id = courseId,
            TeacherId = teacherId,
            Name = "Test Course",
            Language = "English",
            Mode = "general",
            TargetCefrLevel = "B1",
            SessionCount = entryCount,
            CreatedAt = now,
            UpdatedAt = now,
        });

        var entryIds = new List<Guid>();
        for (var i = 1; i <= entryCount; i++)
        {
            var entryId = Guid.NewGuid();
            entryIds.Add(entryId);
            db.CurriculumEntries.Add(new CurriculumEntry
            {
                Id = entryId,
                CourseId = courseId,
                OrderIndex = i,
                Topic = $"Session {i}",
                Competencies = "speaking",
                Status = "planned",
            });
        }

        await db.SaveChangesAsync();
        return (teacherId, courseId, entryIds);
    }

    // -----------------------------------------------------------------------
    // POST /api/courses/{id}/curriculum — add entry
    // -----------------------------------------------------------------------

    [Fact]
    public async Task AddEntry_AppendsNewEntryAtEnd_Returns201()
    {
        const string auth0Id = "auth0|entry-add-ok";
        const string email = "entry-add-ok@example.com";
        var (_, courseId, _) = await SeedCourseWithEntries(auth0Id, email, 2);
        var client = CreateClient(auth0Id, email);

        var req = new { topic = "New Topic", grammarFocus = "Present perfect", competencies = "reading" };
        var response = await client.PostAsJsonAsync($"/api/courses/{courseId}/curriculum", req);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var entry = await response.Content.ReadFromJsonAsync<CurriculumEntryDto>();
        entry.Should().NotBeNull();
        entry!.Topic.Should().Be("New Topic");
        entry.GrammarFocus.Should().Be("Present perfect");
        entry.OrderIndex.Should().Be(3); // appended after existing 2
        entry.Status.Should().Be("planned");
    }

    [Fact]
    public async Task AddEntry_FirstEntry_HasOrderIndex1()
    {
        const string auth0Id = "auth0|entry-add-first";
        const string email = "entry-add-first@example.com";
        await SeedCourseWithEntries(auth0Id, email, 0);

        // Create a fresh empty course
        Guid courseId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var teacher = db.Teachers.First(t => t.Auth0UserId == auth0Id);
            courseId = Guid.NewGuid();
            db.Courses.Add(new Course
            {
                Id = courseId,
                TeacherId = teacher.Id,
                Name = "Empty Course",
                Language = "English",
                Mode = "general",
                TargetCefrLevel = "A1",
                SessionCount = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        var client = CreateClient(auth0Id, email);
        var req = new { topic = "First Session" };
        var response = await client.PostAsJsonAsync($"/api/courses/{courseId}/curriculum", req);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var entry = await response.Content.ReadFromJsonAsync<CurriculumEntryDto>();
        entry!.OrderIndex.Should().Be(1);
    }

    [Fact]
    public async Task AddEntry_MissingTopic_Returns400()
    {
        const string auth0Id = "auth0|entry-add-notopic";
        const string email = "entry-add-notopic@example.com";
        var (_, courseId, _) = await SeedCourseWithEntries(auth0Id, email, 1);
        var client = CreateClient(auth0Id, email);

        var req = new { grammarFocus = "Some grammar" }; // no topic
        var response = await client.PostAsJsonAsync($"/api/courses/{courseId}/curriculum", req);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AddEntry_NonExistentCourse_Returns404()
    {
        const string auth0Id = "auth0|entry-add-nocourse";
        const string email = "entry-add-nocourse@example.com";
        await SeedCourseWithEntries(auth0Id, email, 1);
        var client = CreateClient(auth0Id, email);

        var req = new { topic = "Any Topic" };
        var response = await client.PostAsJsonAsync($"/api/courses/{Guid.NewGuid()}/curriculum", req);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // -----------------------------------------------------------------------
    // DELETE /api/courses/{id}/curriculum/{entryId} — remove entry
    // -----------------------------------------------------------------------

    [Fact]
    public async Task DeleteEntry_SoftDeletesAndReindexesRemaining()
    {
        const string auth0Id = "auth0|entry-delete-ok";
        const string email = "entry-delete-ok@example.com";
        var (_, courseId, entryIds) = await SeedCourseWithEntries(auth0Id, email, 3);
        var client = CreateClient(auth0Id, email);

        // Delete the middle entry (orderIndex=2)
        var response = await client.DeleteAsync($"/api/courses/{courseId}/curriculum/{entryIds[1]}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify remaining entries via GET
        var getResponse = await client.GetAsync($"/api/courses/{courseId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var course = await getResponse.Content.ReadFromJsonAsync<CourseDto>();
        course!.Entries.Should().HaveCount(2);
        course.Entries.Select(e => e.OrderIndex).Should().BeEquivalentTo(new[] { 1, 2 });
        course.Entries.Should().NotContain(e => e.Topic == "Session 2");
    }

    [Fact]
    public async Task DeleteEntry_NonExistent_Returns404()
    {
        const string auth0Id = "auth0|entry-delete-notfound";
        const string email = "entry-delete-notfound@example.com";
        var (_, courseId, _) = await SeedCourseWithEntries(auth0Id, email, 2);
        var client = CreateClient(auth0Id, email);

        var response = await client.DeleteAsync($"/api/courses/{courseId}/curriculum/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteEntry_DeletedEntryNotReturnedInCourseView()
    {
        const string auth0Id = "auth0|entry-delete-hidden";
        const string email = "entry-delete-hidden@example.com";
        var (_, courseId, entryIds) = await SeedCourseWithEntries(auth0Id, email, 1);
        var client = CreateClient(auth0Id, email);

        await client.DeleteAsync($"/api/courses/{courseId}/curriculum/{entryIds[0]}");

        var getResponse = await client.GetAsync($"/api/courses/{courseId}");
        var course = await getResponse.Content.ReadFromJsonAsync<CourseDto>();
        course!.Entries.Should().BeEmpty();
    }

    // -----------------------------------------------------------------------
    // PUT /api/courses/{id}/curriculum/reorder — batch reorder
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Reorder_WithDeletedEntries_OnlyRequiresNonDeletedIds()
    {
        const string auth0Id = "auth0|entry-reorder-after-delete";
        const string email = "entry-reorder-after-delete@example.com";
        var (_, courseId, entryIds) = await SeedCourseWithEntries(auth0Id, email, 3);
        var client = CreateClient(auth0Id, email);

        // Delete first entry
        await client.DeleteAsync($"/api/courses/{courseId}/curriculum/{entryIds[0]}");

        // Reorder the remaining 2 in reverse
        var reorderReq = new { orderedEntryIds = new[] { entryIds[2], entryIds[1] } };
        var response = await client.PutAsJsonAsync($"/api/courses/{courseId}/curriculum/reorder", reorderReq);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getResponse = await client.GetAsync($"/api/courses/{courseId}");
        var course = await getResponse.Content.ReadFromJsonAsync<CourseDto>();
        course!.Entries.Should().HaveCount(2);
        course.Entries[0].Topic.Should().Be("Session 3");
        course.Entries[1].Topic.Should().Be("Session 2");
    }
}
