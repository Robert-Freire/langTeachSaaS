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
        result.SessionDate.Should().BeNull();
        result.SuggestedDifficulties.Should().BeEmpty();
    }

    [Fact]
    public void ParseResponse_ExtractsSuggestedDifficulties()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "whatWasCovered": "Ser vs estar",
              "areasToImprove": null,
              "emotionalSignals": null,
              "homeworkAssigned": null,
              "nextLessonIdeas": null,
              "suggestedDifficulties": [
                {
                  "description": "Student confuses ser and estar consistently",
                  "competency": "Grammar",
                  "subcategory": "ser/estar",
                  "severity": "high"
                },
                {
                  "description": "Struggles a little with subjunctive forms",
                  "competency": "Grammar",
                  "subcategory": "subjunctive",
                  "severity": "low"
                }
              ]
            }
            """;

        var result = sut.ParseResponse(json);

        result.SuggestedDifficulties.Should().HaveCount(2);
        result.SuggestedDifficulties[0].Description.Should().Be("Student confuses ser and estar consistently");
        result.SuggestedDifficulties[0].Competency.Should().Be("Grammar");
        result.SuggestedDifficulties[0].Subcategory.Should().Be("ser/estar");
        result.SuggestedDifficulties[0].Severity.Should().Be("high");
        result.SuggestedDifficulties[1].Severity.Should().Be("low");
    }

    [Fact]
    public void ParseResponse_SkipsEntriesWithInvalidCompetency()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "whatWasCovered": null,
              "areasToImprove": null,
              "emotionalSignals": null,
              "homeworkAssigned": null,
              "nextLessonIdeas": null,
              "suggestedDifficulties": [
                {
                  "description": "Valid entry",
                  "competency": "Grammar",
                  "subcategory": "ser/estar",
                  "severity": "medium"
                },
                {
                  "description": "Invalid competency entry",
                  "competency": "Spelling",
                  "subcategory": "accents",
                  "severity": "low"
                }
              ]
            }
            """;

        var result = sut.ParseResponse(json);

        result.SuggestedDifficulties.Should().HaveCount(1);
        result.SuggestedDifficulties[0].Competency.Should().Be("Grammar");
    }

    [Fact]
    public void ParseResponse_HandlesMissingSuggestedDifficultiesKey_ReturnsEmpty()
    {
        var sut = CreateSut("{}");
        var json = """{"whatWasCovered": "Test", "areasToImprove": null, "emotionalSignals": null, "homeworkAssigned": null, "nextLessonIdeas": null}""";

        var result = sut.ParseResponse(json);

        result.SuggestedDifficulties.Should().BeEmpty();
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
        result.SuggestedDifficulties.Should().BeEmpty();
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
        result.SessionDate.Should().BeNull();
    }

    [Fact]
    public void BuildSystemPrompt_ContainsLanguagePreservationInstruction()
    {
        var today = new DateOnly(2026, 4, 11);
        var prompt = ReflectionExtractionService.BuildSystemPrompt(today);

        prompt.Should().Contain("translate");
        prompt.Should().Contain("sessionDate");
        prompt.Should().Contain("2026-04-11");
    }

    [Fact]
    public void BuildSystemPrompt_InjectsDayOfWeekAndDate()
    {
        var today = new DateOnly(2026, 4, 11); // Saturday
        var prompt = ReflectionExtractionService.BuildSystemPrompt(today);

        prompt.Should().Contain("Saturday");
        prompt.Should().Contain("2026-04-11");
        prompt.Should().Contain("hoy");
        prompt.Should().Contain("ayer");
        prompt.Should().Contain("el pasado lunes");
        prompt.Should().Contain("el lunes pasado");
    }

    [Fact]
    public void ParseResponse_ExtractsSessionDate()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "whatWasCovered": "los condicionales",
              "areasToImprove": null,
              "emotionalSignals": null,
              "homeworkAssigned": null,
              "nextLessonIdeas": null,
              "sessionDate": "2026-04-08",
              "suggestedDifficulties": []
            }
            """;

        var result = sut.ParseResponse(json);

        result.SessionDate.Should().Be("2026-04-08");
        result.WhatWasCovered.Should().Be("los condicionales");
    }

    [Fact]
    public void ParseResponse_SessionDateIsNullWhenAbsent()
    {
        var sut = CreateSut("{}");
        var json = """{"whatWasCovered": "Vocabulary", "areasToImprove": null, "emotionalSignals": null, "homeworkAssigned": null, "nextLessonIdeas": null}""";

        var result = sut.ParseResponse(json);

        result.SessionDate.Should().BeNull();
    }

    [Fact]
    public void ParseResponse_SessionDateIsNullWhenNotIsoFormat()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "whatWasCovered": null,
              "areasToImprove": null,
              "emotionalSignals": null,
              "homeworkAssigned": null,
              "nextLessonIdeas": null,
              "sessionDate": "martes pasado"
            }
            """;

        var result = sut.ParseResponse(json);

        result.SessionDate.Should().BeNull();
    }

    [Fact]
    public void ParseResponse_SessionDateIsNullWhenExplicitlyNull()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "whatWasCovered": null,
              "areasToImprove": null,
              "emotionalSignals": null,
              "homeworkAssigned": null,
              "nextLessonIdeas": null,
              "sessionDate": null
            }
            """;

        var result = sut.ParseResponse(json);

        result.SessionDate.Should().BeNull();
    }
}
