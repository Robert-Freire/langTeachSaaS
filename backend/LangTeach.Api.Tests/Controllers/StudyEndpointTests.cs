using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Tests.Fixtures;
using LangTeach.Api.Tests.Helpers;
using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Tests.Controllers;

[Collection("ApiTests")]
public class StudyEndpointTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public StudyEndpointTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private async Task<(Guid teacherId, Guid lessonId, Guid sectionId)> SeedLessonWithBlockAndSection(
        string auth0Id, string email, string generatedContent, ContentBlockType blockType)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = auth0Id,
            Email = email,
            DisplayName = "Study Test Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);

        var lesson = new Lesson
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            Title = "Study Test Lesson",
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
            Notes = "Section notes here.",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.LessonSections.Add(section);

        var block = new LessonContentBlock
        {
            Id = Guid.NewGuid(),
            LessonId = lesson.Id,
            LessonSectionId = section.Id,
            BlockType = blockType,
            GeneratedContent = generatedContent,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.LessonContentBlocks.Add(block);

        await db.SaveChangesAsync();
        return (teacher.Id, lesson.Id, section.Id);
    }

    [Fact]
    public async Task GetStudy_ReturnsNestedLessonSectionsAndBlocks()
    {
        var auth0Id = "auth0|study-ok";
        var email = "study-ok@example.com";
        var jsonContent = "{\"items\":[{\"word\":\"travel\",\"definition\":\"to go somewhere\"}]}";
        var (_, lessonId, _) = await SeedLessonWithBlockAndSection(auth0Id, email, jsonContent, ContentBlockType.Vocabulary);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var response = await client.GetAsync($"/api/lessons/{lessonId}/study");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<StudyLessonDto>(TestJsonOptions.Default);
        dto.Should().NotBeNull();
        dto!.Title.Should().Be("Study Test Lesson");
        dto.Language.Should().Be("English");
        dto.Sections.Should().HaveCount(1);
        dto.Sections[0].SectionType.Should().Be("Presentation");
        dto.Sections[0].Notes.Should().Be("Section notes here.");
        dto.Sections[0].Blocks.Should().HaveCount(1);
        dto.Sections[0].Blocks[0].BlockType.Should().Be(ContentBlockType.Vocabulary);
        dto.Sections[0].Blocks[0].ParsedContent.Should().NotBeNull();
        dto.Sections[0].Blocks[0].DisplayContent.Should().Be(jsonContent);
    }

    [Fact]
    public async Task GetStudy_WrongTeacher_Returns404()
    {
        var auth0Id = "auth0|study-owner";
        var email = "study-owner@example.com";
        var (_, lessonId, _) = await SeedLessonWithBlockAndSection(auth0Id, email, "content", ContentBlockType.Grammar);

        var otherClient = _factory.CreateAuthenticatedClient("auth0|study-other", "study-other@example.com");
        var response = await otherClient.GetAsync($"/api/lessons/{lessonId}/study");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetStudy_NonexistentLesson_Returns404()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|study-missing", "study-missing@example.com");
        var response = await client.GetAsync($"/api/lessons/{Guid.NewGuid()}/study");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
