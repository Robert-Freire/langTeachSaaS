using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

// FakePromptService is defined in CurriculumGenerationServiceTests.cs (internal scope)

file sealed class ProfileExtractionClaudeClient : IClaudeClient
{
    private readonly Func<ClaudeRequest, ClaudeResponse>? _handler;
    private readonly Exception? _exception;
    private readonly string? _fixedJson;
    public ClaudeRequest? LastRequest { get; private set; }

    public ProfileExtractionClaudeClient(string fixedJson) => _fixedJson = fixedJson;
    public ProfileExtractionClaudeClient(Exception exception) => _exception = exception;
    public ProfileExtractionClaudeClient(Func<ClaudeRequest, ClaudeResponse> handler) => _handler = handler;

    public Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default)
    {
        LastRequest = request;
        if (_exception is not null) throw _exception;
        if (_fixedJson is not null)
            return Task.FromResult(new ClaudeResponse(_fixedJson, "claude-haiku", 10, 20));
        return Task.FromResult(_handler!(request));
    }

    public Task<T> CompleteWithToolAsync<T>(ClaudeRequest request, ClaudeToolDefinition tool, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public async IAsyncEnumerable<string> StreamAsync(ClaudeRequest request, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        await Task.Yield();
        yield return "{}";
    }
}

public class StudentProfileExtractionServiceTests
{
    private static readonly IPromptService FakePrompts = new FakePromptService();

    private static StudentProfileExtractionService CreateSut(string fixedJson) =>
        new(new ProfileExtractionClaudeClient(fixedJson), FakePrompts, NullLogger<StudentProfileExtractionService>.Instance);

