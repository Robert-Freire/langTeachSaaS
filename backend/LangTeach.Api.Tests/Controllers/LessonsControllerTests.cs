using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Tests.Fixtures;
using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Tests.Controllers;

[Collection("ApiTests")]
public class LessonsControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public LessonsControllerTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreateLesson_ReturnsCreated()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|lesson-create", "lesson-create@example.com");

        var request = new CreateLessonRequest
        {
            Title = "Present Simple Intro",
            Language = "English",
            CefrLevel = "A1",
            Topic = "Daily routines",
            DurationMinutes = 45,
            Objectives = "Use present simple for habits.",
        };

        var response = await client.PostAsJsonAsync("/api/lessons", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var lesson = await response.Content.ReadFromJsonAsync<LessonDto>();
        lesson!.Title.Should().Be("Present Simple Intro");
        lesson.Language.Should().Be("English");
        lesson.CefrLevel.Should().Be("A1");
        lesson.Topic.Should().Be("Daily routines");
        lesson.DurationMinutes.Should().Be(45);
        lesson.Status.Should().Be("Draft");
        lesson.Sections.Should().BeEmpty();
        response.Headers.Location.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateLesson_WithTemplate_CopiesSections()
    {
        // Seed a LessonTemplate directly into the shared in-memory DB
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var templateId = Guid.NewGuid();
        db.LessonTemplates.Add(new LessonTemplate
        {
            Id = templateId,
            Name = "Test Grammar Template",
            Description = "For template copy test",
            DefaultSections = """[{"SectionType":"WarmUp","OrderIndex":0,"NotesPlaceholder":"Opener question."},{"SectionType":"Practice","OrderIndex":1,"NotesPlaceholder":"Gap-fill exercise."}]""",
        });
        await db.SaveChangesAsync();

        var client = _factory.CreateAuthenticatedClient("auth0|lesson-template", "lesson-template@example.com");

        var request = new CreateLessonRequest
        {
            Title = "Grammar Template Lesson",
            Language = "English",
            CefrLevel = "B1",
            Topic = "Present Perfect",
            DurationMinutes = 60,
            TemplateId = templateId,
        };

        var response = await client.PostAsJsonAsync("/api/lessons", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var lesson = await response.Content.ReadFromJsonAsync<LessonDto>();
        lesson!.TemplateId.Should().Be(templateId);
        lesson.Sections.Should().HaveCount(2);
        lesson.Sections[0].SectionType.Should().Be("WarmUp");
        lesson.Sections[0].Notes.Should().Be("Opener question.");
        lesson.Sections[1].SectionType.Should().Be("Practice");
    }

    [Fact]
    public async Task GetLesson_ReturnsWithSections()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|lesson-get", "lesson-get@example.com");

        var created = await CreateLessonAsync(client, "Get Test Lesson");

        // Add sections via UpdateSections
        var sectionsRequest = new UpdateLessonSectionsRequest
        {
            Sections =
            [
                new SectionInput { SectionType = "WarmUp", OrderIndex = 0, Notes = "Ice-breaker question." },
                new SectionInput { SectionType = "Practice", OrderIndex = 1, Notes = "Gap-fill exercise." },
            ]
        };
        await client.PutAsJsonAsync($"/api/lessons/{created.Id}/sections", sectionsRequest);

        var response = await client.GetAsync($"/api/lessons/{created.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var lesson = await response.Content.ReadFromJsonAsync<LessonDto>();
        lesson!.Id.Should().Be(created.Id);
        lesson.Sections.Should().HaveCount(2);
        lesson.Sections[0].SectionType.Should().Be("WarmUp");
        lesson.Sections[1].SectionType.Should().Be("Practice");
    }

    [Fact]
    public async Task GetLesson_OtherTeacher_Returns404()
    {
        var clientA = _factory.CreateAuthenticatedClient("auth0|lesson-rls-a", "lesson-rls-a@example.com");
        var clientB = _factory.CreateAuthenticatedClient("auth0|lesson-rls-b", "lesson-rls-b@example.com");

        var lesson = await CreateLessonAsync(clientA, "Teacher A Lesson");

        var response = await clientB.GetAsync($"/api/lessons/{lesson.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateLesson_ReturnsUpdated()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|lesson-update", "lesson-update@example.com");

        var created = await CreateLessonAsync(client, "Original Title");

        var updateRequest = new UpdateLessonRequest
        {
            Title = "Updated Title",
            Language = "Spanish",
            CefrLevel = "B2",
            Topic = "Subjunctive mood",
            DurationMinutes = 90,
            Status = "Published",
        };

        var response = await client.PutAsJsonAsync($"/api/lessons/{created.Id}", updateRequest);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<LessonDto>();
        updated!.Title.Should().Be("Updated Title");
        updated.Language.Should().Be("Spanish");
        updated.CefrLevel.Should().Be("B2");
        updated.Status.Should().Be("Published");
        updated.DurationMinutes.Should().Be(90);
    }

    [Fact]
    public async Task UpdateSections_ReplacesAll()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|lesson-sections", "lesson-sections@example.com");

        var created = await CreateLessonAsync(client, "Sections Replace Test");

        // First update
        var firstSections = new UpdateLessonSectionsRequest
        {
            Sections =
            [
                new SectionInput { SectionType = "WarmUp", OrderIndex = 0, Notes = "First WarmUp." },
                new SectionInput { SectionType = "Practice", OrderIndex = 1, Notes = "First Practice." },
            ]
        };
        await client.PutAsJsonAsync($"/api/lessons/{created.Id}/sections", firstSections);

        // Replace with new set
        var newSections = new UpdateLessonSectionsRequest
        {
            Sections =
            [
                new SectionInput { SectionType = "Presentation", OrderIndex = 0, Notes = "New Presentation." },
            ]
        };
        var response = await client.PutAsJsonAsync($"/api/lessons/{created.Id}/sections", newSections);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var lesson = await response.Content.ReadFromJsonAsync<LessonDto>();
        lesson!.Sections.Should().HaveCount(1);
        lesson.Sections[0].SectionType.Should().Be("Presentation");
        lesson.Sections[0].Notes.Should().Be("New Presentation.");
    }

    [Fact]
    public async Task DeleteLesson_SoftDeletes()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|lesson-delete", "lesson-delete@example.com");

        var created = await CreateLessonAsync(client, "To Delete Lesson");

        var deleteResponse = await client.DeleteAsync($"/api/lessons/{created.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getResponse = await client.GetAsync($"/api/lessons/{created.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DuplicateLesson_ReturnsDraftCopy()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|lesson-dup", "lesson-dup@example.com");

        var created = await CreateLessonAsync(client, "Original for Dup");

        // Add sections — capture the response to record original section IDs
        var sectionsRequest = new UpdateLessonSectionsRequest
        {
            Sections = [new SectionInput { SectionType = "WarmUp", OrderIndex = 0, Notes = "Opener." }]
        };
        var sectionsResponse = await client.PutAsJsonAsync($"/api/lessons/{created.Id}/sections", sectionsRequest);
        var lessonWithSections = await sectionsResponse.Content.ReadFromJsonAsync<LessonDto>();
        var originalSectionId = lessonWithSections!.Sections[0].Id;

        var updateRequest = new UpdateLessonRequest
        {
            Title = created.Title,
            Language = created.Language,
            CefrLevel = created.CefrLevel,
            Topic = created.Topic,
            DurationMinutes = created.DurationMinutes,
            Status = "Published",
        };
        await client.PutAsJsonAsync($"/api/lessons/{created.Id}", updateRequest);

        var dupResponse = await client.PostAsync($"/api/lessons/{created.Id}/duplicate", null);

        dupResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var copy = await dupResponse.Content.ReadFromJsonAsync<LessonDto>();
        copy!.Id.Should().NotBe(created.Id);
        copy.Title.Should().Be($"Copy of {created.Title}");
        copy.Status.Should().Be("Draft");
        copy.Sections.Should().HaveCount(1);
        copy.Sections[0].SectionType.Should().Be("WarmUp");
        copy.Sections[0].Id.Should().NotBe(originalSectionId);
        copy.Sections[0].Id.Should().NotBe(Guid.Empty);
    }

    [Fact]
    public async Task ListLessons_FilterByStatus()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|lesson-filter-status", "lesson-filter-status@example.com");

        var draft = await CreateLessonAsync(client, "Draft Lesson Status");
        var published = await CreateLessonAsync(client, "Published Lesson Status");

        // Publish second lesson
        var updateRequest = new UpdateLessonRequest
        {
            Title = published.Title,
            Language = published.Language,
            CefrLevel = published.CefrLevel,
            Topic = published.Topic,
            DurationMinutes = published.DurationMinutes,
            Status = "Published",
        };
        await client.PutAsJsonAsync($"/api/lessons/{published.Id}", updateRequest);

        var response = await client.GetAsync("/api/lessons?status=Draft");
        var result = await response.Content.ReadFromJsonAsync<PagedResult<LessonDto>>();

        result!.Items.Should().OnlyContain(l => l.Status == "Draft");
        result.Items.Should().Contain(l => l.Id == draft.Id);
        result.Items.Should().NotContain(l => l.Id == published.Id);
    }

    [Fact]
    public async Task ListLessons_SearchByTitle()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|lesson-search", "lesson-search@example.com");

        await CreateLessonAsync(client, "Unique XYZ Title Search");
        await CreateLessonAsync(client, "Another Lesson Search");

        var response = await client.GetAsync("/api/lessons?search=XYZ");
        var result = await response.Content.ReadFromJsonAsync<PagedResult<LessonDto>>();

        result!.Items.Should().HaveCount(1);
        result.Items[0].Title.Should().Contain("XYZ");
    }

    [Fact]
    public async Task CreateLesson_WithScheduledAt_FiltersByDateRange()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|lesson-sched", "lesson-sched@example.com");

        var scheduledDate = new DateTime(2026, 4, 15, 10, 0, 0, DateTimeKind.Utc);
        var request = new CreateLessonRequest
        {
            Title = "Scheduled Lesson",
            Language = "English",
            CefrLevel = "B1",
            Topic = "Conditionals",
            DurationMinutes = 60,
            ScheduledAt = scheduledDate,
        };
        var createResponse = await client.PostAsJsonAsync("/api/lessons", request);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<LessonDto>();
        created!.ScheduledAt.Should().Be(scheduledDate);

        // Filter within range: should find it
        var inRange = await client.GetAsync("/api/lessons?scheduledFrom=2026-04-14T00:00:00&scheduledTo=2026-04-16T00:00:00");
        var inResult = await inRange.Content.ReadFromJsonAsync<PagedResult<LessonDto>>();
        inResult!.Items.Should().Contain(l => l.Id == created.Id);

        // Filter outside range: should not find it
        var outRange = await client.GetAsync("/api/lessons?scheduledFrom=2026-05-01T00:00:00&scheduledTo=2026-05-07T00:00:00");
        var outResult = await outRange.Content.ReadFromJsonAsync<PagedResult<LessonDto>>();
        outResult!.Items.Should().NotContain(l => l.Id == created.Id);
    }

    [Fact]
    public async Task GetLesson_IncludesStudentName()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = "auth0|lesson-studname",
            Email = "lesson-studname@example.com",
            DisplayName = "Student Name Test",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);

        var student = new Student
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            Name = "Alice Johnson",
            LearningLanguage = "English",
            CefrLevel = "B1",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Students.Add(student);
        await db.SaveChangesAsync();

        var client = _factory.CreateAuthenticatedClient("auth0|lesson-studname", "lesson-studname@example.com");

        var request = new CreateLessonRequest
        {
            Title = "StudentName Test Lesson",
            Language = "English",
            CefrLevel = "B1",
            Topic = "Test",
            DurationMinutes = 60,
            StudentId = student.Id,
        };
        var createResponse = await client.PostAsJsonAsync("/api/lessons", request);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<LessonDto>();

        var getResponse = await client.GetAsync($"/api/lessons/{created!.Id}");
        getResponse.EnsureSuccessStatusCode();
        var lesson = await getResponse.Content.ReadFromJsonAsync<LessonDto>();
        lesson!.StudentName.Should().Be("Alice Johnson");
    }

    private static async Task<LessonDto> CreateLessonAsync(
        HttpClient client,
        string title,
        string language = "English",
        string level = "B1")
    {
        var request = new CreateLessonRequest
        {
            Title = title,
            Language = language,
            CefrLevel = level,
            Topic = "Test topic",
            DurationMinutes = 60,
        };
        var response = await client.PostAsJsonAsync("/api/lessons", request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<LessonDto>())!;
    }
}
