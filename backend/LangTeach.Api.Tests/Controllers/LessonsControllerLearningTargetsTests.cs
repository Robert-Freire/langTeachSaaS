using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Tests.Fixtures;
using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Tests.Controllers;

[Collection("ApiTests")]
public class LessonsControllerLearningTargetsTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public LessonsControllerLearningTargetsTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private async Task<Guid> SeedLessonWithTargets(string auth0Id, string email, string[]? targets)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = auth0Id,
            Email = email,
            DisplayName = "LT Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);
        var lesson = new Lesson
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            Title = "LT Test Lesson",
            Language = "Spanish",
            CefrLevel = "B1",
            Topic = "Travel",
            DurationMinutes = 60,
            Status = "Draft",
            LearningTargets = targets is not null ? JsonSerializer.Serialize(targets) : null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Lessons.Add(lesson);
        await db.SaveChangesAsync();
        return lesson.Id;
    }

    [Fact]
    public async Task PutLearningTargets_SetsLabels_Returns200WithUpdatedLesson()
    {
        var auth0Id = "auth0|lt-put-1";
        var email = "lt-put-1@example.com";
        var lessonId = await SeedLessonWithTargets(auth0Id, email, null);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var request = new UpdateLearningTargetsRequest { LearningTargets = ["Subjunctive mood", "Speaking"] };
        var response = await client.PutAsJsonAsync($"/api/lessons/{lessonId}/learning-targets", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var lesson = await response.Content.ReadFromJsonAsync<LessonDto>();
        lesson!.LearningTargets.Should().BeEquivalentTo(["Subjunctive mood", "Speaking"]);
    }

    [Fact]
    public async Task PutLearningTargets_EmptyArray_ClearsLabels()
    {
        var auth0Id = "auth0|lt-put-2";
        var email = "lt-put-2@example.com";
        var lessonId = await SeedLessonWithTargets(auth0Id, email, ["Existing label"]);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var request = new UpdateLearningTargetsRequest { LearningTargets = [] };
        var response = await client.PutAsJsonAsync($"/api/lessons/{lessonId}/learning-targets", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var lesson = await response.Content.ReadFromJsonAsync<LessonDto>();
        lesson!.LearningTargets.Should().BeNullOrEmpty();
    }

    [Fact]
    public async Task PutLearningTargets_NullValue_ClearsLabels()
    {
        var auth0Id = "auth0|lt-put-3";
        var email = "lt-put-3@example.com";
        var lessonId = await SeedLessonWithTargets(auth0Id, email, ["Some label"]);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var request = new UpdateLearningTargetsRequest { LearningTargets = null };
        var response = await client.PutAsJsonAsync($"/api/lessons/{lessonId}/learning-targets", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var lesson = await response.Content.ReadFromJsonAsync<LessonDto>();
        lesson!.LearningTargets.Should().BeNullOrEmpty();
    }

    [Fact]
    public async Task PutLearningTargets_ForeignLesson_Returns404()
    {
        var auth0Id = "auth0|lt-put-4";
        var email = "lt-put-4@example.com";
        // Seed a lesson owned by another teacher
        var otherLessonId = await SeedLessonWithTargets("auth0|lt-other-owner", "lt-other@example.com", null);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var request = new UpdateLearningTargetsRequest { LearningTargets = ["Label"] };
        var response = await client.PutAsJsonAsync($"/api/lessons/{otherLessonId}/learning-targets", request);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetLesson_WithLearningTargets_ReturnsTargetsInDto()
    {
        var auth0Id = "auth0|lt-get-1";
        var email = "lt-get-1@example.com";
        var lessonId = await SeedLessonWithTargets(auth0Id, email, ["Grammar", "Speaking"]);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var response = await client.GetAsync($"/api/lessons/{lessonId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var lesson = await response.Content.ReadFromJsonAsync<LessonDto>();
        lesson!.LearningTargets.Should().BeEquivalentTo(["Grammar", "Speaking"]);
    }
}
