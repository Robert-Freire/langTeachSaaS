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
public class SessionLogsStatusTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public SessionLogsStatusTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient client, Guid studentId)> SeedTeacherWithStudent(
        string auth0Id, string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = auth0Id,
            Email = email,
            DisplayName = "Status Test Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);

        var student = new Student
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            Name = "Status Test Student",
            LearningLanguage = "Spanish",
            CefrLevel = "B1",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Students.Add(student);
        await db.SaveChangesAsync();

        var client = _factory.CreateAuthenticatedClient(auth0Id, email);
        return (client, student.Id);
    }

    [Fact]
    public async Task CreateSession_WithStatusDraft_ReturnsDraftStatus()
    {
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|status-draft-create", "status-draft@example.com");

        var payload = new
        {
            actualContent = "Covered ser vs estar",
            previousHomeworkStatus = "NotApplicable",
            status = "Draft",
        };

        var response = await client.PostAsJsonAsync($"/api/students/{studentId}/sessions", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("statusName").GetString().Should().Be("Draft");
    }

    [Fact]
    public async Task CreateSession_WithoutStatus_ReturnsConfirmedByDefault()
    {
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|status-default-create", "status-default@example.com");

        var payload = new
        {
            actualContent = "Covered preterito indefinido",
            previousHomeworkStatus = "NotApplicable",
        };

        var response = await client.PostAsJsonAsync($"/api/students/{studentId}/sessions", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("statusName").GetString().Should().Be("Confirmed");
    }
}
