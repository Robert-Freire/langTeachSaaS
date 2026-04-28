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
public class AssistantControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public AssistantControllerTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient client, Guid studentId)> SeedTeacherWithStudent(
        string auth0Id, string email, string cefrLevel = "A2")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = auth0Id,
            Email = email,
            DisplayName = "Assistant Test Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);

        var student = new Student
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            Name = "Ana",
            LearningLanguage = "Spanish",
            CefrLevel = cefrLevel,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Students.Add(student);
        await db.SaveChangesAsync();

        var client = _factory.CreateAuthenticatedClient(auth0Id, email);
        return (client, student.Id);
    }

    [Fact]
    public async Task Propose_WithStudentId_ReturnsStudentAndSessionProposals()
    {
        // StubStudentProfileExtractionService returns CefrLevel=B2, Profession=[Extracted] Engineer.
        // Student is seeded with CefrLevel=A2, so a cefrLevel proposal should be emitted.
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-propose-ok", "assistant-propose-ok@example.com", cefrLevel: "A2");

        var request = new AssistantProposeRequest
        {
            Text = "We worked on past perfect. Set writing level to B1 and add a passive voice todo.",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();
        body!.Proposals.Should().NotBeEmpty();

        // Student proposals from StubStudentProfileExtractionService
        body.Proposals.Should().Contain(p => p.Type == "student" && p.Field == "cefrLevel");
        body.Proposals.Should().Contain(p => p.Type == "student" && p.Field == "profession");
        body.Proposals.Should().Contain(p => p.Type == "student" && p.Field == "countryOfResidence");

        // Session proposals from StubReflectionExtractionService
        body.Proposals.Should().Contain(p => p.Type == "session" && p.Field == "title");
        body.Proposals.Should().Contain(p => p.Type == "session" && p.Field == "actualContent");
        body.Proposals.Should().Contain(p => p.Type == "session" && p.Field == "generalNotes");
        body.Proposals.Should().Contain(p => p.Type == "session" && p.Field == "homeworkAssigned");

        // All proposals have an id, label, newValue
        body.Proposals.Should().AllSatisfy(p =>
        {
            p.Id.Should().NotBeNullOrEmpty();
            p.Label.Should().NotBeNullOrEmpty();
            p.NewValue.Should().NotBeNullOrEmpty();
        });
    }

    [Fact]
    public async Task Propose_WithoutStudentId_ReturnsOnlySessionProposals()
    {
        var (client, _) = await SeedTeacherWithStudent(
            "auth0|assistant-propose-nosid", "assistant-propose-nosid@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "We covered grammar topics today.",
            StudentId = null,
            SessionId = null,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();

        // No student or todo proposals when studentId is absent
        body!.Proposals.Should().NotContain(p => p.Type == "student");
        body.Proposals.Should().NotContain(p => p.Type == "todo");

        // Session proposals should still be present
        body.Proposals.Should().Contain(p => p.Type == "session");
    }

    [Fact]
    public async Task Propose_EmptyText_Returns400()
    {
        var (client, _) = await SeedTeacherWithStudent(
            "auth0|assistant-empty-text", "assistant-empty-text@example.com");

        var request = new AssistantProposeRequest { Text = "   " };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Propose_CefrLevelUnchanged_DoesNotEmitCefrProposal()
    {
        // StubStudentProfileExtractionService returns CefrLevel=B2.
        // Seed student with B2 so old == new → no cefrLevel proposal.
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-no-cefr-change", "assistant-no-cefr-change@example.com", cefrLevel: "B2");

        var request = new AssistantProposeRequest
        {
            Text = "Standard lesson today.",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();
        body!.Proposals.Should().NotContain(p => p.Type == "student" && p.Field == "cefrLevel");
    }
}
