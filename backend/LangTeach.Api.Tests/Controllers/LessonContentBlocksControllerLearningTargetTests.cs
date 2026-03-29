using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Tests.Fixtures;
using LangTeach.Api.Tests.Helpers;
using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Tests.Controllers;

[Collection("ApiTests")]
public class LessonContentBlocksControllerLearningTargetTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public LessonContentBlocksControllerLearningTargetTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private async Task<(Guid lessonId, Guid teacherId)> SeedTeacherAndLesson(string auth0Id, string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = auth0Id,
            Email = email,
            DisplayName = "LT Block Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);
        var lesson = new Lesson
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            Title = "LT Block Test Lesson",
            Language = "Spanish",
            CefrLevel = "B1",
            Topic = "Daily life",
            DurationMinutes = 60,
            Status = "Draft",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Lessons.Add(lesson);
        await db.SaveChangesAsync();
        return (lesson.Id, teacher.Id);
    }

    private async Task SeedCurriculumEntry(Guid lessonId, Guid courseId, string? grammarFocus, string competencies)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.CurriculumEntries.Add(new CurriculumEntry
        {
            Id = Guid.NewGuid(),
            CourseId = courseId,
            LessonId = lessonId,
            OrderIndex = 1,
            Topic = "Test topic",
            GrammarFocus = grammarFocus,
            Competencies = competencies,
            Status = "planned",
        });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task SaveBlock_WhenCurriculumEntryExists_DrivesLearningTargets()
    {
        var auth0Id = "auth0|lt-block-derive-1";
        var email = "lt-block-derive-1@example.com";
        var (lessonId, _) = await SeedTeacherAndLesson(auth0Id, email);
        var courseId = Guid.NewGuid();
        await SeedCurriculumEntry(lessonId, courseId, "Subjunctive mood", "speaking,writing");
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var request = new SaveContentBlockRequest
        {
            LessonSectionId = null,
            BlockType = ContentBlockType.Vocabulary,
            GeneratedContent = "Generated content.",
            GenerationParams = null,
        };
        await client.PostAsJsonAsync($"/api/lessons/{lessonId}/content-blocks", request, TestJsonOptions.Default);

        // Verify lesson now has learning targets set
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var lesson = await db.Lessons.FindAsync(lessonId);
        lesson!.LearningTargets.Should().NotBeNull();
        var targets = JsonSerializer.Deserialize<string[]>(lesson.LearningTargets!);
        targets.Should().Contain("Subjunctive mood");
        targets.Should().Contain("Speaking");
        targets.Should().Contain("Writing");
    }

    [Fact]
    public async Task SaveBlock_WhenNoCurriculumEntry_LeavesLearningTargetsNull()
    {
        var auth0Id = "auth0|lt-block-derive-2";
        var email = "lt-block-derive-2@example.com";
        var (lessonId, _) = await SeedTeacherAndLesson(auth0Id, email);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var request = new SaveContentBlockRequest
        {
            LessonSectionId = null,
            BlockType = ContentBlockType.Vocabulary,
            GeneratedContent = "Standalone content.",
            GenerationParams = null,
        };
        await client.PostAsJsonAsync($"/api/lessons/{lessonId}/content-blocks", request, TestJsonOptions.Default);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var lesson = await db.Lessons.FindAsync(lessonId);
        lesson!.LearningTargets.Should().BeNull();
    }

    [Fact]
    public async Task SaveBlock_WhenLearningTargetsAlreadySet_DoesNotOverwrite()
    {
        var auth0Id = "auth0|lt-block-derive-3";
        var email = "lt-block-derive-3@example.com";
        var (lessonId, _) = await SeedTeacherAndLesson(auth0Id, email);
        var courseId = Guid.NewGuid();
        await SeedCurriculumEntry(lessonId, courseId, "New grammar", "listening");

        // Manually set existing targets
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var lesson = await db.Lessons.FindAsync(lessonId);
            lesson!.LearningTargets = JsonSerializer.Serialize(new[] { "Existing target" });
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateAuthenticatedClient(auth0Id, email);
        var request = new SaveContentBlockRequest
        {
            LessonSectionId = null,
            BlockType = ContentBlockType.Vocabulary,
            GeneratedContent = "Content.",
            GenerationParams = null,
        };
        await client.PostAsJsonAsync($"/api/lessons/{lessonId}/content-blocks", request, TestJsonOptions.Default);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var updatedLesson = await verifyDb.Lessons.FindAsync(lessonId);
        var targets = JsonSerializer.Deserialize<string[]>(updatedLesson!.LearningTargets!);
        targets.Should().BeEquivalentTo(["Existing target"]);
    }
}
