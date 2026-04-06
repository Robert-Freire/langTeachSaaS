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

    [Fact]
    public async Task CreateSession_Confirmed_WithSuggestedDifficulties_UpsertsToStudentProfile()
    {
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|difficulty-upsert-create", "difficulty-upsert-create@example.com");

        var payload = new
        {
            actualContent = "Worked on ser vs estar",
            previousHomeworkStatus = "NotApplicable",
            status = "Confirmed",
            suggestedDifficulties = new[]
            {
                new { description = "Confuses ser and estar", competency = "Grammar", subcategory = "ser/estar", severity = "high" },
            },
        };

        var response = await client.PostAsJsonAsync($"/api/students/{studentId}/sessions", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var studentResponse = await client.GetAsync($"/api/students/{studentId}");
        studentResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var studentJson = await studentResponse.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(studentJson);
        var difficulties = doc.RootElement.GetProperty("difficulties");
        difficulties.GetArrayLength().Should().Be(1);
        var d = difficulties[0];
        d.GetProperty("competency").GetString().Should().Be("Grammar");
        d.GetProperty("subcategory").GetString().Should().Be("ser/estar");
        d.GetProperty("severity").GetString().Should().Be("high");
        d.GetProperty("status").GetString().Should().Be("Active");
    }

    [Fact]
    public async Task UpdateSession_Confirmed_WithSuggestedDifficulties_UpsertsAndUpdatesExisting()
    {
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|difficulty-upsert-update", "difficulty-upsert-update@example.com");

        // Create a draft session first
        var createPayload = new
        {
            actualContent = "Initial session",
            previousHomeworkStatus = "NotApplicable",
            status = "Draft",
            suggestedDifficulties = new[]
            {
                new { description = "Struggles with ser", competency = "Grammar", subcategory = "ser/estar", severity = "low" },
            },
        };
        var createResponse = await client.PostAsJsonAsync($"/api/students/{studentId}/sessions", createPayload);
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var sessionId = createDoc.RootElement.GetProperty("id").GetString()!;

        // Draft creation should NOT have upserted difficulties
        var studentBefore = await client.GetAsync($"/api/students/{studentId}");
        var studentBeforeJson = await studentBefore.Content.ReadAsStringAsync();
        using var beforeDoc = JsonDocument.Parse(studentBeforeJson);
        beforeDoc.RootElement.GetProperty("difficulties").GetArrayLength().Should().Be(0);

        // Now confirm with updated severity
        var updatePayload = new
        {
            actualContent = "Updated session",
            previousHomeworkStatus = "NotApplicable",
            status = "Confirmed",
            suggestedDifficulties = new[]
            {
                new { description = "Confuses ser and estar consistently", competency = "Grammar", subcategory = "ser/estar", severity = "high" },
            },
        };
        var updateResponse = await client.PutAsJsonAsync($"/api/students/{studentId}/sessions/{sessionId}", updatePayload);
        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Difficulty should be upserted (updated severity from low to high)
        var studentAfter = await client.GetAsync($"/api/students/{studentId}");
        var studentAfterJson = await studentAfter.Content.ReadAsStringAsync();
        using var afterDoc = JsonDocument.Parse(studentAfterJson);
        var difficulties = afterDoc.RootElement.GetProperty("difficulties");
        difficulties.GetArrayLength().Should().Be(1);
        difficulties[0].GetProperty("severity").GetString().Should().Be("high");
        difficulties[0].GetProperty("status").GetString().Should().Be("Active");
        difficulties[0].GetProperty("description").GetString().Should().Be("Confuses ser and estar consistently");
    }

    [Fact]
    public async Task CreateSession_Draft_WithSuggestedDifficulties_DoesNotUpsertToProfile()
    {
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|difficulty-draft-no-upsert", "difficulty-draft@example.com");

        var payload = new
        {
            actualContent = "Some draft content",
            previousHomeworkStatus = "NotApplicable",
            status = "Draft",
            suggestedDifficulties = new[]
            {
                new { description = "Vocabulary gaps", competency = "Vocabulary", subcategory = "food", severity = "medium" },
            },
        };

        var response = await client.PostAsJsonAsync($"/api/students/{studentId}/sessions", payload);
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var studentResponse = await client.GetAsync($"/api/students/{studentId}");
        var studentJson = await studentResponse.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(studentJson);
        doc.RootElement.GetProperty("difficulties").GetArrayLength().Should().Be(0);
    }
}
