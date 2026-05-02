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
    public async Task Propose_WithoutStudentId_ReturnsSessionAndNewStudentProposals()
    {
        // StubStudentProfileExtractionService returns Name="[Extracted] María García".
        // With no student context, this triggers new student intent.
        var (client, _) = await SeedTeacherWithStudent(
            "auth0|assistant-propose-nosid", "assistant-propose-nosid@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "Nueva alumna: María García, ingeniera, aprende inglés.",
            StudentId = null,
            SessionId = null,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();

        // No per-field student or todo proposals when studentId is absent
        body!.Proposals.Should().NotContain(p => p.Type == "student");
        body.Proposals.Should().NotContain(p => p.Type == "todo");

        // New student proposal should be present
        body.Proposals.Should().Contain(p => p.Type == "newStudent" && p.Field == "profile");

        // Session proposals should still be present
        body.Proposals.Should().Contain(p => p.Type == "session");
    }

    [Fact]
    public async Task Propose_WithStudentIdMatchingExtractedName_DoesNotEmitNewStudentProposal()
    {
        // Seed a student whose name exactly matches what the stub extracts.
        // The stub always returns Name="[Extracted] María García".
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = "auth0|assistant-same-name",
            Email = "assistant-same-name@example.com",
            DisplayName = "Same Name Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);
        var student = new Student
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            Name = "[Extracted] María García",
            LearningLanguage = "English",
            CefrLevel = "A2",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Students.Add(student);
        await db.SaveChangesAsync();

        var client = _factory.CreateAuthenticatedClient("auth0|assistant-same-name", "assistant-same-name@example.com");
        var request = new AssistantProposeRequest
        {
            Text = "Working on María García's pronunciation.",
            StudentId = student.Id,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();

        // No newStudent proposal when extracted name matches current student
        body!.Proposals.Should().NotContain(p => p.Type == "newStudent");

        // Regular student update proposals should still be present
        body.Proposals.Should().Contain(p => p.Type == "student");
    }

    [Fact]
    public async Task Propose_WithStudentIdButDifferentExtractedName_EmitsNewStudentProposal()
    {
        // Student "Ana" is context; stub extracts "[Extracted] María García" (different name).
        // Should emit newStudent proposal alongside Ana's update proposals.
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-diff-name", "assistant-diff-name@example.com", cefrLevel: "A1");

        var request = new AssistantProposeRequest
        {
            Text = "Also I have a new student: María García, engineer, learning English at B2.",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();

        // newStudent proposal for the new person
        body!.Proposals.Should().Contain(p => p.Type == "newStudent" && p.Field == "profile");

        // Regular student update proposals for Ana still present
        body.Proposals.Should().Contain(p => p.Type == "student");
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

    [Fact]
    public async Task Propose_WithSchedulingIntent_EmitsNewSessionProposal()
    {
        // StubReflectionExtractionService emits newSession when text contains "[schedule-new-session]".
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-new-session", "assistant-new-session@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "Next Monday I want to do a session on the subjunctive. [schedule-new-session]",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();
        var newSessionProposal = body!.Proposals.FirstOrDefault(p => p.Type == "newSession");
        newSessionProposal.Should().NotBeNull();
        newSessionProposal!.Label.Should().Be("New Session");
        newSessionProposal.NewValue.Should().Be("[Extracted] New Session Title");
        newSessionProposal.Payload.Should().NotBeNull();
    }

    [Fact]
    public async Task Propose_WithSchedulingIntentButNoStudentId_StillEmitsNewSessionProposal()
    {
        // newSession proposal is emitted even without student context (frontend handles the disabled state).
        var client = _factory.CreateAuthenticatedClient("auth0|assistant-new-session-no-student", "no-student@example.com");
        // Register teacher via a simple student seed then use only the client
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = "auth0|assistant-new-session-no-student",
            Email = "no-student@example.com",
            DisplayName = "No Student Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);
        await db.SaveChangesAsync();

        var request = new AssistantProposeRequest
        {
            Text = "La semana que viene hagamos una sesión sobre el subjuntivo. [schedule-new-session]",
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();
        body!.Proposals.Should().Contain(p => p.Type == "newSession");
    }

    [Fact]
    public async Task Propose_WithSchedulingIntentButNoDate_DefaultsPayloadDateToToday()
    {
        // When the LLM extracts a newSessionTitle but no newSessionDate, the controller
        // defaults the payload date to today (UTC).
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-new-session-no-date", "assistant-new-session-no-date@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "Next class let's do conditionals. [schedule-new-session-no-date]",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        var newSessionProposal = body!.Proposals.FirstOrDefault(p => p.Type == "newSession");
        newSessionProposal.Should().NotBeNull();

        // Payload must have a sessionDate equal to today (UTC date).
        var payloadDoc = System.Text.Json.JsonDocument.Parse(newSessionProposal!.Payload!.Value.GetRawText());
        var sessionDate = payloadDoc.RootElement.GetProperty("sessionDate").GetString();
        sessionDate.Should().Be(DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd"));
    }

    [Fact]
    public async Task Propose_WithoutSchedulingIntent_DoesNotEmitNewSessionProposal()
    {
        // Normal reflection text without "[schedule-new-session]" trigger → no newSession proposal.
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-no-new-session", "assistant-no-new-session@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "We worked on subjunctive today. Great progress.",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();
        body!.Proposals.Should().NotContain(p => p.Type == "newSession");
    }
}