    [Fact]
    public void ParseResponse_ExtractsAllScalarFields()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "name": "María García",
              "birthYear": 1990,
              "profession": "Engineer",
              "countryOfResidence": "Spain",
              "cityOfResidence": "Madrid",
              "reasonForStudying": "Work promotion",
              "nativeLanguages": ["Spanish"],
              "spokenLanguages": ["English", "French"],
              "cefrLevel": "B2",
              "officialCefrLevel": "B1",
              "shortTermObjectives": [],
              "difficulties": [],
              "teachingTodoTexts": [],
              "interests": ["Travel", "Cooking"]
            }
            """;

        var result = sut.ParseResponse(json);

        result.Name.Should().Be("María García");
        result.BirthYear.Should().Be(1990);
        result.Profession.Should().Be("Engineer");
        result.CountryOfResidence.Should().Be("Spain");
        result.CityOfResidence.Should().Be("Madrid");
        result.ReasonForStudying.Should().Be("Work promotion");
        result.NativeLanguages.Should().BeEquivalentTo(["Spanish"]);
        result.SpokenLanguages.Should().BeEquivalentTo(["English", "French"]);
        result.CefrLevel.Should().Be("B2");
        result.OfficialCefrLevel.Should().Be("B1");
        result.Interests.Should().BeEquivalentTo(["Travel", "Cooking"]);
    }

    [Fact]
    public void ParseResponse_ExtractsShortTermObjectives()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "shortTermObjectives": [
                {"text": "Pass B2 exam", "targetDate": "2026-06-30"},
                {"text": "Improve speaking fluency", "targetDate": null}
              ],
              "difficulties": [], "nativeLanguages": [], "spokenLanguages": [],
              "teachingTodoTexts": [], "interests": []
            }
            """;

        var result = sut.ParseResponse(json);

        result.ShortTermObjectives.Should().HaveCount(2);
        result.ShortTermObjectives[0].Text.Should().Be("Pass B2 exam");
        result.ShortTermObjectives[0].TargetDate.Should().Be("2026-06-30");
        result.ShortTermObjectives[1].Text.Should().Be("Improve speaking fluency");
        result.ShortTermObjectives[1].TargetDate.Should().BeNull();
    }

    [Fact]
    public void ParseResponse_ExtractsDifficulties()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "difficulties": [
                {"description": "Confuses ser and estar", "competency": "Grammar", "subcategory": "ser/estar"}
              ],
              "shortTermObjectives": [], "nativeLanguages": [], "spokenLanguages": [],
              "teachingTodoTexts": [], "interests": []
            }
            """;

        var result = sut.ParseResponse(json);

        result.Difficulties.Should().HaveCount(1);
        result.Difficulties[0].Description.Should().Be("Confuses ser and estar");
        result.Difficulties[0].Competency.Should().Be("Grammar");
        result.Difficulties[0].Subcategory.Should().Be("ser/estar");
    }

    [Fact]
    public void ParseResponse_ReturnsAllNullsAndEmptyLists_WhenJsonIsEmpty()
    {
        var sut = CreateSut("{}");

        var result = sut.ParseResponse("{}");

        result.Name.Should().BeNull();
        result.BirthYear.Should().BeNull();
        result.Profession.Should().BeNull();
        result.CefrLevel.Should().BeNull();
        result.NativeLanguages.Should().BeEmpty();
        result.SpokenLanguages.Should().BeEmpty();
        result.ShortTermObjectives.Should().BeEmpty();
        result.Difficulties.Should().BeEmpty();
        result.TeachingTodoTexts.Should().BeEmpty();
        result.Interests.Should().BeEmpty();
    }

    [Fact]
    public void ParseResponse_HandlesInvalidJson_ReturnsEmpty()
    {
        var sut = CreateSut("{}");

        var result = sut.ParseResponse("this is not json");

        result.Name.Should().BeNull();
        result.NativeLanguages.Should().BeEmpty();
        result.Difficulties.Should().BeEmpty();
    }

    [Fact]
    public void ParseResponse_StripsFencesBeforeParsing()
    {
        var sut = CreateSut("{}");
        var fenced = "```json\n{\"name\":\"Ana\"}\n```";

        var result = sut.ParseResponse(fenced);

        result.Name.Should().Be("Ana");
    }

    [Theory]
    [InlineData("B1", "B1")]
    [InlineData("A2+", "A2+")]
    [InlineData("C1", "C1")]
    [InlineData("Intermediate", null)]
    [InlineData("B3", null)]
    public void ParseResponse_ValidatesCefrLevel(string input, string? expected)
    {
        var sut = CreateSut("{}");
        var json = $$"""{"cefrLevel":"{{input}}","nativeLanguages":[],"spokenLanguages":[],"shortTermObjectives":[],"difficulties":[],"teachingTodoTexts":[],"interests":[]}""";

        var result = sut.ParseResponse(json);

        result.CefrLevel.Should().Be(expected);
    }

    [Fact]
    public void ParseResponse_ObjectiveDateIsNullWhenNotIsoFormat()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "shortTermObjectives": [{"text": "Get a job", "targetDate": "next summer"}],
              "difficulties": [], "nativeLanguages": [], "spokenLanguages": [],
              "teachingTodoTexts": [], "interests": []
            }
            """;

        var result = sut.ParseResponse(json);

        result.ShortTermObjectives[0].TargetDate.Should().BeNull();
    }

    [Fact]
    public void ParseResponse_SkipsDifficultyMissingRequiredFields()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "difficulties": [
                {"description": "Valid entry", "competency": "Grammar", "subcategory": "ser/estar"},
                {"competency": "Vocabulary"}
              ],
              "shortTermObjectives": [], "nativeLanguages": [], "spokenLanguages": [],
              "teachingTodoTexts": [], "interests": []
            }
            """;

        var result = sut.ParseResponse(json);

        result.Difficulties.Should().HaveCount(1);
    }

    [Fact]
    public async Task ExtractAsync_WhenClaudeFails_ReturnsEmpty_NoException()
    {
        var client = new ProfileExtractionClaudeClient(new HttpRequestException("network error"));
        var sut = new StudentProfileExtractionService(client, FakePrompts, NullLogger<StudentProfileExtractionService>.Instance);

        var result = await sut.ExtractAsync("some teacher notes");

        result.Name.Should().BeNull();
        result.NativeLanguages.Should().BeEmpty();
        result.Difficulties.Should().BeEmpty();
    }

    [Fact]
    public async Task ExtractAsync_WhenClaudeReturnsMalformedJson_ReturnsEmpty_NoException()
    {
        var sut = CreateSut("definitely not json {{{{");

        var result = await sut.ExtractAsync("some teacher notes");

        result.Name.Should().BeNull();
        result.NativeLanguages.Should().BeEmpty();
    }

    [Fact]
    public async Task ExtractAsync_WhenClaudeReturnsValidJson_ReturnsPopulatedDto()
    {
        var validJson = """
            {
              "name": "Ana López",
              "birthYear": 1988,
              "profession": "Doctor",
              "countryOfResidence": "Mexico",
              "cityOfResidence": "Ciudad de México",
              "reasonForStudying": "Move to Spain",
              "nativeLanguages": ["Spanish"],
              "spokenLanguages": ["English"],
              "cefrLevel": "B1",
              "officialCefrLevel": null,
              "shortTermObjectives": [{"text": "Improve writing", "targetDate": null}],
              "difficulties": [{"description": "Struggles with subjunctive", "competency": "Grammar", "subcategory": "subjunctive"}],
              "teachingTodoTexts": ["Send grammar exercises"],
              "interests": ["Cinema", "Photography"]
            }
            """;
        var sut = CreateSut(validJson);

        var result = await sut.ExtractAsync("Ana López es médica, nació en 1988...");

        result.Name.Should().Be("Ana López");
        result.BirthYear.Should().Be(1988);
        result.Profession.Should().Be("Doctor");
        result.CefrLevel.Should().Be("B1");
        result.NativeLanguages.Should().BeEquivalentTo(["Spanish"]);
        result.Difficulties.Should().HaveCount(1);
        result.ShortTermObjectives.Should().HaveCount(1);
        result.TeachingTodoTexts.Should().BeEquivalentTo(["Send grammar exercises"]);
        result.Interests.Should().BeEquivalentTo(["Cinema", "Photography"]);
    }

    [Fact]
    public async Task ExtractAsync_CallsClaudeWithHaikuModel()
    {
        ClaudeRequest? captured = null;
        var client = new ProfileExtractionClaudeClient(req =>
        {
            captured = req;
            return new ClaudeResponse("""{"nativeLanguages":[],"spokenLanguages":[],"shortTermObjectives":[],"difficulties":[],"teachingTodoTexts":[],"interests":[]}""", "claude-haiku", 10, 20);
        });
        var realPrompts = new PromptService(
            new SectionProfileService(NullLogger<SectionProfileService>.Instance),
            new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, new SectionProfileService(NullLogger<SectionProfileService>.Instance)),
            NullLogger<PromptService>.Instance,
            new NullContentSchemas());
        var sut = new StudentProfileExtractionService(client, realPrompts, NullLogger<StudentProfileExtractionService>.Instance);

        await sut.ExtractAsync("María estudia español para trabajar en Madrid.");

        captured.Should().NotBeNull();
        captured!.Model.Should().Be(ClaudeModel.Haiku);
    }

    [Fact]
    public void ParseResponse_ExtractsSkillLevelOverrides()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "skillLevel": { "reading": "C1", "writing": "B2", "speaking": "B2" },
              "nativeLanguages": [], "spokenLanguages": [], "shortTermObjectives": [],
              "difficulties": [], "teachingTodoTexts": [], "interests": []
            }
            """;

        var result = sut.ParseResponse(json);

        result.SkillLevelReading.Should().Be("C1");
        result.SkillLevelWriting.Should().Be("B2");
        result.SkillLevelSpeaking.Should().Be("B2");
        result.SkillLevelListening.Should().BeNull();
    }

    [Fact]
    public void ParseResponse_SkillLevel_AcceptsSubLevels()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "skillLevel": { "reading": "B1.2" },
              "nativeLanguages": [], "spokenLanguages": [], "shortTermObjectives": [],
              "difficulties": [], "teachingTodoTexts": [], "interests": []
            }
            """;

        var result = sut.ParseResponse(json);

        result.SkillLevelReading.Should().Be("B1.2");
    }

    [Fact]
    public void ParseResponse_SkillLevel_NullWhenKeyMissing()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "nativeLanguages": [], "spokenLanguages": [], "shortTermObjectives": [],
              "difficulties": [], "teachingTodoTexts": [], "interests": []
            }
            """;

        var result = sut.ParseResponse(json);

        result.SkillLevelReading.Should().BeNull();
        result.SkillLevelWriting.Should().BeNull();
        result.SkillLevelSpeaking.Should().BeNull();
        result.SkillLevelListening.Should().BeNull();
    }
}

file sealed class NullContentSchemas : IContentSchemaService
{
    public string? GetSchema(string contentType) => null;
}
