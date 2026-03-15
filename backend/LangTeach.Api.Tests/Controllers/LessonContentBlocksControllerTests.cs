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
public class LessonContentBlocksControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public LessonContentBlocksControllerTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private async Task<(Guid lessonId, Guid sectionId)> SeedTeacherLessonAndSection(
        string auth0Id, string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = auth0Id,
            Email = email,
            DisplayName = "Test Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);

        var lesson = new Lesson
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            Title = "Content Block Test Lesson",
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
            Notes = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.LessonSections.Add(section);

        await db.SaveChangesAsync();
        return (lesson.Id, section.Id);
    }

    [Fact]
    public async Task Post_CreatesBlockWithoutSection_Returns201()
    {
        var auth0Id = "auth0|cb-post-no-section";
        var email = "cb-post-no-section@example.com";
        var (lessonId, _) = await SeedTeacherLessonAndSection(auth0Id, email);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var request = new SaveContentBlockRequest
        {
            LessonSectionId = null,
            BlockType = ContentBlockType.Vocabulary,
            GeneratedContent = "Word: travel. Definition: to go somewhere.",
            GenerationParams = null,
        };

        var response = await client.PostAsJsonAsync($"/api/lessons/{lessonId}/content-blocks", request, TestJsonOptions.Default);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var dto = await response.Content.ReadFromJsonAsync<ContentBlockDto>(TestJsonOptions.Default);
        dto.Should().NotBeNull();
        dto!.BlockType.Should().Be(ContentBlockType.Vocabulary);
        dto.GeneratedContent.Should().Be("Word: travel. Definition: to go somewhere.");
        dto.LessonSectionId.Should().BeNull();
        dto.EditedContent.Should().BeNull();
        dto.IsEdited.Should().BeFalse();
        dto.Id.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Post_CreatesBlockLinkedToSection_Returns201()
    {
        var auth0Id = "auth0|cb-post-with-section";
        var email = "cb-post-with-section@example.com";
        var (lessonId, sectionId) = await SeedTeacherLessonAndSection(auth0Id, email);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var request = new SaveContentBlockRequest
        {
            LessonSectionId = sectionId,
            BlockType = ContentBlockType.Vocabulary,
            GeneratedContent = "Generated vocabulary content.",
            GenerationParams = "{\"lessonId\":\"test\"}",
        };

        var response = await client.PostAsJsonAsync($"/api/lessons/{lessonId}/content-blocks", request, TestJsonOptions.Default);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var dto = await response.Content.ReadFromJsonAsync<ContentBlockDto>(TestJsonOptions.Default);
        dto!.LessonSectionId.Should().Be(sectionId);
    }

    [Fact]
    public async Task Post_InvalidBlockType_Returns400()
    {
        var auth0Id = "auth0|cb-post-invalid-type";
        var email = "cb-post-invalid-type@example.com";
        var (lessonId, _) = await SeedTeacherLessonAndSection(auth0Id, email);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        // Send raw JSON with an unrecognized block type string
        var content = new StringContent(
            "{\"blockType\":\"not-a-real-type\",\"generatedContent\":\"x\"}",
            System.Text.Encoding.UTF8,
            "application/json");

        var response = await client.PostAsync($"/api/lessons/{lessonId}/content-blocks", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Get_ReturnsAllBlocksInOrder()
    {
        var auth0Id = "auth0|cb-get-list";
        var email = "cb-get-list@example.com";
        var (lessonId, _) = await SeedTeacherLessonAndSection(auth0Id, email);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var req1 = new SaveContentBlockRequest { BlockType = ContentBlockType.Vocabulary, GeneratedContent = "First block." };
        var req2 = new SaveContentBlockRequest { BlockType = ContentBlockType.Grammar, GeneratedContent = "Second block." };
        await client.PostAsJsonAsync($"/api/lessons/{lessonId}/content-blocks", req1, TestJsonOptions.Default);
        await client.PostAsJsonAsync($"/api/lessons/{lessonId}/content-blocks", req2, TestJsonOptions.Default);

        var response = await client.GetAsync($"/api/lessons/{lessonId}/content-blocks");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var blocks = await response.Content.ReadFromJsonAsync<ContentBlockDto[]>(TestJsonOptions.Default);
        blocks.Should().HaveCount(2);
        blocks![0].BlockType.Should().Be(ContentBlockType.Vocabulary);
        blocks[1].BlockType.Should().Be(ContentBlockType.Grammar);
    }

    [Fact]
    public async Task Get_ReturnsParsedContentForJsonBlocks()
    {
        var auth0Id = "auth0|cb-get-parsed";
        var email = "cb-get-parsed@example.com";
        var (lessonId, _) = await SeedTeacherLessonAndSection(auth0Id, email);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var jsonContent = "{\"items\":[{\"word\":\"travel\",\"definition\":\"to go somewhere\"}]}";
        var req = new SaveContentBlockRequest { BlockType = ContentBlockType.Vocabulary, GeneratedContent = jsonContent };
        await client.PostAsJsonAsync($"/api/lessons/{lessonId}/content-blocks", req, TestJsonOptions.Default);

        var response = await client.GetAsync($"/api/lessons/{lessonId}/content-blocks");
        var blocks = await response.Content.ReadFromJsonAsync<ContentBlockDto[]>(TestJsonOptions.Default);

        blocks.Should().HaveCount(1);
        blocks![0].ParsedContent.Should().NotBeNull();
    }

    [Fact]
    public async Task Get_ReturnsNullParsedContentForNonJsonBlocks()
    {
        var auth0Id = "auth0|cb-get-noparsed";
        var email = "cb-get-noparsed@example.com";
        var (lessonId, _) = await SeedTeacherLessonAndSection(auth0Id, email);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var req = new SaveContentBlockRequest { BlockType = ContentBlockType.Grammar, GeneratedContent = "This is plain text, not JSON." };
        await client.PostAsJsonAsync($"/api/lessons/{lessonId}/content-blocks", req, TestJsonOptions.Default);

        var response = await client.GetAsync($"/api/lessons/{lessonId}/content-blocks");
        var blocks = await response.Content.ReadFromJsonAsync<ContentBlockDto[]>(TestJsonOptions.Default);

        blocks.Should().HaveCount(1);
        blocks![0].ParsedContent.Should().BeNull();
    }

    [Fact]
    public async Task Get_WrongTeacher_Returns404()
    {
        var auth0Id = "auth0|cb-get-owner";
        var email = "cb-get-owner@example.com";
        var (lessonId, _) = await SeedTeacherLessonAndSection(auth0Id, email);

        var otherClient = _factory.CreateAuthenticatedClient("auth0|cb-get-other", "cb-get-other@example.com");

        var response = await otherClient.GetAsync($"/api/lessons/{lessonId}/content-blocks");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PutEditedContent_UpdatesContentAndSetsIsEdited()
    {
        var auth0Id = "auth0|cb-put-edit";
        var email = "cb-put-edit@example.com";
        var (lessonId, _) = await SeedTeacherLessonAndSection(auth0Id, email);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var created = await (await client.PostAsJsonAsync(
            $"/api/lessons/{lessonId}/content-blocks",
            new SaveContentBlockRequest { BlockType = ContentBlockType.Vocabulary, GeneratedContent = "Original." },
            TestJsonOptions.Default
        )).Content.ReadFromJsonAsync<ContentBlockDto>(TestJsonOptions.Default);

        var editRequest = new UpdateEditedContentRequest { EditedContent = "Teacher edited this." };
        var response = await client.PutAsJsonAsync(
            $"/api/lessons/{lessonId}/content-blocks/{created!.Id}/edited-content",
            editRequest);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<ContentBlockDto>(TestJsonOptions.Default);
        updated!.EditedContent.Should().Be("Teacher edited this.");
        updated.IsEdited.Should().BeTrue();
        updated.GeneratedContent.Should().Be("Original.");
    }

    [Fact]
    public async Task PutEditedContent_WrongTeacher_Returns404()
    {
        var auth0Id = "auth0|cb-put-owner";
        var email = "cb-put-owner@example.com";
        var (lessonId, _) = await SeedTeacherLessonAndSection(auth0Id, email);
        var ownerClient = _factory.CreateAuthenticatedClient(auth0Id, email);

        var created = await (await ownerClient.PostAsJsonAsync(
            $"/api/lessons/{lessonId}/content-blocks",
            new SaveContentBlockRequest { BlockType = ContentBlockType.Vocabulary, GeneratedContent = "Content." },
            TestJsonOptions.Default
        )).Content.ReadFromJsonAsync<ContentBlockDto>(TestJsonOptions.Default);

        var otherClient = _factory.CreateAuthenticatedClient("auth0|cb-put-other", "cb-put-other@example.com");
        var response = await otherClient.PutAsJsonAsync(
            $"/api/lessons/{lessonId}/content-blocks/{created!.Id}/edited-content",
            new UpdateEditedContentRequest { EditedContent = "Hack attempt." });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_Returns204AndBlockGone()
    {
        var auth0Id = "auth0|cb-delete-ok";
        var email = "cb-delete-ok@example.com";
        var (lessonId, _) = await SeedTeacherLessonAndSection(auth0Id, email);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var created = await (await client.PostAsJsonAsync(
            $"/api/lessons/{lessonId}/content-blocks",
            new SaveContentBlockRequest { BlockType = ContentBlockType.Vocabulary, GeneratedContent = "To be deleted." },
            TestJsonOptions.Default
        )).Content.ReadFromJsonAsync<ContentBlockDto>(TestJsonOptions.Default);

        var deleteResponse = await client.DeleteAsync(
            $"/api/lessons/{lessonId}/content-blocks/{created!.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var listResponse = await client.GetAsync($"/api/lessons/{lessonId}/content-blocks");
        var blocks = await listResponse.Content.ReadFromJsonAsync<ContentBlockDto[]>(TestJsonOptions.Default);
        blocks.Should().NotContain(b => b.Id == created.Id);
    }

    [Fact]
    public async Task DeleteEditedContent_ClearsEditedContent_PreservesGenerated()
    {
        var auth0Id = "auth0|cb-reset-edit";
        var email = "cb-reset-edit@example.com";
        var (lessonId, _) = await SeedTeacherLessonAndSection(auth0Id, email);
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var created = await (await client.PostAsJsonAsync(
            $"/api/lessons/{lessonId}/content-blocks",
            new SaveContentBlockRequest { BlockType = ContentBlockType.Vocabulary, GeneratedContent = "Original AI content." },
            TestJsonOptions.Default
        )).Content.ReadFromJsonAsync<ContentBlockDto>(TestJsonOptions.Default);

        await client.PutAsJsonAsync(
            $"/api/lessons/{lessonId}/content-blocks/{created!.Id}/edited-content",
            new UpdateEditedContentRequest { EditedContent = "Teacher edits." });

        var resetResponse = await client.DeleteAsync(
            $"/api/lessons/{lessonId}/content-blocks/{created.Id}/edited-content");

        resetResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var reset = await resetResponse.Content.ReadFromJsonAsync<ContentBlockDto>(TestJsonOptions.Default);
        reset!.EditedContent.Should().BeNull();
        reset.IsEdited.Should().BeFalse();
        reset.GeneratedContent.Should().Be("Original AI content.");
    }
}
