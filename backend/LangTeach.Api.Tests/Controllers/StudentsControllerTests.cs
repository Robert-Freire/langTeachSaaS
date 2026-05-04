using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using LangTeach.Api.Tests.Fixtures;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

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
            PersonalNotes = "Prefers morning sessions.",
        };

        var response = await client.PostAsJsonAsync("/api/students", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var student = await response.Content.ReadFromJsonAsync<StudentDto>();
        student!.Name.Should().Be("Ana García");
        student.LearningLanguage.Should().Be("Spanish");
        student.Level.CefrLevel.Should().Be("B2");
        student.Profile.Interests.Should().BeEquivalentTo(["travel", "music"]);
        student.Profile.PersonalNotes.Should().Be("Prefers morning sessions.");
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
        updated.Level.CefrLevel.Should().Be("C1");
        updated.LearningLanguage.Should().Be("French");
        updated.Profile.Interests.Should().BeEquivalentTo(["cinema"]);
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
            NativeLanguages = ["Portuguese"],
            LearningGoals = [
                new LearningGoalDto(Guid.NewGuid().ToString(), "travel", []),
                new LearningGoalDto(Guid.NewGuid().ToString(), "conversation", []),
            ],
            Weaknesses = [new StudentWeaknessDto("past tenses", "grammatical"), new StudentWeaknessDto("articles", "lexical")],
        };

        var response = await client.PostAsJsonAsync("/api/students", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var student = await response.Content.ReadFromJsonAsync<StudentDto>();
        student!.Languages.NativeLanguages.Should().BeEquivalentTo(["Portuguese"]);
        student.Profile.LearningGoals.Select(g => g.Text).Should().BeEquivalentTo(["travel", "conversation"]);
        student.Profile.Weaknesses.Should().BeEquivalentTo([
            new StudentWeaknessDto("past tenses", "grammatical"),
            new StudentWeaknessDto("articles", "lexical"),
        ]);
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
        student!.Languages.NativeLanguages.Should().BeEmpty();
        student.Profile.LearningGoals.Should().BeEmpty();
        student.Profile.Weaknesses.Should().BeEmpty();
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
            CefrLevel = created.Level.CefrLevel,
            NativeLanguages = ["German"],
            LearningGoals = [new LearningGoalDto(Guid.NewGuid().ToString(), "business", [])],
            Weaknesses = [new StudentWeaknessDto("word order", "grammatical")],
        };

        var response = await client.PutAsJsonAsync($"/api/students/{created.Id}", updateRequest);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<StudentDto>();
        updated!.Languages.NativeLanguages.Should().BeEquivalentTo(["German"]);
        updated.Profile.LearningGoals.Select(g => g.Text).Should().BeEquivalentTo(["business"]);
        updated.Profile.Weaknesses.Should().BeEquivalentTo([new StudentWeaknessDto("word order", "grammatical")]);
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
            NativeLanguages = ["Klingon"],
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
            CefrLevel = created.Level.CefrLevel,
            NativeLanguages = ["Klingon"],
        };

        var response = await client.PutAsJsonAsync($"/api/students/{created.Id}", updateRequest);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_WithDifficulties_RoundTripsCorrectly()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|difficulty-create-test", "difficulty-create@example.com");

        var request = new CreateStudentRequest
        {
            Name = "Maria Dificultades",
            LearningLanguage = "Spanish",
            CefrLevel = "B1",
            Difficulties =
            [
                new DifficultyDto("d1", "Confuses ser/estar in past tense", "Grammar", "ser/estar", "high", "stable", "Active"),
                new DifficultyDto("d2", "Difficulty with rolled /r/", "Pronunciation", "/r/", "medium", "stable", "Active"),
            ],
        };

        var response = await client.PostAsJsonAsync("/api/students", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var student = await response.Content.ReadFromJsonAsync<StudentDto>();
        student!.Profile.Difficulties.Should().HaveCount(2);
        student.Profile.Difficulties[0].Competency.Should().Be("Grammar");
        student.Profile.Difficulties[0].Description.Should().Be("Confuses ser/estar in past tense");
        student.Profile.Difficulties[0].Severity.Should().Be("high");
        student.Profile.Difficulties[0].Status.Should().Be("Active");
        student.Profile.Difficulties[1].Competency.Should().Be("Pronunciation");
    }

    [Fact]
    public async Task Update_WithDifficulties_PersistsChanges()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|difficulty-update-test", "difficulty-update@example.com");

        var created = await CreateStudentAsync(client, "Difficulty Update Student");

        var updateRequest = new UpdateStudentRequest
        {
            Name = created.Name,
            LearningLanguage = created.LearningLanguage,
            CefrLevel = created.Level.CefrLevel,
            Difficulties =
            [
                new DifficultyDto("d1", "Lacks academic register vocabulary", "Vocabulary", "academic register", "low", "stable", "Active"),
            ],
        };

        var response = await client.PutAsJsonAsync($"/api/students/{created.Id}", updateRequest);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<StudentDto>();
        updated!.Profile.Difficulties.Should().HaveCount(1);
        updated.Profile.Difficulties[0].Competency.Should().Be("Vocabulary");
        updated.Profile.Difficulties[0].Description.Should().Be("Lacks academic register vocabulary");

        // Update again to remove all difficulties
        var clearRequest = new UpdateStudentRequest
        {
            Name = created.Name,
            LearningLanguage = created.LearningLanguage,
            CefrLevel = created.Level.CefrLevel,
            Difficulties = [],
        };

        var clearResponse = await client.PutAsJsonAsync($"/api/students/{created.Id}", clearRequest);
        clearResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var cleared = await clearResponse.Content.ReadFromJsonAsync<StudentDto>();
        cleared!.Profile.Difficulties.Should().BeEmpty();
    }

    [Fact]
    public async Task Create_WithInvalidDifficultyCategory_ReturnsBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|difficulty-invalid-cat-test", "difficulty-invalid-cat@example.com");

        var request = new CreateStudentRequest
        {
            Name = "Invalid Category",
            LearningLanguage = "English",
            CefrLevel = "A1",
            Difficulties =
            [
                new DifficultyDto("d1", "some description", "invalid-category", "", "high", "stable", "Active"),
            ],
        };

        var response = await client.PostAsJsonAsync("/api/students", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_WithInvalidDifficultySeverity_ReturnsBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|difficulty-invalid-sev-test", "difficulty-invalid-sev@example.com");

        var request = new CreateStudentRequest
        {
            Name = "Invalid Severity",
            LearningLanguage = "English",
            CefrLevel = "A1",
            Difficulties =
            [
                new DifficultyDto("d1", "some description", "Grammar", "", "extreme", "stable", "Active"),
            ],
        };

        var response = await client.PostAsJsonAsync("/api/students", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_WithLowercaseDifficultyStatus_Succeeds()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|difficulty-lowercase-status-test", "difficulty-lowercase-status@example.com");

        var request = new CreateStudentRequest
        {
            Name = "Lowercase Status",
            LearningLanguage = "English",
            CefrLevel = "A1",
            Difficulties =
            [
                new DifficultyDto("d1", "some description", "Grammar", "", "high", "stable", "active"),
            ],
        };

        var response = await client.PostAsJsonAsync("/api/students", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Create_WithEmptyDifficulties_Succeeds()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|difficulty-empty-test", "difficulty-empty@example.com");

        var request = new CreateStudentRequest
        {
            Name = "No Difficulties",
            LearningLanguage = "English",
            CefrLevel = "A1",
            Difficulties = [],
        };

        var response = await client.PostAsJsonAsync("/api/students", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var student = await response.Content.ReadFromJsonAsync<StudentDto>();
        student!.Profile.Difficulties.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteTeachingTodo_Succeeds()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|delete-todo-test", "delete-todo@example.com");
        var student = await CreateStudentAsync(client, "Todo Delete Student");

        var appendResponse = await client.PostAsJsonAsync(
            $"/api/students/{student.Id}/teaching-todos",
            new CreateTeachingTodoDto("Practicar subjuntivo", null));
        appendResponse.EnsureSuccessStatusCode();
        var withTodo = await appendResponse.Content.ReadFromJsonAsync<StudentDto>();
        var todoId = withTodo!.Profile.TeachingTodos[0].Id;

        var deleteResponse = await client.DeleteAsync($"/api/students/{student.Id}/teaching-todos/{todoId}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await deleteResponse.Content.ReadFromJsonAsync<StudentDto>();
        result!.Profile.TeachingTodos.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteTeachingTodo_UnknownTodoId_ReturnsNotFound()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|delete-todo-notfound-test", "delete-todo-notfound@example.com");
        var student = await CreateStudentAsync(client, "Todo Delete NotFound Student");

        var response = await client.DeleteAsync($"/api/students/{student.Id}/teaching-todos/nonexistent-id");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateTeachingTodo_WithCapitalizedPendingStatus_Succeeds()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|todo-capitalized-status-test", "todo-capitalized-status@example.com");
        var student = await CreateStudentAsync(client, "Todo Capitalized Status Student");

        var appendResponse = await client.PostAsJsonAsync(
            $"/api/students/{student.Id}/teaching-todos",
            new CreateTeachingTodoDto("Practicar subjuntivo", null));
        appendResponse.EnsureSuccessStatusCode();
        var withTodo = await appendResponse.Content.ReadFromJsonAsync<StudentDto>();
        var todoId = withTodo!.Profile.TeachingTodos[0].Id;

        // Title-case "Pending" must now be rejected — only lowercase is valid (#931)
        var updateResponse = await client.PatchAsJsonAsync(
            $"/api/students/{student.Id}/teaching-todos/{todoId}",
            new UpdateTeachingTodoDto("Pending", null, null));

        updateResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_WithNestedLearningGoals_RoundTripsHierarchy()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|nested-goals-test", "nested-goals@example.com");

        var childId = Guid.NewGuid().ToString();
        var parentId = Guid.NewGuid().ToString();
        var request = new CreateStudentRequest
        {
            Name = "Nested Goals Student",
            LearningLanguage = "Spanish",
            CefrLevel = "B2",
            LearningGoals =
            [
                new LearningGoalDto(parentId, "Dominar el subjuntivo",
                [
                    new LearningGoalDto(childId, "Subjuntivo en oraciones subordinadas", []),
                ]),
            ],
        };

        var response = await client.PostAsJsonAsync("/api/students", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var student = await response.Content.ReadFromJsonAsync<StudentDto>();
        student!.Profile.LearningGoals.Should().HaveCount(1);
        student.Profile.LearningGoals[0].Text.Should().Be("Dominar el subjuntivo");
        student.Profile.LearningGoals[0].Children.Should().HaveCount(1);
        student.Profile.LearningGoals[0].Children[0].Text.Should().Be("Subjuntivo en oraciones subordinadas");
        student.Profile.LearningGoals[0].Children[0].Children.Should().BeEmpty();
    }

    [Fact]
    public async Task Create_With3LevelNestedGoal_ReturnsBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|deep-goals-test", "deep-goals@example.com");

        var request = new CreateStudentRequest
        {
            Name = "Deep Goals Student",
            LearningLanguage = "Spanish",
            CefrLevel = "B1",
            LearningGoals =
            [
                new LearningGoalDto(Guid.NewGuid().ToString(), "Level 1",
                [
                    new LearningGoalDto(Guid.NewGuid().ToString(), "Level 2",
                    [
                        new LearningGoalDto(Guid.NewGuid().ToString(), "Level 3 — not allowed", []),
                    ]),
                ]),
            ],
        };

        var response = await client.PostAsJsonAsync("/api/students", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PatchStudentProfile_AppendInterests_AddsToExistingList()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|patch-profile-interests", "patch-profile-interests@example.com");
        var student = await CreateStudentAsync(client, "Carmen");

        var patch = new PatchStudentProfileRequest
        {
            AppendInterests = ["Flamenco", "Cine de Almodóvar"],
        };
        var response = await client.PatchAsJsonAsync($"/api/students/{student.Id}/profile", patch);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<StudentDto>();
        updated!.Profile.Interests.Should().Contain("Flamenco");
        updated.Profile.Interests.Should().Contain("Cine de Almodóvar");
    }

    [Fact]
    public async Task PatchStudentProfile_AppendDifficulties_AddsToExistingList()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|patch-profile-diffs", "patch-profile-diffs@example.com");
        var student = await CreateStudentAsync(client, "Ana");

        var patch = new PatchStudentProfileRequest
        {
            AppendDifficulties =
            [
                new AppendDifficultyItem
                {
                    Description = "Indefinido vs perfecto compuesto",
                    Competency = "Grammar",
                    Subcategory = "past tense",
                },
            ],
        };
        var response = await client.PatchAsJsonAsync($"/api/students/{student.Id}/profile", patch);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<StudentDto>();
        updated!.Profile.Difficulties.Should().Contain(d => d.Description == "Indefinido vs perfecto compuesto");
    }

    [Fact]
    public async Task PatchStudentProfile_ReplaceLearningGoals_ReplacesExistingGoals()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|patch-profile-goals", "patch-profile-goals@example.com");
        var student = await CreateStudentAsync(client, "Marco");

        var patch = new PatchStudentProfileRequest
        {
            LearningGoals = ["Presentaciones en español para clientes alemanes"],
        };
        var response = await client.PatchAsJsonAsync($"/api/students/{student.Id}/profile", patch);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<StudentDto>();
        updated!.Profile.LearningGoals.Should().ContainSingle(g => g.Text == "Presentaciones en español para clientes alemanes");
    }

    [Fact]
    public async Task PatchStudentProfile_AppendTeachingNotes_AppendsToExistingNote()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|patch-profile-notes", "patch-profile-notes@example.com");
        var student = await CreateStudentAsync(client, "Hans");

        var patch = new PatchStudentProfileRequest
        {
            AppendTeachingNotes = "Aprende bien a través de la música.",
        };
        var response = await client.PatchAsJsonAsync($"/api/students/{student.Id}/profile", patch);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<StudentDto>();
        updated!.Profile.TeachingNotes.Should().Contain("música");
    }

    [Fact]
    public async Task PatchStudentProfile_AppendInterests_DoesNotAddDuplicates()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|patch-profile-nodup", "patch-profile-nodup@example.com");
        var student = await CreateStudentAsync(client, "Isabel");

        // First append
        await client.PatchAsJsonAsync($"/api/students/{student.Id}/profile",
            new PatchStudentProfileRequest { AppendInterests = ["Flamenco"] });

        // Second append with same interest + a new one
        var response = await client.PatchAsJsonAsync($"/api/students/{student.Id}/profile",
            new PatchStudentProfileRequest { AppendInterests = ["Flamenco", "Fotografía"] });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<StudentDto>();
        updated!.Profile.Interests.Where(i => i.Equals("Flamenco", StringComparison.OrdinalIgnoreCase)).Should().HaveCount(1);
        updated.Profile.Interests.Should().Contain("Fotografía");
    }

    [Fact]
    public async Task PatchStudent_SkillLevelFields_UpdatesSkillLevelOverrides()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|patch-skill-levels", "patch-skill-levels@example.com");
        var student = await CreateStudentAsync(client, "Nadia");

        var patch = new PatchStudentRequest { SkillLevelReading = "C1", SkillLevelWriting = "B2" };
        var patchResponse = await client.PatchAsJsonAsync($"/api/students/{student.Id}", patch);

        patchResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await patchResponse.Content.ReadFromJsonAsync<StudentDto>();
        updated!.Level.SkillLevelOverrides.Should().ContainKey("Reading").WhoseValue.Should().Be("C1");
        updated.Level.SkillLevelOverrides.Should().ContainKey("Writing").WhoseValue.Should().Be("B2");
        updated.Level.SkillLevelOverrides.Should().NotContainKey("Speaking");
    }

    [Fact]
    public async Task PatchStudent_SkillLevelOverride_StoresBaseLevel()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|patch-skill-sublevel", "patch-skill-sublevel@example.com");
        var student = await CreateStudentAsync(client, "Marco");

        var patch = new PatchStudentRequest { SkillLevelReading = "B1" };
        var patchResponse = await client.PatchAsJsonAsync($"/api/students/{student.Id}", patch);

        patchResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await patchResponse.Content.ReadFromJsonAsync<StudentDto>();
        updated!.Level.SkillLevelOverrides.Should().ContainKey("Reading").WhoseValue.Should().Be("B1");
    }

    [Fact]
    public async Task PatchStudent_InvalidSkillLevel_ReturnsBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient("auth0|patch-skill-invalid", "patch-skill-invalid@example.com");
        var student = await CreateStudentAsync(client, "InvalidLevelStudent");

        var patch = new PatchStudentRequest { SkillLevelWriting = "Z9" };
        var patchResponse = await client.PatchAsJsonAsync($"/api/students/{student.Id}", patch);

        patchResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ExtractProfile_WhenClaudeRateLimited_Returns429()
    {
        var rateLimitFactory = _factory.WithWebHostBuilder(b =>
            b.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IStudentProfileExtractionService));
                if (descriptor is not null) services.Remove(descriptor);
                services.AddScoped<IStudentProfileExtractionService, RateLimitThrowingExtractionService>();
            }));

        var client = rateLimitFactory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Auth0Id", "auth0|rate-limit-test");
        client.DefaultRequestHeaders.Add("X-Test-Email", "rate-limit@example.com");
        var response = await client.PostAsJsonAsync("/api/students/extract-profile", new { text = "any text" });

        response.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
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

internal class RateLimitThrowingExtractionService : IStudentProfileExtractionService
{
    public Task<LangTeach.Api.DTOs.ExtractedStudentProfileDto> ExtractAsync(string text, CancellationToken ct = default)
        => throw new ClaudeRateLimitException(TimeSpan.FromSeconds(30));
}
