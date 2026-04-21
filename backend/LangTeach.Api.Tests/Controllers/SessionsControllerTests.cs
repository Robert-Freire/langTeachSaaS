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
public class SessionsControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public SessionsControllerTests(AuthenticatedWebAppFactory factory)
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
            DisplayName = "Sessions Test Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);

        var student = new Student
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            Name = "Sessions Test Student",
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
    public async Task Extract_ValidStudentAndText_ReturnsExtractedDto()
    {
        // StubReflectionExtractionService is registered in the test environment.
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|sessions-extract-ok", "sessions-extract-ok@example.com");

        var request = new ExtractReflectionRequest
        {
            Text = "We covered ser vs estar. Student struggled with ser but was enthusiastic throughout."
        };
        var response = await client.PostAsJsonAsync($"/api/students/{studentId}/sessions/extract", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<ExtractedReflectionDto>();
        dto!.WhatWasCovered!.Value.Should().Be("[Extracted] What was covered");
        dto.WhatWasCovered.Mode.Should().Be("replace");
        dto.AreasToImprove!.Value.Should().Be("[Extracted] Areas to improve");
        dto.EmotionalSignals.Should().Be("[Extracted] Emotional signals");
        dto.HomeworkAssigned!.Value.Should().Be("[Extracted] Homework assigned");
        dto.NextLessonIdeas!.Value.Should().Be("[Extracted] Next lesson ideas");
        dto.NextLessonIdeas.Mode.Should().Be("append");
    }

    [Fact]
    public async Task Extract_StudentBelongingToAnotherTeacher_Returns404()
    {
        var (_, studentId) = await SeedTeacherWithStudent(
            "auth0|sessions-owner", "sessions-owner@example.com");

        // Different teacher tries to access the student
        var otherClient = _factory.CreateAuthenticatedClient(
            "auth0|sessions-other", "sessions-other@example.com");

        var request = new ExtractReflectionRequest { Text = "Some notes" };
        var response = await otherClient.PostAsJsonAsync($"/api/students/{studentId}/sessions/extract", request);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Extract_EmptyText_Returns400()
    {
        var (client, studentId) = await SeedTeacherWithStudent(
            "auth0|sessions-empty-text", "sessions-empty-text@example.com");

        var request = new { text = "" };
        var response = await client.PostAsJsonAsync($"/api/students/{studentId}/sessions/extract", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
