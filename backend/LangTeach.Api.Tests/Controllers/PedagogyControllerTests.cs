using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Tests.Controllers;

[Collection("ApiTests")]
public class PedagogyControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public PedagogyControllerTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private HttpClient CreateClient(string auth0Id, string email)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Auth0Id", auth0Id);
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        return client;
    }

    private async Task SeedApprovedTeacher(string auth0Id, string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (await db.Teachers.AnyAsync(t => t.Auth0UserId == auth0Id)) return;
        db.Teachers.Add(new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = auth0Id,
            Email = email,
            DisplayName = "Pedagogy Tester",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task GetSectionRules_ReturnsAllSectionsAndLevels()
    {
        const string auth0Id = "auth0|pedagogy-test-1";
        const string email = "pedagogy1@test.com";
        await SeedApprovedTeacher(auth0Id, email);
        var client = CreateClient(auth0Id, email);

        var response = await client.GetAsync("/api/pedagogy/section-rules");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadFromJsonAsync<Dictionary<string, Dictionary<string, string[]>>>(
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        json.Should().NotBeNull();
        json!.Keys.Should().BeEquivalentTo(["WarmUp", "Presentation", "Practice", "Production", "WrapUp"]);

        var expectedLevels = new[] { "A1", "A2", "B1", "B2", "C1", "C2" };
        foreach (var section in json.Values)
        {
            section.Keys.Should().BeEquivalentTo(expectedLevels);
        }
    }

    [Fact]
    public async Task GetSectionRules_WarmUpAllLevels_ReturnsOnlyConversation()
    {
        const string auth0Id = "auth0|pedagogy-test-2";
        const string email = "pedagogy2@test.com";
        await SeedApprovedTeacher(auth0Id, email);
        var client = CreateClient(auth0Id, email);

        var response = await client.GetAsync("/api/pedagogy/section-rules");
        var json = await response.Content.ReadFromJsonAsync<Dictionary<string, Dictionary<string, string[]>>>(
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        var warmUp = json!["WarmUp"];
        foreach (var level in warmUp.Values)
        {
            level.Should().BeEquivalentTo(["conversation"]);
        }
    }

    [Fact]
    public async Task GetSectionRules_ProductionB2AndAbove_IncludesReading()
    {
        const string auth0Id = "auth0|pedagogy-test-3";
        const string email = "pedagogy3@test.com";
        await SeedApprovedTeacher(auth0Id, email);
        var client = CreateClient(auth0Id, email);

        var response = await client.GetAsync("/api/pedagogy/section-rules");
        var json = await response.Content.ReadFromJsonAsync<Dictionary<string, Dictionary<string, string[]>>>(
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        var production = json!["Production"];
        production["A1"].Should().BeEquivalentTo(["conversation"]);
        production["B1"].Should().BeEquivalentTo(["conversation"]);
        production["B2"].Should().Contain("reading");
        production["C1"].Should().Contain("reading");
        production["C2"].Should().Contain("reading");
    }

}
