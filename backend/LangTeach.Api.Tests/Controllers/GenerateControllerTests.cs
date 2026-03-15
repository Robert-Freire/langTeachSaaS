using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Data;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Tests.Fixtures;
using Microsoft.Extensions.DependencyInjection;

namespace LangTeach.Api.Tests.Controllers;

internal sealed class FakeClaudeClient : IClaudeClient
{
    public string FixedContent { get; set; } = """{"items":[{"word":"hello","definition":"greeting","exampleSentence":"Hello!","translation":"hola"}]}""";

    public Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default) =>
        Task.FromResult(new ClaudeResponse(FixedContent, "claude-haiku", 10, 20));

    public async IAsyncEnumerable<string> StreamAsync(ClaudeRequest request, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        await Task.Yield();
        yield return FixedContent;
    }
}

[Collection("ApiTests")]
public class GenerateControllerTests
{
    private readonly AuthenticatedWebAppFactory _factory;

    public GenerateControllerTests(AuthenticatedWebAppFactory factory)
    {
        _factory = factory;
    }

    private HttpClient CreateClientWithFakeClaude(string auth0Id, string email)
    {
        var fake = new FakeClaudeClient();
        var client = _factory
            .WithWebHostBuilder(b => b.ConfigureServices(services =>
            {
                var existing = services.FirstOrDefault(d => d.ServiceType == typeof(IClaudeClient));
                if (existing is not null) services.Remove(existing);
                services.AddScoped<IClaudeClient>(_ => fake);
            }))
            .CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Auth0Id", auth0Id);
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        return client;
    }

