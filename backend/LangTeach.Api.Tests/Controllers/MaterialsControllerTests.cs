using System.Net;
using System.Net.Http.Headers;
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
public class MaterialsControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public MaterialsControllerTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private async Task<(Guid lessonId, Guid sectionId)> SeedLessonWithSection(string auth0Id, string email)
    {
        var client = _factory.CreateAuthenticatedClient(auth0Id, email);

        var createReq = new CreateLessonRequest
        {
            Title = "Material Test Lesson",
            Language = "English",
            CefrLevel = "A1",
            Topic = "Materials",
            DurationMinutes = 30,
        };

        var createRes = await client.PostAsJsonAsync("/api/lessons", createReq);
        createRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var lesson = await createRes.Content.ReadFromJsonAsync<LessonDto>();

        // Add a section
        var sectionPayload = new { sections = new[] { new { sectionType = "WarmUp", orderIndex = 0, notes = (string?)null } } };
        var sectionRes = await client.PutAsJsonAsync($"/api/lessons/{lesson!.Id}/sections", sectionPayload);
        sectionRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await sectionRes.Content.ReadFromJsonAsync<LessonDto>();

        return (updated!.Id, updated.Sections[0].Id);
    }

    private static MultipartFormDataContent CreateFileContent(string fileName, string contentType, byte[]? content = null)
    {
        content ??= new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }; // PNG header
        var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(content);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(fileContent, "file", fileName);
        return form;
    }

    [Fact]
    public async Task Upload_ValidFile_ReturnsCreated()
    {
        var (lessonId, sectionId) = await SeedLessonWithSection("auth0|mat-upload", "mat-upload@example.com");
        var client = _factory.CreateAuthenticatedClient("auth0|mat-upload", "mat-upload@example.com");

        var form = CreateFileContent("test.png", "image/png");
        var res = await client.PostAsync($"/api/lessons/{lessonId}/sections/{sectionId}/materials", form);

        res.StatusCode.Should().Be(HttpStatusCode.Created);
        var material = await res.Content.ReadFromJsonAsync<MaterialDto>();
        material!.FileName.Should().Be("test.png");
        material.ContentType.Should().Be("image/png");
        material.PreviewUrl.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Upload_InvalidContentType_ReturnsBadRequest()
    {
        var (lessonId, sectionId) = await SeedLessonWithSection("auth0|mat-invalid", "mat-invalid@example.com");
        var client = _factory.CreateAuthenticatedClient("auth0|mat-invalid", "mat-invalid@example.com");

        var form = CreateFileContent("doc.txt", "text/plain", new byte[] { 0x48, 0x65, 0x6C, 0x6C, 0x6F });
        var res = await client.PostAsync($"/api/lessons/{lessonId}/sections/{sectionId}/materials", form);

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Upload_WrongTeacher_ReturnsBadRequest()
    {
        var (lessonId, sectionId) = await SeedLessonWithSection("auth0|mat-owner", "mat-owner@example.com");
        var client = _factory.CreateAuthenticatedClient("auth0|mat-other", "mat-other@example.com");

        var form = CreateFileContent("test.png", "image/png");
        var res = await client.PostAsync($"/api/lessons/{lessonId}/sections/{sectionId}/materials", form);

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Delete_ExistingMaterial_ReturnsNoContent()
    {
        var (lessonId, sectionId) = await SeedLessonWithSection("auth0|mat-delete", "mat-delete@example.com");
        var client = _factory.CreateAuthenticatedClient("auth0|mat-delete", "mat-delete@example.com");

        // Upload
        var form = CreateFileContent("delete-me.png", "image/png");
        var uploadRes = await client.PostAsync($"/api/lessons/{lessonId}/sections/{sectionId}/materials", form);
        var material = await uploadRes.Content.ReadFromJsonAsync<MaterialDto>();

        // Delete
        var deleteRes = await client.DeleteAsync($"/api/lessons/{lessonId}/sections/{sectionId}/materials/{material!.Id}");
        deleteRes.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify gone
        var listRes = await client.GetAsync($"/api/lessons/{lessonId}/sections/{sectionId}/materials");
        var list = await listRes.Content.ReadFromJsonAsync<List<MaterialDto>>();
        list.Should().BeEmpty();
    }

    [Fact]
    public async Task GetById_IncludesMaterialsInResponse()
    {
        var (lessonId, sectionId) = await SeedLessonWithSection("auth0|mat-getbyid", "mat-getbyid@example.com");
        var client = _factory.CreateAuthenticatedClient("auth0|mat-getbyid", "mat-getbyid@example.com");

        // Upload a file
        var form = CreateFileContent("included.png", "image/png");
        await client.PostAsync($"/api/lessons/{lessonId}/sections/{sectionId}/materials", form);

        // Get lesson detail
        var lessonRes = await client.GetAsync($"/api/lessons/{lessonId}");
        lessonRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var lesson = await lessonRes.Content.ReadFromJsonAsync<LessonDto>();
        lesson!.Sections.Should().HaveCount(1);
        lesson.Sections[0].Materials.Should().HaveCount(1);
        lesson.Sections[0].Materials[0].FileName.Should().Be("included.png");
        lesson.Sections[0].Materials[0].PreviewUrl.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Download_ExistingMaterial_ReturnsRedirect()
    {
        var (lessonId, sectionId) = await SeedLessonWithSection("auth0|mat-download", "mat-download@example.com");
        var client = _factory.CreateAuthenticatedClient("auth0|mat-download", "mat-download@example.com");

        // Don't follow redirects
        var noRedirectClient = _factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
        });
        noRedirectClient.DefaultRequestHeaders.Add("X-Test-Auth0Id", "auth0|mat-download");
        noRedirectClient.DefaultRequestHeaders.Add("X-Test-Email", "mat-download@example.com");

        // Upload
        var form = CreateFileContent("redirect.png", "image/png");
        var uploadRes = await client.PostAsync($"/api/lessons/{lessonId}/sections/{sectionId}/materials", form);
        var material = await uploadRes.Content.ReadFromJsonAsync<MaterialDto>();

        // Download
        var downloadRes = await noRedirectClient.GetAsync($"/api/lessons/{lessonId}/sections/{sectionId}/materials/{material!.Id}");
        downloadRes.StatusCode.Should().Be(HttpStatusCode.Redirect);
        downloadRes.Headers.Location.Should().NotBeNull();
    }
}
