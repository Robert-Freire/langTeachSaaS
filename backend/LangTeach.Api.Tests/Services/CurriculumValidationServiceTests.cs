using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

public class CurriculumValidationServiceTests
{
    private static CurriculumValidationService BuildService(string claudeResponse) =>
        new(new ConfigurableClaudeClient(claudeResponse), NullLogger<CurriculumValidationService>.Instance);

    private static List<CurriculumEntry> Entries(params string[] grammarFocuses) =>
        grammarFocuses.Select((g, i) => new CurriculumEntry
        {
            Id = Guid.NewGuid(),
            OrderIndex = i + 1,
            Topic = $"Session {i + 1}",
            GrammarFocus = g,
            Competencies = "reading",
            Status = "planned"
        }).ToList();

    private static readonly IReadOnlyList<string> A1Grammar =
        ["Present Simple", "Can + Infinitive", "Articles"];

    [Fact]
    public async Task Returns_EmptyList_WhenNoEntriesHaveGrammarFocus()
    {
        var sut = BuildService("[]");
        var entries = new List<CurriculumEntry>
        {
            new() { Id = Guid.NewGuid(), OrderIndex = 1, Topic = "Topic", GrammarFocus = null, Status = "planned" }
        };

        var result = await sut.ValidateAsync(entries, "A1", A1Grammar);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task Returns_EmptyList_WhenAllowedGrammarIsEmpty()
    {
        var sut = BuildService("[]");
        var entries = Entries("Present Simple");

        var result = await sut.ValidateAsync(entries, "A1", []);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task Returns_EmptyList_WhenClaudeReportsNoViolations()
    {
        var sut = BuildService("[]");
        var entries = Entries("Present Simple");

        var result = await sut.ValidateAsync(entries, "A1", A1Grammar);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task Returns_Warnings_WhenClaudeReportsOutOfLevelStructures()
    {
        var claudeResponse = """
            [{"sessionIndex":1,"grammarFocus":"Subjunctive Mood","flagReason":"Subjunctive is a C1 structure, above the A1 target.","suggestedLevel":"C1"}]
            """;
        var sut = BuildService(claudeResponse);
        var entries = Entries("Subjunctive Mood");

        var result = await sut.ValidateAsync(entries, "A1", A1Grammar);

        result.Should().HaveCount(1);
        result[0].SessionIndex.Should().Be(1);
        result[0].GrammarFocus.Should().Be("Subjunctive Mood");
        result[0].FlagReason.Should().Contain("C1");
        result[0].SuggestedLevel.Should().Be("C1");
    }

    [Fact]
    public async Task Returns_EmptyList_WhenClaudeResponseIsInvalidJson()
    {
        var sut = BuildService("not-json");
        var entries = Entries("Some Grammar");

        var result = await sut.ValidateAsync(entries, "A1", A1Grammar);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task Strips_MarkdownCodeFences_BeforeParsing()
    {
        var claudeResponse = "```json\n[{\"sessionIndex\":2,\"grammarFocus\":\"Pluperfect\",\"flagReason\":\"Above level.\",\"suggestedLevel\":\"C1\"}]\n```";
        var sut = BuildService(claudeResponse);
        var entries = Entries("Present Simple", "Pluperfect");

        var result = await sut.ValidateAsync(entries, "A1", A1Grammar);

        result.Should().HaveCount(1);
        result[0].SessionIndex.Should().Be(2);
    }

    [Fact]
    public async Task Returns_Multiple_Warnings_ForMultipleViolations()
    {
        var claudeResponse = """
            [
              {"sessionIndex":1,"grammarFocus":"Subjunctive Mood","flagReason":"C1 structure.","suggestedLevel":"C1"},
              {"sessionIndex":3,"grammarFocus":"Pluperfect","flagReason":"C1 structure.","suggestedLevel":"C1"}
            ]
            """;
        var sut = BuildService(claudeResponse);
        var entries = Entries("Subjunctive Mood", "Present Simple", "Pluperfect");

        var result = await sut.ValidateAsync(entries, "A1", A1Grammar);

        result.Should().HaveCount(2);
        result[0].SessionIndex.Should().Be(1);
        result[1].SessionIndex.Should().Be(3);
    }
}
