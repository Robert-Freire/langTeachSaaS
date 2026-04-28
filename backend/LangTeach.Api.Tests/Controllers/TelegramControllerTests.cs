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
public class TelegramControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public TelegramControllerTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    // --- POST /api/telegram/connect-code ---

    [Fact]
    public async Task GenerateConnectCode_Returns200WithCodeAndExpiry()
    {
        var client = _factory.CreateAuthenticatedClient();

        var response = await client.PostAsync("/api/telegram/connect-code", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<TelegramConnectCodeResponse>();
        body.Should().NotBeNull();
        body!.Code.Should().NotBeNullOrWhiteSpace();
        body.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    // Note: TestAuthHandler always authenticates (returns DefaultAuth0Id when no headers provided),
    // so unauthenticated-returns-401 cannot be tested in this environment.

    // --- GET /api/telegram/status ---

    [Fact]
    public async Task GetStatus_NoLink_ReturnsNotConnected()
    {
        var auth0Id = $"auth0|tg-status-{Guid.NewGuid()}";
        var client = _factory.CreateAuthenticatedClient(auth0Id: auth0Id);

        var response = await client.GetAsync("/api/telegram/status");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<TelegramStatusResponse>();
        body!.Connected.Should().BeFalse();
        body.LinkedAt.Should().BeNull();
    }

    [Fact]
    public async Task GetStatus_WithLink_ReturnsConnected()
    {
        var auth0Id = $"auth0|tg-linked-{Guid.NewGuid()}";
        var client = _factory.CreateAuthenticatedClient(auth0Id: auth0Id);

        // Create link via connect flow
        await client.PostAsync("/api/telegram/connect-code", null);
        var teacherId = await GetTeacherIdAsync(auth0Id);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Set<TelegramLink>().Add(new TelegramLink
        {
            ChatId = 777L,
            TeacherId = teacherId,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var response = await client.GetAsync("/api/telegram/status");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<TelegramStatusResponse>();
        body!.Connected.Should().BeTrue();
        body.LinkedAt.Should().NotBeNull();
    }

    // --- DELETE /api/telegram/link ---

    [Fact]
    public async Task DeleteLink_WithLink_Returns204AndRemovesRow()
    {
        var auth0Id = $"auth0|tg-delete-{Guid.NewGuid()}";
        var client = _factory.CreateAuthenticatedClient(auth0Id: auth0Id);

        // Ensure teacher record exists
        await client.GetAsync("/api/telegram/status");
        var teacherId = await GetTeacherIdAsync(auth0Id);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Set<TelegramLink>().Add(new TelegramLink
        {
            ChatId = 888L,
            TeacherId = teacherId,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var deleteResponse = await client.DeleteAsync("/api/telegram/link");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Second delete on same account returns 404 (link already removed)
        var secondDelete = await client.DeleteAsync("/api/telegram/link");
        secondDelete.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // --- POST /api/telegram/webhook ---

    [Fact]
    public async Task Webhook_Returns200_ForUnknownChat()
    {
        // In Testing env secret is empty so filter passes all requests through.
        // Webhook always returns 200 regardless of result (to prevent Telegram retries).
        var client = _factory.CreateClient();
        var update = new { update_id = 1, message = new { message_id = 1, chat = new { id = 9999 }, text = "hi" } };

        var response = await client.PostAsJsonAsync("/api/telegram/webhook", update);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private Task<Guid> GetTeacherIdAsync(string auth0Id)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var teacher = db.Teachers.First(t => t.Auth0UserId == auth0Id);
        return Task.FromResult(teacher.Id);
    }
}
