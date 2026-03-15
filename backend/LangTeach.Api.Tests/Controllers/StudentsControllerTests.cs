using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LangTeach.Api.DTOs;
using LangTeach.Api.Tests.Fixtures;

namespace LangTeach.Api.Tests.Controllers;

[Collection("ApiTests")]
public class StudentsControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public StudentsControllerTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task List_ReturnsEmptyForNewTeacher()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|empty-list-test", "empty-list@example.com");

        var response = await client.GetAsync("/api/students");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<StudentDto>>();
        result!.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task Create_ReturnsCreatedStudent()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|create-test", "create@example.com");

        var request = new CreateStudentRequest
        {
            Name = "Ana García",
            LearningLanguage = "Spanish",
            CefrLevel = "B2",
            Interests = ["travel", "music"],
            Notes = "Prefers morning sessions.",
        };

        var response = await client.PostAsJsonAsync("/api/students", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var student = await response.Content.ReadFromJsonAsync<StudentDto>();
        student!.Name.Should().Be("Ana García");
        student.LearningLanguage.Should().Be("Spanish");
        student.CefrLevel.Should().Be("B2");
        student.Interests.Should().BeEquivalentTo(["travel", "music"]);
        student.Notes.Should().Be("Prefers morning sessions.");
        response.Headers.Location.Should().NotBeNull();
    }

    [Fact]
    public async Task GetById_ReturnsStudent()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|getbyid-test", "getbyid@example.com");

        var created = await CreateStudentAsync(client, "Test Student");

        var response = await client.GetAsync($"/api/students/{created.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var student = await response.Content.ReadFromJsonAsync<StudentDto>();
        student!.Id.Should().Be(created.Id);
        student.Name.Should().Be("Test Student");
    }

    [Fact]
    public async Task GetById_Returns404ForAnotherTeachersStudent()
    {
        var clientA = _factory.CreateAuthenticatedClient("auth0|rls-teacher-a", "teacher-a@example.com");
        var clientB = _factory.CreateAuthenticatedClient("auth0|rls-teacher-b", "teacher-b@example.com");

        var student = await CreateStudentAsync(clientA, "Teacher A Student");

        var response = await clientB.GetAsync($"/api/students/{student.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_UpdatesStudent()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|update-test", "update@example.com");

        var created = await CreateStudentAsync(client, "Original Name");

        var updateRequest = new UpdateStudentRequest
        {
            Name = "Updated Name",
            LearningLanguage = "French",
            CefrLevel = "C1",
            Interests = ["cinema"],
        };

        var response = await client.PutAsJsonAsync($"/api/students/{created.Id}", updateRequest);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<StudentDto>();
        updated!.Name.Should().Be("Updated Name");
        updated.CefrLevel.Should().Be("C1");
        updated.LearningLanguage.Should().Be("French");
        updated.Interests.Should().BeEquivalentTo(["cinema"]);
    }

    [Fact]
    public async Task Delete_SoftDeletesStudent()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|delete-test", "delete@example.com");

        var created = await CreateStudentAsync(client, "To Delete");

        var deleteResponse = await client.DeleteAsync($"/api/students/{created.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getResponse = await client.GetAsync($"/api/students/{created.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task List_FiltersByLanguage()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|filter-test", "filter@example.com");

        await CreateStudentAsync(client, "Spanish Student", language: "Spanish");
        await CreateStudentAsync(client, "French Student", language: "French");

        var response = await client.GetAsync("/api/students?language=Spanish");
        var result = await response.Content.ReadFromJsonAsync<PagedResult<StudentDto>>();

        result!.Items.Should().HaveCount(1);
        result.Items[0].LearningLanguage.Should().Be("Spanish");
    }

    [Fact]
    public async Task Create_WithEnrichmentFields_RoundTripsCorrectly()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|enrichment-create-test", "enrichment-create@example.com");

        var request = new CreateStudentRequest
        {
            Name = "Maria Silva",
            LearningLanguage = "Spanish",
            CefrLevel = "B1",
            NativeLanguage = "Portuguese",
            LearningGoals = ["travel", "conversation"],
            Weaknesses = ["past tenses", "articles"],
        };

        var response = await client.PostAsJsonAsync("/api/students", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var student = await response.Content.ReadFromJsonAsync<StudentDto>();
        student!.NativeLanguage.Should().Be("Portuguese");
        student.LearningGoals.Should().BeEquivalentTo(["travel", "conversation"]);
        student.Weaknesses.Should().BeEquivalentTo(["past tenses", "articles"]);
    }

    [Fact]
    public async Task Create_WithNullEnrichmentFields_ReturnsEmptyArraysAndNullLanguage()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|enrichment-null-test", "enrichment-null@example.com");

        var request = new CreateStudentRequest
        {
            Name = "John Doe",
            LearningLanguage = "English",
            CefrLevel = "A1",
        };

        var response = await client.PostAsJsonAsync("/api/students", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var student = await response.Content.ReadFromJsonAsync<StudentDto>();
        student!.NativeLanguage.Should().BeNull();
        student.LearningGoals.Should().BeEmpty();
        student.Weaknesses.Should().BeEmpty();
    }

    [Fact]
    public async Task Update_WithEnrichmentFields_PersistsChanges()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|enrichment-update-test", "enrichment-update@example.com");

        var created = await CreateStudentAsync(client, "Enrichment Update Student");

        var updateRequest = new UpdateStudentRequest
        {
            Name = created.Name,
            LearningLanguage = created.LearningLanguage,
            CefrLevel = created.CefrLevel,
            NativeLanguage = "German",
            LearningGoals = ["business"],
            Weaknesses = ["word order"],
        };

        var response = await client.PutAsJsonAsync($"/api/students/{created.Id}", updateRequest);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<StudentDto>();
        updated!.NativeLanguage.Should().Be("German");
        updated.LearningGoals.Should().BeEquivalentTo(["business"]);
        updated.Weaknesses.Should().BeEquivalentTo(["word order"]);
    }

    [Fact]
    public async Task Create_WithInvalidNativeLanguage_ReturnsBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|invalid-language-create-test", "invalid-language-create@example.com");

        var request = new CreateStudentRequest
        {
            Name = "Test Student",
            LearningLanguage = "English",
            CefrLevel = "B1",
            NativeLanguage = "Klingon",
        };

        var response = await client.PostAsJsonAsync("/api/students", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_WithInvalidNativeLanguage_ReturnsBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|invalid-language-update-test", "invalid-language-update@example.com");

        var created = await CreateStudentAsync(client, "Invalid Language Update Student");

        var updateRequest = new UpdateStudentRequest
        {
            Name = created.Name,
            LearningLanguage = created.LearningLanguage,
            CefrLevel = created.CefrLevel,
            NativeLanguage = "Klingon",
        };

        var response = await client.PutAsJsonAsync($"/api/students/{created.Id}", updateRequest);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private static async Task<StudentDto> CreateStudentAsync(
        HttpClient client,
        string name,
        string language = "English",
        string level = "B1")
    {
        var request = new CreateStudentRequest
        {
            Name = name,
            LearningLanguage = language,
            CefrLevel = level,
        };
        var response = await client.PostAsJsonAsync("/api/students", request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<StudentDto>())!;
    }
}
