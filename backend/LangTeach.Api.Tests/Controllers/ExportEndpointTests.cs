using System.Net;
using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Tests.Fixtures;
using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Tests.Controllers;

[Collection("ApiTests")]
public class ExportEndpointTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public ExportEndpointTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private async Task<(Guid teacherId, Guid lessonId)> SeedLessonWithContent(string auth0Id, string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = auth0Id,
            Email = email,
            DisplayName = "Export Test Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);

        var student = new Student
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            Name = "Test Student",
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
            Title = "Export Test Lesson",
            Language = "English",
            CefrLevel = "B1",
            Topic = "Travel",
            DurationMinutes = 60,
            Status = "Draft",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Lessons.Add(lesson);

        var section = new LessonSection
        {
            Id = Guid.NewGuid(),
            LessonId = lesson.Id,
            SectionType = "Presentation",
            OrderIndex = 1,
            Notes = "Teacher notes here.",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.LessonSections.Add(section);

        var vocabJson = """{"items":[{"word":"travel","definition":"to go somewhere","exampleSentence":"I travel a lot.","translation":"viajar"}]}""";
        var block = new LessonContentBlock
        {
            Id = Guid.NewGuid(),
            LessonId = lesson.Id,
            LessonSectionId = section.Id,
            BlockType = ContentBlockType.Vocabulary,
            GeneratedContent = vocabJson,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.LessonContentBlocks.Add(block);

        await db.SaveChangesAsync();
        return (teacher.Id, lesson.Id);
    }

    [Theory]
    [InlineData("teacher")]
    [InlineData("student")]
    public async Task ExportPdf_ReturnsValidPdf(string mode)
    {
        var auth0Id = $"auth0|export-{mode}";
        var email = $"export-{mode}@example.com";
        var (_, lessonId) = await SeedLessonWithContent(auth0Id, email);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var response = await client.GetAsync($"/api/lessons/{lessonId}/export/pdf?mode={mode}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
        var bytes = await response.Content.ReadAsByteArrayAsync();
        bytes.Length.Should().BeGreaterThan(0);
        // PDF files start with %PDF
        System.Text.Encoding.ASCII.GetString(bytes, 0, 4).Should().Be("%PDF");
    }

    [Fact]
    public async Task ExportPdf_NonexistentLesson_Returns404()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|export-missing", "export-missing@example.com");
        var response = await client.GetAsync($"/api/lessons/{Guid.NewGuid()}/export/pdf?mode=teacher");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ExportPdf_OtherTeacher_Returns404()
    {
        var auth0Id = "auth0|export-owner";
        var email = "export-owner@example.com";
        var (_, lessonId) = await SeedLessonWithContent(auth0Id, email);

        var otherClient = _factory.CreateAuthenticatedClient("auth0|export-other", "export-other@example.com");
        var response = await otherClient.GetAsync($"/api/lessons/{lessonId}/export/pdf?mode=teacher");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
