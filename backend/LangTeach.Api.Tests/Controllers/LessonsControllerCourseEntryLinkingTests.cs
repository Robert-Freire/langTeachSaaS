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
public class LessonsControllerCourseEntryLinkingTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public LessonsControllerCourseEntryLinkingTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private async Task<(Guid teacherId, Guid courseId, Guid entryId)> SeedCourseWithEntry(
        string auth0Id, string email)
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
                DisplayName = "Link Tester",
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
        var entryId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        db.Courses.Add(new Course
        {
            Id = courseId,
            TeacherId = teacherId,
            Name = "Linking Test Course",
            Language = "Spanish",
            Mode = "general",
            TargetCefrLevel = "B1",
            SessionCount = 1,
            CreatedAt = now,
            UpdatedAt = now,
        });

        db.CurriculumEntries.Add(new CurriculumEntry
        {
            Id = entryId,
            CourseId = courseId,
            OrderIndex = 1,
            Topic = "Daily Routines",
            GrammarFocus = "Present simple",
            Competencies = "speaking,listening",
            Status = "planned",
        });

        await db.SaveChangesAsync();
        return (teacherId, courseId, entryId);
    }

    [Fact]
    public async Task CreateLesson_WithCourseEntryIds_LinksEntryAndSetsStatusCreated()
    {
        var auth0Id = "auth0|lesson-link-1";
        var email = "lesson-link-1@example.com";
        var (_, courseId, entryId) = await SeedCourseWithEntry(auth0Id, email);

        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var request = new CreateLessonRequest
        {
            Title = "Daily Routines Lesson",
            Language = "Spanish",
            CefrLevel = "B1",
            Topic = "Daily Routines",
            DurationMinutes = 60,
            CourseId = courseId,
            CourseEntryId = entryId,
        };

        var response = await client.PostAsJsonAsync("/api/lessons", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var lesson = await response.Content.ReadFromJsonAsync<LessonDto>();
        lesson.Should().NotBeNull();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var entry = db.CurriculumEntries.First(e => e.Id == entryId);
        entry.LessonId.Should().Be(lesson!.Id);
        entry.Status.Should().Be("created");
    }

    [Fact]
    public async Task CreateLesson_WithInvalidCourseEntryId_StillCreatesLessonGracefully()
    {
        var auth0Id = "auth0|lesson-link-2";
        var email = "lesson-link-2@example.com";
        var (_, courseId, _) = await SeedCourseWithEntry(auth0Id, email);

        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var request = new CreateLessonRequest
        {
            Title = "Orphan Lesson",
            Language = "Spanish",
            CefrLevel = "B1",
            Topic = "Something",
            DurationMinutes = 45,
            CourseId = courseId,
            CourseEntryId = Guid.NewGuid(), // non-existent entry
        };

        var response = await client.PostAsJsonAsync("/api/lessons", request);

        // Lesson should still be created even if entry linking fails
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateLesson_WithoutCourseParams_CreatesLessonWithoutLinking()
    {
        var auth0Id = "auth0|lesson-link-3";
        var email = "lesson-link-3@example.com";

        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var request = new CreateLessonRequest
        {
            Title = "Standalone Lesson",
            Language = "French",
            CefrLevel = "A2",
            Topic = "Greetings",
            DurationMinutes = 30,
        };

        var response = await client.PostAsJsonAsync("/api/lessons", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var lesson = await response.Content.ReadFromJsonAsync<LessonDto>();
        lesson!.Title.Should().Be("Standalone Lesson");
    }
}
