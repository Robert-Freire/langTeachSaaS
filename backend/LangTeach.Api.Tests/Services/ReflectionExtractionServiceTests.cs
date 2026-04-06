using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

file sealed class ConfigurableClaudeClient : IClaudeClient
{
    private readonly Func<ClaudeRequest, ClaudeResponse>? _handler;
    private readonly Exception? _exception;
    public ClaudeRequest? LastRequest { get; private set; }

    public ConfigurableClaudeClient(Func<ClaudeRequest, ClaudeResponse> handler)
    {
        _handler = handler;
    }

    public ConfigurableClaudeClient(Exception exception)
    {
        _exception = exception;
    }

    public Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default)
    {
        LastRequest = request;
        if (_exception is not null) throw _exception;
        return Task.FromResult(_handler!(request));
    }

    public async IAsyncEnumerable<string> StreamAsync(ClaudeRequest request, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        await Task.Yield();
        yield return "{}";
    }
}

public class ReflectionExtractionServiceTests
{
    private static ReflectionExtractionService CreateSut(string fixedJson) =>
        new(
            new ConfigurableClaudeClient(_ => new ClaudeResponse(fixedJson, "claude-haiku", 10, 20)),
            NullLogger<ReflectionExtractionService>.Instance);

    [Fact]
    public void ParseResponse_ExtractsAllFields()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "whatWasCovered": "Past tense verbs",
              "areasToImprove": "Irregular verbs",
              "emotionalSignals": "Very engaged",
              "homeworkAssigned": "Exercises 1-5",
              "nextLessonIdeas": "Present perfect"
            }
            """;

        var result = sut.ParseResponse(json);

        result.WhatWasCovered.Should().Be("Past tense verbs");
        result.AreasToImprove.Should().Be("Irregular verbs");
        result.EmotionalSignals.Should().Be("Very engaged");
        result.HomeworkAssigned.Should().Be("Exercises 1-5");
        result.NextLessonIdeas.Should().Be("Present perfect");
    }

    [Fact]
    public void ParseResponse_HandlesNullFields()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "whatWasCovered": "Ser vs estar",
              "areasToImprove": null,
              "emotionalSignals": null,
              "homeworkAssigned": null,
              "nextLessonIdeas": null
            }
            """;

        var result = sut.ParseResponse(json);

        result.WhatWasCovered.Should().Be("Ser vs estar");
        result.AreasToImprove.Should().BeNull();
        result.EmotionalSignals.Should().BeNull();
        result.HomeworkAssigned.Should().BeNull();
        result.NextLessonIdeas.Should().BeNull();
    }

    [Fact]
    public void ParseResponse_HandlesInvalidJson_ReturnsAllNulls()
    {
        var sut = CreateSut("{}");

        var result = sut.ParseResponse("this is not json");

        result.WhatWasCovered.Should().BeNull();
        result.AreasToImprove.Should().BeNull();
        result.EmotionalSignals.Should().BeNull();
        result.HomeworkAssigned.Should().BeNull();
        result.NextLessonIdeas.Should().BeNull();
    }

    [Fact]
    public void ParseResponse_TreatsWhitespaceOnlyAsNull()
    {
        var sut = CreateSut("{}");
        var json = """{"whatWasCovered": "  ", "areasToImprove": "", "emotionalSignals": null, "homeworkAssigned": null, "nextLessonIdeas": null}""";

        var result = sut.ParseResponse(json);

        result.WhatWasCovered.Should().BeNull();
        result.AreasToImprove.Should().BeNull();
    }

    [Fact]
    public async Task ExtractAsync_CallsClaudeWithHaikuModel()
    {
        ClaudeRequest? captured = null;
        var client = new ConfigurableClaudeClient(r =>
        {
            captured = r;
            return new ClaudeResponse(
                """{"whatWasCovered":"Vocab","areasToImprove":null,"emotionalSignals":null,"homeworkAssigned":null,"nextLessonIdeas":null}""",
                "claude-haiku", 10, 20);
        });
        var sut = new ReflectionExtractionService(client, NullLogger<ReflectionExtractionService>.Instance);

        var result = await sut.ExtractAsync("We practiced vocabulary today.");

        result.WhatWasCovered.Should().Be("Vocab");
        captured.Should().NotBeNull();
        captured!.Model.Should().Be(ClaudeModel.Haiku);
    }

    [Fact]
    public async Task ExtractAsync_WhenClaudeFails_ReturnsAllNulls()
    {
        var client = new ConfigurableClaudeClient(new HttpRequestException("network error"));
        var sut = new ReflectionExtractionService(client, NullLogger<ReflectionExtractionService>.Instance);

        var result = await sut.ExtractAsync("some text");

        result.WhatWasCovered.Should().BeNull();
        result.AreasToImprove.Should().BeNull();
    }
}
