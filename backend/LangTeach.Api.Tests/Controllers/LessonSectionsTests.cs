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
public class LessonSectionsTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public LessonSectionsTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task UpdateSections_PreservesSectionIds_WhenUpdatingNotes()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|sec-upsert-preserve", "sec-upsert-preserve@example.com");
        var lesson = await CreateLessonAsync(client);

        // Create initial sections
        var initial = new UpdateLessonSectionsRequest
        {
            Sections =
            [
                new SectionInput { SectionType = "WarmUp", OrderIndex = 0, Notes = "Original warm up." },
                new SectionInput { SectionType = "Practice", OrderIndex = 1, Notes = "Original practice." },
            ]
        };
        var r1 = await client.PutAsJsonAsync($"/api/lessons/{lesson.Id}/sections", initial);
        r1.EnsureSuccessStatusCode();
        var first = await r1.Content.ReadFromJsonAsync<LessonDto>();
        var warmUpId = first!.Sections.First(s => s.SectionType == "WarmUp").Id;
        var practiceId = first.Sections.First(s => s.SectionType == "Practice").Id;

        // Update notes only (same section types)
        var update = new UpdateLessonSectionsRequest
        {
            Sections =
            [
                new SectionInput { SectionType = "WarmUp", OrderIndex = 0, Notes = "Updated warm up." },
                new SectionInput { SectionType = "Practice", OrderIndex = 1, Notes = "Updated practice." },
            ]
        };
        var r2 = await client.PutAsJsonAsync($"/api/lessons/{lesson.Id}/sections", update);
        r2.EnsureSuccessStatusCode();
        var second = await r2.Content.ReadFromJsonAsync<LessonDto>();

        // IDs should be preserved
        second!.Sections.First(s => s.SectionType == "WarmUp").Id.Should().Be(warmUpId);
        second.Sections.First(s => s.SectionType == "Practice").Id.Should().Be(practiceId);
        // Notes should be updated
        second.Sections.First(s => s.SectionType == "WarmUp").Notes.Should().Be("Updated warm up.");
        second.Sections.First(s => s.SectionType == "Practice").Notes.Should().Be("Updated practice.");
    }

    [Fact]
    public async Task UpdateSections_AddingNewType_CreatesWithoutAffectingExisting()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|sec-upsert-add", "sec-upsert-add@example.com");
        var lesson = await CreateLessonAsync(client);

        // Create initial sections
        var initial = new UpdateLessonSectionsRequest
        {
            Sections =
            [
                new SectionInput { SectionType = "WarmUp", OrderIndex = 0, Notes = "Warm up." },
            ]
        };
        var r1 = await client.PutAsJsonAsync($"/api/lessons/{lesson.Id}/sections", initial);
        r1.EnsureSuccessStatusCode();
        var first = await r1.Content.ReadFromJsonAsync<LessonDto>();
        var warmUpId = first!.Sections[0].Id;

        // Add a new section type
        var update = new UpdateLessonSectionsRequest
        {
            Sections =
            [
                new SectionInput { SectionType = "WarmUp", OrderIndex = 0, Notes = "Warm up." },
                new SectionInput { SectionType = "Presentation", OrderIndex = 1, Notes = "New presentation." },
            ]
        };
        var r2 = await client.PutAsJsonAsync($"/api/lessons/{lesson.Id}/sections", update);
        r2.EnsureSuccessStatusCode();
        var second = await r2.Content.ReadFromJsonAsync<LessonDto>();

        second!.Sections.Should().HaveCount(2);
        // Existing section ID preserved
        second.Sections.First(s => s.SectionType == "WarmUp").Id.Should().Be(warmUpId);
        // New section has a new ID
        var presentationId = second.Sections.First(s => s.SectionType == "Presentation").Id;
        presentationId.Should().NotBe(Guid.Empty);
        presentationId.Should().NotBe(warmUpId);
    }

    [Fact]
    public async Task UpdateSections_RemovingType_DeletesSectionAndContentBlocks()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|sec-upsert-remove", "sec-upsert-remove@example.com");
        var lesson = await CreateLessonAsync(client);

        // Create sections
        var initial = new UpdateLessonSectionsRequest
        {
            Sections =
            [
                new SectionInput { SectionType = "WarmUp", OrderIndex = 0, Notes = "Warm up." },
                new SectionInput { SectionType = "Practice", OrderIndex = 1, Notes = "Practice." },
            ]
        };
        var r1 = await client.PutAsJsonAsync($"/api/lessons/{lesson.Id}/sections", initial);
        r1.EnsureSuccessStatusCode();
        var first = await r1.Content.ReadFromJsonAsync<LessonDto>();
        var practiceId = first!.Sections.First(s => s.SectionType == "Practice").Id;

        // Seed a content block linked to the Practice section
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.LessonContentBlocks.Add(new LessonContentBlock
            {
                Id = Guid.NewGuid(),
                LessonId = lesson.Id,
                LessonSectionId = practiceId,
                BlockType = ContentBlockType.Vocabulary,
                GeneratedContent = "Test vocabulary content",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        // Remove Practice section
        var update = new UpdateLessonSectionsRequest
        {
            Sections =
            [
                new SectionInput { SectionType = "WarmUp", OrderIndex = 0, Notes = "Warm up." },
            ]
        };
        var r2 = await client.PutAsJsonAsync($"/api/lessons/{lesson.Id}/sections", update);
        r2.EnsureSuccessStatusCode();
        var second = await r2.Content.ReadFromJsonAsync<LessonDto>();

        second!.Sections.Should().HaveCount(1);
        second.Sections[0].SectionType.Should().Be("WarmUp");

        // Verify the content block was also removed
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var orphaned = db.LessonContentBlocks.Any(b => b.LessonSectionId == practiceId);
            orphaned.Should().BeFalse("content blocks for removed sections should be cleaned up");
        }
    }

    private static async Task<LessonDto> CreateLessonAsync(HttpClient client)
    {
        var request = new CreateLessonRequest
        {
            Title = $"Section Test {Guid.NewGuid():N}",
            Language = "English",
            CefrLevel = "B1",
            Topic = "Test topic",
            DurationMinutes = 60,
        };
        var response = await client.PostAsJsonAsync("/api/lessons", request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<LessonDto>())!;
    }
}