    private async Task<Guid> SeedApprovedTeacherWithLesson(string auth0Id, string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            Auth0UserId = auth0Id,
            Email = email,
            DisplayName = "Test Teacher",
            IsApproved = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Teachers.Add(teacher);

        var lesson = new Lesson
        {
            Id = Guid.NewGuid(),
            TeacherId = teacher.Id,
            Title = "Test Lesson",
            Language = "English",
            CefrLevel = "B1",
            Topic = "Food",
            DurationMinutes = 45,
            Status = "Draft",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Lessons.Add(lesson);
        await db.SaveChangesAsync();

        return lesson.Id;
    }

    [Fact]
    public async Task Vocabulary_ApprovedTeacher_Returns200AndPersistsBlock()
    {
        var auth0Id = "auth0|gen-vocab-ok";
        var email = "gen-vocab-ok@example.com";
        var lessonId = await SeedApprovedTeacherWithLesson(auth0Id, email);
        var client = CreateClientWithFakeClaude(auth0Id, email);

        var request = new GenerateRequest
        {
            LessonId = lessonId,
            Language = "English",
            CefrLevel = "B1",
            Topic = "Food",
            Style = "Conversational",
        };

        var response = await client.PostAsJsonAsync("/api/generate/vocabulary", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<GenerationResultDto>();
        result.Should().NotBeNull();
        result!.BlockType.Should().Be("vocabulary");
        result.GeneratedContent.Should().NotBeNullOrEmpty();
        result.Id.Should().NotBeEmpty();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var block = db.LessonContentBlocks.FirstOrDefault(b => b.Id == result.Id);
        block.Should().NotBeNull();
        block!.LessonId.Should().Be(lessonId);
        block.BlockType.Should().Be("vocabulary");
    }

    [Fact]
    public async Task Grammar_ApprovedTeacher_Returns200()
    {
        var auth0Id = "auth0|gen-grammar-ok";
        var email = "gen-grammar-ok@example.com";
        var lessonId = await SeedApprovedTeacherWithLesson(auth0Id, email);
        var client = CreateClientWithFakeClaude(auth0Id, email);

        var request = new GenerateRequest
        {
            LessonId = lessonId,
            Language = "Spanish",
            CefrLevel = "B1",
            Topic = "Past tense",
            Style = "Academic",
        };

        var response = await client.PostAsJsonAsync("/api/generate/grammar", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<GenerationResultDto>();
        result!.BlockType.Should().Be("grammar");
    }

    [Fact]
    public async Task Vocabulary_UnapprovedTeacher_Returns403()
    {
        var auth0Id = "auth0|gen-unapproved";
        var email = "gen-unapproved@example.com";

        // Seed unapproved teacher + lesson
        Guid lessonId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var teacher = new Teacher
            {
                Id = Guid.NewGuid(),
                Auth0UserId = auth0Id,
                Email = email,
                DisplayName = "Unapproved",
                IsApproved = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.Teachers.Add(teacher);
            var lesson = new Lesson
            {
                Id = Guid.NewGuid(),
                TeacherId = teacher.Id,
                Title = "L",
                Language = "English",
                CefrLevel = "A1",
                Topic = "T",
                DurationMinutes = 30,
                Status = "Draft",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.Lessons.Add(lesson);
            await db.SaveChangesAsync();
            lessonId = lesson.Id;
        }

        var client = CreateClientWithFakeClaude(auth0Id, email);
        var request = new GenerateRequest
        {
            LessonId = lessonId,
            Language = "English",
            CefrLevel = "A1",
            Topic = "Greetings",
        };

        var response = await client.PostAsJsonAsync("/api/generate/vocabulary", request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Vocabulary_UnknownLesson_Returns404()
    {
        var auth0Id = "auth0|gen-no-lesson";
        var email = "gen-no-lesson@example.com";
        await SeedApprovedTeacherWithLesson(auth0Id, email);
        var client = CreateClientWithFakeClaude(auth0Id, email);

        var request = new GenerateRequest
        {
            LessonId = Guid.NewGuid(),
            Language = "English",
            CefrLevel = "B1",
            Topic = "Food",
        };

        var response = await client.PostAsJsonAsync("/api/generate/vocabulary", request);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Vocabulary_MissingRequiredFields_Returns400()
    {
        var auth0Id = "auth0|gen-bad-request";
        var email = "gen-bad-request@example.com";
        var lessonId = await SeedApprovedTeacherWithLesson(auth0Id, email);
        var client = CreateClientWithFakeClaude(auth0Id, email);

        // Missing Language, CefrLevel, Topic
        var request = new { LessonId = lessonId };

        var response = await client.PostAsJsonAsync("/api/generate/vocabulary", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // --- Streaming endpoint tests ---

    [Fact]
    public async Task Stream_Returns200WithSseContentType_WhenRequestIsValid()
    {
        var auth0Id = "auth0|stream-ok";
        var email = "stream-ok@example.com";
        var lessonId = await SeedApprovedTeacherWithLesson(auth0Id, email);
        var client = CreateClientWithFakeClaude(auth0Id, email);

        var request = new GenerateRequest
        {
            LessonId = lessonId,
            Language = "English",
            CefrLevel = "B1",
            Topic = "Food",
        };

        var response = await client.PostAsJsonAsync("/api/generate/vocabulary/stream", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().Be("text/event-stream");
    }

    [Fact]
    public async Task Stream_ReturnsBodyWithDoneMarker()
    {
        var auth0Id = "auth0|stream-done";
        var email = "stream-done@example.com";
        var lessonId = await SeedApprovedTeacherWithLesson(auth0Id, email);
        var client = CreateClientWithFakeClaude(auth0Id, email);

        var request = new GenerateRequest
        {
            LessonId = lessonId,
            Language = "Spanish",
            CefrLevel = "A2",
            Topic = "Numbers",
        };

        var response = await client.PostAsJsonAsync("/api/generate/grammar/stream", request);
        var body = await response.Content.ReadAsStringAsync();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body.Should().Contain("data: [DONE]");
    }

    [Fact]
    public async Task Stream_Returns404_ForUnknownTaskType()
    {
        var auth0Id = "auth0|stream-unknown-type";
        var email = "stream-unknown-type@example.com";
        // Seed a real lesson so [ApiController] model validation passes; taskType check fires before any DB lookup
        var lessonId = await SeedApprovedTeacherWithLesson(auth0Id, email);
        var client = CreateClientWithFakeClaude(auth0Id, email);

        var request = new GenerateRequest
        {
            LessonId = lessonId,
            Language = "English",
            CefrLevel = "B1",
            Topic = "Food",
        };

        var response = await client.PostAsJsonAsync("/api/generate/nonexistent/stream", request);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Stream_Returns403_WhenTeacherNotApproved()
    {
        var auth0Id = "auth0|stream-unapproved";
        var email = "stream-unapproved@example.com";

        Guid lessonId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var teacher = new Teacher
            {
                Id = Guid.NewGuid(),
                Auth0UserId = auth0Id,
                Email = email,
                DisplayName = "Unapproved",
                IsApproved = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.Teachers.Add(teacher);
            var lesson = new Lesson
            {
                Id = Guid.NewGuid(),
                TeacherId = teacher.Id,
                Title = "L",
                Language = "English",
                CefrLevel = "A1",
                Topic = "T",
                DurationMinutes = 30,
                Status = "Draft",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.Lessons.Add(lesson);
            await db.SaveChangesAsync();
            lessonId = lesson.Id;
        }

        var client = CreateClientWithFakeClaude(auth0Id, email);
        var request = new GenerateRequest
        {
            LessonId = lessonId,
            Language = "English",
            CefrLevel = "A1",
            Topic = "Greetings",
        };

        var response = await client.PostAsJsonAsync("/api/generate/vocabulary/stream", request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
