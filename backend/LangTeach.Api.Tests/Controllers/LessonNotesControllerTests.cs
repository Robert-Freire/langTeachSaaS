using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Fixtures;
using LangTeach.Api.Tests.Helpers;
using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Tests.Controllers;

[Collection("ApiTests")]
public class LessonNotesControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public LessonNotesControllerTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient client, Guid lessonId, Guid studentId)> SeedLessonWithStudent(
        string auth0Id, string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = auth0Id,
            Email = email,
            DisplayName = "Notes Test Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);

        var student = new Student
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            Name = "Notes Test Student",
            LearningLanguage = "English",
            CefrLevel = "B1",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Students.Add(student);

        var lesson = new Lesson
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            StudentId = student.Id,
            Title = "Notes Test Lesson",
            Language = "English",
            CefrLevel = "B1",
            Topic = "Grammar",
            DurationMinutes = 45,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Lessons.Add(lesson);
        await db.SaveChangesAsync();

        var client = _factory.CreateAuthenticatedClient(auth0Id, email);
        return (client, lesson.Id, student.Id);
    }

    [Fact]
    public async Task GetNotes_ReturnsNoContent_WhenNoNotesExist()
    {
        var (client, lessonId, _) = await SeedLessonWithStudent(
            "auth0|notes-get-empty", "notes-get-empty@example.com");

        var response = await client.GetAsync($"/api/lessons/{lessonId}/notes");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task PutNotes_ReturnsOk_AndGetReturnsSameData()
    {
        var (client, lessonId, _) = await SeedLessonWithStudent(
            "auth0|notes-put-get", "notes-put-get@example.com");

        var request = new SaveLessonNotesRequest
        {
            WhatWasCovered = "Past tense verbs",
            HomeworkAssigned = "Exercises 1-5",
            AreasToImprove = "Irregular verbs",
            NextLessonIdeas = "Present perfect",
        };

        var putResponse = await client.PutAsJsonAsync($"/api/lessons/{lessonId}/notes", request);
        putResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var putDto = await putResponse.Content.ReadFromJsonAsync<LessonNotesDto>();
        putDto!.WhatWasCovered.Should().Be("Past tense verbs");
        putDto.HomeworkAssigned.Should().Be("Exercises 1-5");

        var getResponse = await client.GetAsync($"/api/lessons/{lessonId}/notes");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var getDto = await getResponse.Content.ReadFromJsonAsync<LessonNotesDto>();
        getDto!.WhatWasCovered.Should().Be("Past tense verbs");
        getDto.AreasToImprove.Should().Be("Irregular verbs");
        getDto.NextLessonIdeas.Should().Be("Present perfect");
    }

    [Fact]
    public async Task PutNotes_OnLessonWithoutStudent_ReturnsBadRequest()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = "auth0|notes-no-student",
            Email = "notes-no-student@example.com",
            DisplayName = "No Student Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);

        var lesson = new Lesson
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            StudentId = null,
            Title = "No Student Lesson",
            Language = "English",
            CefrLevel = "A1",
            Topic = "Test",
            DurationMinutes = 30,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Lessons.Add(lesson);
        await db.SaveChangesAsync();

        var client = _factory.CreateAuthenticatedClient("auth0|notes-no-student", "notes-no-student@example.com");
        var request = new SaveLessonNotesRequest { WhatWasCovered = "Something" };

        var response = await client.PutAsJsonAsync($"/api/lessons/{lesson.Id}/notes", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task LessonHistory_ReturnsOrderedEntries()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = "auth0|notes-history",
            Email = "notes-history@example.com",
            DisplayName = "History Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);

        var student = new Student
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            Name = "History Student",
            LearningLanguage = "Spanish",
            CefrLevel = "A2",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Students.Add(student);

        var lesson1 = new Lesson
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            StudentId = student.Id,
            Title = "Older Lesson",
            Language = "Spanish",
            CefrLevel = "A2",
            Topic = "Greetings",
            DurationMinutes = 45,
            CreatedAt = DateTime.UtcNow.AddDays(-2),
            UpdatedAt = DateTime.UtcNow.AddDays(-2),
        };

        var lesson2 = new Lesson
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            StudentId = student.Id,
            Title = "Newer Lesson",
            Language = "Spanish",
            CefrLevel = "A2",
            Topic = "Numbers",
            DurationMinutes = 45,
            ScheduledAt = DateTime.UtcNow.AddDays(-1),
            CreatedAt = DateTime.UtcNow.AddDays(-3),
            UpdatedAt = DateTime.UtcNow.AddDays(-1),
        };

        db.Lessons.AddRange(lesson1, lesson2);

        db.LessonNotes.AddRange(
            new LessonNote
            {
                Id = Guid.NewGuid(),
                LessonId = lesson1.Id,
                StudentId = student.Id,
                TeacherId = teacher.Id,
                WhatWasCovered = "Basic greetings",
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                UpdatedAt = DateTime.UtcNow.AddDays(-2),
            },
            new LessonNote
            {
                Id = Guid.NewGuid(),
                LessonId = lesson2.Id,
                StudentId = student.Id,
                TeacherId = teacher.Id,
                WhatWasCovered = "Numbers 1-20",
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                UpdatedAt = DateTime.UtcNow.AddDays(-1),
            }
        );

        await db.SaveChangesAsync();

        var client = _factory.CreateAuthenticatedClient("auth0|notes-history", "notes-history@example.com");

        var response = await client.GetAsync($"/api/students/{student.Id}/lesson-history");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var entries = await response.Content.ReadFromJsonAsync<List<LessonHistoryEntryDto>>();
        entries.Should().HaveCount(2);
        entries![0].Title.Should().Be("Newer Lesson");
        entries[1].Title.Should().Be("Older Lesson");
    }

    [Fact]
    public async Task LessonHistory_IncludesTemplateName()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = "auth0|notes-template",
            Email = "notes-template@example.com",
            DisplayName = "Template Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);

        var student = new Student
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            Name = "Template Student",
            LearningLanguage = "English",
            CefrLevel = "B1",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Students.Add(student);

        var template = new LessonTemplate
        {
            Id = Guid.NewGuid(),
            Name = "Grammar Focus",
            Description = "Template for grammar lessons",
            DefaultSections = "[]",
        };
        db.LessonTemplates.Add(template);

        var lesson = new Lesson
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            StudentId = student.Id,
            TemplateId = template.Id,
            Title = "Templated Lesson",
            Language = "English",
            CefrLevel = "B1",
            Topic = "Verbs",
            DurationMinutes = 45,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Lessons.Add(lesson);

        db.LessonNotes.Add(new LessonNote
        {
            Id = Guid.NewGuid(),
            LessonId = lesson.Id,
            StudentId = student.Id,
            TeacherId = teacher.Id,
            WhatWasCovered = "Verb conjugations",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        await db.SaveChangesAsync();

        var client = _factory.CreateAuthenticatedClient("auth0|notes-template", "notes-template@example.com");
        var response = await client.GetAsync($"/api/students/{student.Id}/lesson-history");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var entries = await response.Content.ReadFromJsonAsync<List<LessonHistoryEntryDto>>();
        entries.Should().HaveCount(1);
        entries![0].TemplateName.Should().Be("Grammar Focus");
    }

    private HttpClient CreateClientWithFakeExtraction(string auth0Id, string email, ExtractedReflectionDto result)
    {
        var client = _factory
            .WithWebHostBuilder(b => b.ConfigureServices(services =>
            {
                var existing = services.FirstOrDefault(d => d.ServiceType == typeof(IReflectionExtractionService));
                if (existing is not null) services.Remove(existing);
                services.AddScoped<IReflectionExtractionService>(_ => new StubReflectionExtractionService(result));
            }))
            .CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Auth0Id", auth0Id);
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        return client;
    }

    [Fact]
    public async Task ExtractNotes_ReturnsExtractedFields()
    {
        var (_, lessonId, _) = await SeedLessonWithStudent(
            "auth0|notes-extract", "notes-extract@example.com");

        var expected = new ExtractedReflectionDto(
            WhatWasCovered: "Past tense verbs",
            AreasToImprove: "Irregular verbs confusion",
            EmotionalSignals: "Student was engaged and enthusiastic",
            HomeworkAssigned: "Exercises 1-5",
            NextLessonIdeas: "Present perfect"
        );

        var client = CreateClientWithFakeExtraction("auth0|notes-extract", "notes-extract@example.com", expected);

        var request = new ExtractReflectionRequest { Text = "We covered past tense today. Student got confused on irregulars but was very enthusiastic." };
        var response = await client.PostAsJsonAsync($"/api/lessons/{lessonId}/notes/extract", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<ExtractedReflectionDto>();
        dto!.WhatWasCovered.Should().Be("Past tense verbs");
        dto.AreasToImprove.Should().Be("Irregular verbs confusion");
        dto.EmotionalSignals.Should().Be("Student was engaged and enthusiastic");
        dto.HomeworkAssigned.Should().Be("Exercises 1-5");
        dto.NextLessonIdeas.Should().Be("Present perfect");
    }

    [Fact]
    public async Task ExtractNotes_RequiresText()
    {
        var (client, lessonId, _) = await SeedLessonWithStudent(
            "auth0|notes-extract-empty", "notes-extract-empty@example.com");

        var request = new { text = "" };
        var response = await client.PostAsJsonAsync($"/api/lessons/{lessonId}/notes/extract", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PutNotes_IncludesEmotionalSignals()
    {
        var (client, lessonId, _) = await SeedLessonWithStudent(
            "auth0|notes-emotional", "notes-emotional@example.com");

        var request = new SaveLessonNotesRequest
        {
            WhatWasCovered = "Ser vs Estar",
            EmotionalSignals = "Student was frustrated but persevered",
        };

        var putResponse = await client.PutAsJsonAsync($"/api/lessons/{lessonId}/notes", request);
        putResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await putResponse.Content.ReadFromJsonAsync<LessonNotesDto>();
        dto!.EmotionalSignals.Should().Be("Student was frustrated but persevered");

        var getResponse = await client.GetAsync($"/api/lessons/{lessonId}/notes");
        var getDto = await getResponse.Content.ReadFromJsonAsync<LessonNotesDto>();
        getDto!.EmotionalSignals.Should().Be("Student was frustrated but persevered");
    }

    [Fact]
    public async Task CrossTeacherIsolation_CannotAccessOtherTeacherNotes()
    {
        var (_, lessonId, _) = await SeedLessonWithStudent(
            "auth0|notes-teacher-a", "notes-teacher-a@example.com");

        var clientA = _factory.CreateAuthenticatedClient("auth0|notes-teacher-a", "notes-teacher-a@example.com");
        var putRequest = new SaveLessonNotesRequest { WhatWasCovered = "Teacher A notes" };
        var putResponse = await clientA.PutAsJsonAsync($"/api/lessons/{lessonId}/notes", putRequest);
        putResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var clientB = _factory.CreateAuthenticatedClient("auth0|notes-teacher-b", "notes-teacher-b@example.com");
        var getResponse = await clientB.GetAsync($"/api/lessons/{lessonId}/notes");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
