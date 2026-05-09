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
    public async Task Propose_WithStudentIdAndNewStudentIntentFlag_EmitsNewStudentProposal()
    {
        // Student "Ana" is context; teacher explicitly says "nuevo alumno" → stub sets NewStudentIntent = true.
        // Should emit newStudent proposal alongside Ana's update proposals.
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-diff-name", "assistant-diff-name@example.com", cefrLevel: "A1");

        var request = new AssistantProposeRequest
        {
            Text = "Also I have a new student: María García, engineer, learning English at B2. [new-student-intent]",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();

        // newStudent proposal because LLM set NewStudentIntent = true
        body!.Proposals.Should().Contain(p => p.Type == "newStudent" && p.Field == "profile");

        // Regular student update proposals for Ana still present
        body.Proposals.Should().Contain(p => p.Type == "student");
    }

    [Fact]
    public async Task Propose_WithStudentIdAndDifferentNameButNoIntent_DoesNotEmitNewStudentProposal()
    {
        // Student "Ana" is context; stub extracts a different name but NewStudentIntent = false.
        // Name-diff alone must NOT trigger newStudent (TC-27/TC-10 fix).
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-no-intent", "assistant-no-intent@example.com", cefrLevel: "A1");

        var request = new AssistantProposeRequest
        {
            Text = "Working on Ana's past tense today.",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();

        body!.Proposals.Should().NotContain(p => p.Type == "newStudent");
    }

    [Fact]
    public async Task Propose_WithStudentAndInterests_ReturnsAppendProposal()
    {
        // TC-15: "Añade a los intereses de Carmen que le encanta el flamenco..."
        // Should produce student/interests/append, no newStudent.
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-interests", "assistant-interests@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "Añade a los intereses de Carmen que le encanta el flamenco. [has-interests]",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();

        body!.Proposals.Should().NotContain(p => p.Type == "newStudent");
        var interestsProp = body.Proposals.FirstOrDefault(p => p.Type == "student" && p.Field == "interests");
        interestsProp.Should().NotBeNull();
        interestsProp!.Action.Should().Be("append");
        interestsProp.NewValue.Should().Contain("Flamenco");
        interestsProp.Payload.Should().NotBeNull();
    }

    [Fact]
    public async Task Propose_WithStudentAndDifficulties_ReturnsAppendProposal()
    {
        // TC-16: "Añade a las dificultades de Ana que confunde indefinido con perfecto compuesto..."
        // Should produce student/difficulties/append, no newStudent.
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-difficulties", "assistant-difficulties@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "Ana confunde el indefinido con el perfecto compuesto. [has-difficulties]",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();

        body!.Proposals.Should().NotContain(p => p.Type == "newStudent");
        var diffProp = body.Proposals.FirstOrDefault(p => p.Type == "student" && p.Field == "difficulties");
        diffProp.Should().NotBeNull();
        diffProp!.Action.Should().Be("append");
        diffProp.NewValue.Should().Contain("Indefinido");
        diffProp.Payload.Should().NotBeNull();
    }

    [Fact]
    public async Task Propose_WithStudentAndLearningGoals_ReturnsReplaceProposal()
    {
        // TC-17: "Los objetivos de Marco han cambiado..." → learningGoals replace
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-goals", "assistant-goals@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "Los objetivos de Marco han cambiado. [has-learning-goals]",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();

        var goalsProp = body!.Proposals.FirstOrDefault(p => p.Type == "student" && p.Field == "learningGoals");
        goalsProp.Should().NotBeNull();
        goalsProp!.Action.Should().Be("replace");
        goalsProp.NewValue.Should().Contain("Presentaciones");
    }

    [Fact]
    public async Task Propose_WithStudentAndTeachingNotes_ReturnsAppendProposal()
    {
        // TC-18: "Añade una nota de enseñanza para Hans..." → teachingNotes append
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-notes", "assistant-notes@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "Hans aprende muy bien a través de la música. [has-teaching-notes]",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();

        body!.Proposals.Should().NotContain(p => p.Type == "newStudent");
        var notesProp = body.Proposals.FirstOrDefault(p => p.Type == "student" && p.Field == "teachingNotes");
        notesProp.Should().NotBeNull();
        notesProp!.Action.Should().Be("append");
        notesProp.NewValue.Should().Contain("música");
    }

    [Fact]
    public async Task Propose_WithLongTermAimAndNextLessonIdeas_EmitsBothProposalsSeparately()
    {
        // AC2 (#1135): a transcript containing BOTH a long-term student aim AND a next-class
        // planning aside must produce exactly two separate proposal cards with no overlap.
        // Stub: [has-learning-goals] returns ShortTermObjectives = "Presentaciones en español"
        //       reflection stub always returns NextLessonIdeas = "[Extracted] Next lesson ideas"
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-dual-content", "assistant-dual-content@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "Gergana quiere preparar el DELE B2 para octubre. Para mañana continuar con la pizarra. [has-learning-goals]",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();

        var goalsProp = body!.Proposals.FirstOrDefault(p => p.Type == "student" && p.Field == "learningGoals");
        goalsProp.Should().NotBeNull("a long-term aim must produce a Learning Goals proposal");
        goalsProp!.NewValue.Should().Contain("Presentaciones");

        var nextSessionProp = body.Proposals.FirstOrDefault(p => p.Type == "session" && p.Field == "nextSessionTopics");
        nextSessionProp.Should().NotBeNull("a next-class aside must produce a Next Session Topics proposal");
        nextSessionProp!.NewValue.Should().Contain("Next lesson ideas");

        goalsProp.NewValue.Should().NotBe(nextSessionProp.NewValue, "the two proposals must not contain identical content");
    }

    [Fact]
    public async Task Propose_WithSessionScopedContentOnly_NoLearningGoalsProposal()
    {
        // AC1 (#1135): when the student extractor correctly filters out session-scoped content,
        // no Learning Goals proposal must be emitted, but Next Session Topics still appears.
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-no-goals", "assistant-no-goals@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "Para mañana continuar con la pizarra del día. [no-learning-goals]",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();

        body!.Proposals.Should().NotContain(p => p.Type == "student" && p.Field == "learningGoals",
            "session-scoped content must not leak into a Learning Goals proposal");

        var nextSessionProp = body.Proposals.FirstOrDefault(p => p.Type == "session" && p.Field == "nextSessionTopics");
        nextSessionProp.Should().NotBeNull("Next Session Topics proposal must still appear independently");
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
    public async Task Propose_WithStudentAndNoSessionId_NewSessionTrigger_EmitsNewSessionProposal()
    {
        // From student-detail (no sessionId), new-session trigger must still produce a newSession proposal.
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-no-session-new", "assistant-no-session-new@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "Le di clase ayer, trabajamos el subjuntivo. [schedule-new-session]",
            StudentId = studentId,
            SessionId = null, // student-detail context: no open session
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();
        body!.Proposals.Should().Contain(p => p.Type == "newSession");
    }

    [Fact]
    public async Task Propose_WithStudentAndNoSessionId_PassesHasOpenSessionFalse_ToReflectionService()
    {
        // Verify hasOpenSession=false is passed when SessionId is null.
        // The stub ignores hasOpenSession but the real service uses it; we verify no crash and correct proposal shape.
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-no-session-flag", "assistant-no-session-flag@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "Normal text without schedule trigger.",
            StudentId = studentId,
            SessionId = null,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();
        body!.Proposals.Should().NotContain(p => p.Type == "newSession");
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
        var utcTodayBefore = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);
        var utcTodayAfter = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();
        var newSessionProposal = body!.Proposals.FirstOrDefault(p => p.Type == "newSession");
        newSessionProposal.Should().NotBeNull();

        // Payload sessionDate must match today UTC, resilient to midnight boundary crossing.
        var payloadDoc = System.Text.Json.JsonDocument.Parse(newSessionProposal!.Payload!.Value.GetRawText());
        var sessionDate = payloadDoc.RootElement.GetProperty("sessionDate").GetString();
        sessionDate.Should().BeOneOf(utcTodayBefore, utcTodayAfter);
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

    // TC-01: "Súbele el nivel de escritura a B1" → student proposal skillLevel.writing = "B1"
    [Fact]
    public async Task Propose_TC01_WritingLevelRaised_EmitsSkillLevelWritingProposal()
    {
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-tc01", "assistant-tc01@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "Worked on past perfect. [skill-writing=B1] Add passive voice todo.",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();
        body!.Proposals.Should().Contain(p =>
            p.Type == "student" && p.Field == "skillLevel.writing" && p.NewValue == "B1");
    }

    // TC-03: "bajarle el nivel de lectura a B1.2" → student proposal skillLevel.reading = "B1.2"
    [Fact]
    public async Task Propose_TC03_ReadingLevelLowered_EmitsSkillLevelReadingProposalWithSubLevel()
    {
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-tc03", "assistant-tc03@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "Marco today. [skill-reading=B1.2] Add teaching note.",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();
        body!.Proposals.Should().Contain(p =>
            p.Type == "student" && p.Field == "skillLevel.reading" && p.NewValue == "B1.2");
        body.Proposals.Should().NotContain(p =>
            p.Type == "todo");
    }

    // TC-07: three per-skill levels, teacher said "nivel global no lo toco"
    // Seed at B2 so stub CefrLevel=B2 produces no cefrLevel proposal.
    [Fact]
    public async Task Propose_TC07_ThreeSkillLevels_EmitsThreeProposalsNoGlobalCefrChange()
    {
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-tc07", "assistant-tc07@example.com", cefrLevel: "B2");

        var request = new AssistantProposeRequest
        {
            Text = "Nadia. [skill-reading=C1][skill-speaking=B2][skill-writing=B2]",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();
        body!.Proposals.Should().Contain(p =>
            p.Type == "student" && p.Field == "skillLevel.reading" && p.NewValue == "C1");
        body.Proposals.Should().Contain(p =>
            p.Type == "student" && p.Field == "skillLevel.speaking" && p.NewValue == "B2");
        body.Proposals.Should().Contain(p =>
            p.Type == "student" && p.Field == "skillLevel.writing" && p.NewValue == "B2");
        body.Proposals.Should().NotContain(p =>
            p.Type == "student" && p.Field == "cefrLevel");
    }

    [Fact]
    public async Task Propose_WithStudentAndNoSessionId_ReturnsSessionLogId()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = "auth0|assistant-session-log-id",
            Email = "assistant-session-log-id@example.com",
            DisplayName = "Session LogId Test Teacher",
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
            CefrLevel = "A2",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Students.Add(student);

        var session = new SessionLog
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            StudentId = student.Id,
            SessionDate = DateTime.UtcNow.AddDays(-1),
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.SessionLogs.Add(session);
        await db.SaveChangesAsync();

        var client = _factory.CreateAuthenticatedClient("auth0|assistant-session-log-id", "assistant-session-log-id@example.com");
        var request = new AssistantProposeRequest
        {
            Text = "We worked on past perfect.",
            StudentId = student.Id,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();
        body!.SessionLogId.Should().Be(session.Id);
    }

    [Fact]
    public async Task Propose_WithStudentAndNoSessions_ReturnsNullSessionLogId()
    {
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-no-sessions", "assistant-no-sessions@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "We worked on past perfect.",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();
        body!.SessionLogId.Should().BeNull();
    }

    // TC-19: "sube el nivel de conversación a B1" → student proposal skillLevel.speaking = "B1"
    [Fact]
    public async Task Propose_TC19_SpeakingLevelRaised_EmitsSkillLevelSpeakingProposal()
    {
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|assistant-tc19", "assistant-tc19@example.com");

        var request = new AssistantProposeRequest
        {
            Text = "Conversación improved. [skill-speaking=B1]",
            StudentId = studentId,
        };
        var response = await client.PostAsJsonAsync("/api/assistant/propose", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AssistantProposeResponse>();
        body.Should().NotBeNull();
        body!.Proposals.Should().Contain(p =>
            p.Type == "student" && p.Field == "skillLevel.speaking" && p.NewValue == "B1");
    }
}
