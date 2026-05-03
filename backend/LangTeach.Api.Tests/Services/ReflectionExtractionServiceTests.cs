using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

// FakePromptService, ConfigurableClaudeClient are defined in CurriculumGenerationServiceTests.cs (internal scope)

file sealed class NullContentSchemas : IContentSchemaService
{
    public static readonly NullContentSchemas Instance = new();
    public string? GetSchema(string contentType) => null;
}

file sealed class ReflectionClaudeClient : IClaudeClient
{
    private readonly Func<ClaudeRequest, ClaudeResponse>? _handler;
    private readonly Exception? _exception;
    private readonly string? _fixedJson;
    public ClaudeRequest? LastRequest { get; private set; }

    public ReflectionClaudeClient(Func<ClaudeRequest, ClaudeResponse> handler) => _handler = handler;
    public ReflectionClaudeClient(Exception exception) => _exception = exception;
    public ReflectionClaudeClient(string fixedJson) => _fixedJson = fixedJson;

    public Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default)
    {
        LastRequest = request;
        if (_exception is not null) throw _exception;
        if (_fixedJson is not null)
            return Task.FromResult(new ClaudeResponse(_fixedJson, "claude-haiku", 10, 20));
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
    private static readonly ISectionProfileService ProfileService =
        new SectionProfileService(NullLogger<SectionProfileService>.Instance);

    private static readonly IPedagogyConfigService PedagogyService =
        new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, ProfileService);

    private static readonly IPromptService FakePrompts = new FakePromptService();

    private static ReflectionExtractionService CreateSut(string fixedJson) =>
        new(
            new ReflectionClaudeClient(fixedJson),
            FakePrompts,
            PedagogyService,
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

        result.WhatWasCovered!.Value.Should().Be("Past tense verbs");
        result.WhatWasCovered.Mode.Should().Be(ExtractionMode.Replace); // legacy plain-string fallback
        result.AreasToImprove!.Value.Should().Be("Irregular verbs");
        result.EmotionalSignals.Should().Be("Very engaged");
        result.HomeworkAssigned!.Value.Should().Be("Exercises 1-5");
        result.NextLessonIdeas!.Value.Should().Be("Present perfect");
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

        result.WhatWasCovered!.Value.Should().Be("Ser vs estar");
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
        var client = new ReflectionClaudeClient(r =>
        {
            captured = r;
            return new ClaudeResponse(
                """{"whatWasCovered":"Vocab","areasToImprove":null,"emotionalSignals":null,"homeworkAssigned":null,"nextLessonIdeas":null}""",
                "claude-haiku", 10, 20);
        });
        var sut = new ReflectionExtractionService(client, FakePrompts, PedagogyService, NullLogger<ReflectionExtractionService>.Instance);

        var result = await sut.ExtractAsync("We practiced vocabulary today.");

        result.WhatWasCovered!.Value.Should().Be("Vocab");
        result.SuggestedDifficulties.Should().BeEmpty();
        captured.Should().NotBeNull();
        captured!.Model.Should().Be(ClaudeModel.Haiku);
    }

    [Fact]
    public async Task ExtractAsync_WhenClaudeFails_ReturnsAllNulls()
    {
        var client = new ReflectionClaudeClient(new HttpRequestException("network error"));
        var sut = new ReflectionExtractionService(client, FakePrompts, PedagogyService, NullLogger<ReflectionExtractionService>.Instance);

        var result = await sut.ExtractAsync("some text");

        result.WhatWasCovered.Should().BeNull();
        result.AreasToImprove.Should().BeNull();
        result.SessionDate.Should().BeNull();
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
        result.WhatWasCovered!.Value.Should().Be("los condicionales");
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

    [Fact]
    public void ParseResponse_ReturnsRawExtractionJson()
    {
        var sut = CreateSut("{}");
        var json = """{"whatWasCovered":"ser vs estar"}""";

        var result = sut.ParseResponse(json);

        // RawExtractionJson stores the fence-stripped (cleaned) content, which equals json when no fences present
        result.RawExtractionJson.Should().Be(json);
    }

    [Fact]
    public void ParseResponse_StripsFencesBeforeStoringRawExtractionJson()
    {
        var sut = CreateSut("{}");
        var fenced = "```json\n{\"whatWasCovered\":\"ser vs estar\"}\n```";
        var expected = "{\"whatWasCovered\":\"ser vs estar\"}";

        var result = sut.ParseResponse(fenced);

        result.RawExtractionJson.Should().Be(expected);
    }

    [Fact]
    public void ParseResponse_InvalidJson_ReturnsNullRawExtractionJson()
    {
        var sut = CreateSut("{}");

        var result = sut.ParseResponse("not valid json");

        result.RawExtractionJson.Should().BeNull();
    }

    [Fact]
    public async Task ExtractAsync_ClaudeApiSuccess_RawExtractionJsonMatchesResponse()
    {
        var rawJson = """{"whatWasCovered":"verbos irregulares"}""";
        var sut = new ReflectionExtractionService(
            new ReflectionClaudeClient(rawJson),
            FakePrompts,
            PedagogyService,
            NullLogger<ReflectionExtractionService>.Instance);

        var result = await sut.ExtractAsync("Hoy trabajamos los verbos", ct: CancellationToken.None);

        result.RawExtractionJson.Should().Be(rawJson);
    }

    [Fact]
    public void ParseResponse_ExtractsSessionTitle()
    {
        var sut = CreateSut("{}");
        var json = """
            {
                "whatWasCovered": "Preterite tense",
                "areasToImprove": null,
                "emotionalSignals": null,
                "homeworkAssigned": null,
                "nextLessonIdeas": null,
                "sessionDate": null,
                "sessionTitle": "Preterite vs Imperfect",
                "suggestedDifficulties": []
            }
            """;

        var result = sut.ParseResponse(json);

        result.SessionTitle.Should().Be("Preterite vs Imperfect");
    }

    [Fact]
    public void ParseResponse_SessionTitleIsNullWhenAbsent()
    {
        var sut = CreateSut("{}");
        var json = """{"whatWasCovered":"something","suggestedDifficulties":[]}""";

        var result = sut.ParseResponse(json);

        result.SessionTitle.Should().BeNull();
    }

    [Fact]
    public void ParseResponse_ExtractsTopicTags()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "suggestedDifficulties": [],
              "topicTags": [
                {"tag": "Subjuntivo presente", "category": "Grammar"},
                {"tag": "Vocabulario de restaurante"}
              ]
            }
            """;

        var result = sut.ParseResponse(json);

        result.TopicTags.Should().HaveCount(2);
        result.TopicTags[0].Tag.Should().Be("Subjuntivo presente");
        result.TopicTags[0].Category.Should().Be("Grammar");
        result.TopicTags[1].Tag.Should().Be("Vocabulario de restaurante");
        result.TopicTags[1].Category.Should().BeNull();
    }

    [Fact]
    public void ParseResponse_ExtractsTopicTags_EmptyWhenAbsent()
    {
        var sut = CreateSut("{}");
        var result = sut.ParseResponse("""{"suggestedDifficulties":[]}""");
        result.TopicTags.Should().BeEmpty();
    }

    [Theory]
    [InlineData("Done", ExtractedHomeworkStatus.Done)]
    [InlineData("Partial", ExtractedHomeworkStatus.Partial)]
    [InlineData("NotDone", ExtractedHomeworkStatus.NotDone)]
    public void ParseResponse_ExtractsPreviousHomeworkStatus_ValidValues(string jsonValue, ExtractedHomeworkStatus expected)
    {
        var sut = CreateSut("{}");
        var json = $$"""{"suggestedDifficulties":[],"previousHomeworkStatus":"{{jsonValue}}"}""";

        var result = sut.ParseResponse(json);

        result.PreviousHomeworkStatus.Should().Be(expected);
    }

    [Fact]
    public void ParseResponse_ExtractsPreviousHomeworkStatus_InvalidValue_ReturnsNull()
    {
        var sut = CreateSut("{}");
        var json = """{"suggestedDifficulties":[],"previousHomeworkStatus":"maybe"}""";

        var result = sut.ParseResponse(json);

        result.PreviousHomeworkStatus.Should().BeNull();
    }

    [Fact]
    public void ParseResponse_ExtractsTeachingTodos()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "suggestedDifficulties": [],
              "teachingTodos": ["Trabajar conectores adversativos", "Practicar el subjuntivo en concesivas"]
            }
            """;

        var result = sut.ParseResponse(json);

        result.TeachingTodos.Should().BeEquivalentTo(["Trabajar conectores adversativos", "Practicar el subjuntivo en concesivas"]);
    }

    [Fact]
    public void ParseResponse_ExtractsTeacherFollowups()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "suggestedDifficulties": [],
              "teacherFollowups": ["Enviar el PDF de conectores", "Mandar el audio de la clase"]
            }
            """;

        var result = sut.ParseResponse(json);

        result.TeacherFollowups.Should().BeEquivalentTo(["Enviar el PDF de conectores", "Mandar el audio de la clase"]);
    }

    [Fact]
    public void ParseResponse_ExtractsLevelReassessmentDurationIsCancelled()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "suggestedDifficulties": [],
              "levelReassessment": "B2",
              "durationMinutes": 60,
              "isCancelled": true
            }
            """;

        var result = sut.ParseResponse(json);

        result.LevelReassessment.Should().Be("B2");
        result.DurationMinutes.Should().Be(60);
        result.IsCancelled.Should().BeTrue();
    }

    [Theory]
    [InlineData("B1", "B1")]
    [InlineData("A2", "A2")]
    [InlineData("C1", "C1")]
    [InlineData("A2+", null)]
    [InlineData("B2.1", null)]
    [InlineData("Intermediate", null)]
    [InlineData("B3", null)]
    [InlineData("", null)]
    public void ParseResponse_ValidatesCefrLevelReassessment(string input, string? expected)
    {
        var sut = CreateSut("{}");
        var json = $$"""{"suggestedDifficulties":[],"levelReassessment":"{{input}}"}""";

        var result = sut.ParseResponse(json);

        result.LevelReassessment.Should().Be(expected);
    }

    [Fact]
    public void ParseResponse_ExtractsDifficultiesWorkedOn()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "suggestedDifficulties": [],
              "difficultiesWorkedOn": ["Subjuntivo en oraciones temporales", "Ser vs Estar"]
            }
            """;

        var result = sut.ParseResponse(json);

        result.DifficultiesWorkedOn.Should().BeEquivalentTo(["Subjuntivo en oraciones temporales", "Ser vs Estar"]);
    }

    [Fact]
    public void ParseResponse_ExtractsSessionStartTime()
    {
        var sut = CreateSut("{}");
        var json = """{"suggestedDifficulties":[],"sessionStartTime":"09:30"}""";

        var result = sut.ParseResponse(json);

        result.SessionStartTime.Should().Be("09:30");
    }

    [Fact]
    public void ParseResponse_SessionStartTimeIsNullWhenAbsent()
    {
        var sut = CreateSut("{}");
        var json = """{"suggestedDifficulties":[]}""";

        var result = sut.ParseResponse(json);

        result.SessionStartTime.Should().BeNull();
    }

    [Theory]
    [InlineData("9:30")]
    [InlineData("9am")]
    [InlineData("morning")]
    [InlineData("09:30:00")]
    public void ParseResponse_SessionStartTimeIsNullWhenNotHhMm(string raw)
    {
        var sut = CreateSut("{}");
        var json = $$"""{"suggestedDifficulties":[],"sessionStartTime":"{{raw}}"}""";

        var result = sut.ParseResponse(json);

        result.SessionStartTime.Should().BeNull();
    }

    [Fact]
    public async Task ExtractAsync_PassesDifficultiesToContext()
    {
        var difficulties = new List<string> { "Subjuntivo en concesivas", "Ser vs Estar" };
        ClaudeRequest? captured = null;
        var client = new ReflectionClaudeClient(req =>
        {
            captured = req;
            return new ClaudeResponse("""{"suggestedDifficulties":[],"topicTags":[],"teachingTodos":[],"teacherFollowups":[],"difficultiesWorkedOn":[]}""", "claude-haiku", 10, 50);
        });
        var realPrompts = new PromptService(
            new SectionProfileService(NullLogger<SectionProfileService>.Instance),
            PedagogyService,
            NullLogger<PromptService>.Instance,
            NullContentSchemas.Instance);
        var sut = new ReflectionExtractionService(
            client,
            realPrompts,
            PedagogyService,
            NullLogger<ReflectionExtractionService>.Instance);

        await sut.ExtractAsync("text", difficulties);

        captured.Should().NotBeNull();
        captured!.SystemPrompt.Should().Contain("Subjuntivo en concesivas");
        captured.SystemPrompt.Should().Contain("Ser vs Estar");
    }

    [Fact]
    public async Task ExtractAsync_PassesHasOpenSession_False_ToPrompt()
    {
        ClaudeRequest? captured = null;
        var client = new ReflectionClaudeClient(req =>
        {
            captured = req;
            return new ClaudeResponse("""{"suggestedDifficulties":[],"topicTags":[],"teachingTodos":[],"teacherFollowups":[],"difficultiesWorkedOn":[]}""", "claude-haiku", 10, 50);
        });
        var realPrompts = new PromptService(
            new SectionProfileService(NullLogger<SectionProfileService>.Instance),
            PedagogyService,
            NullLogger<PromptService>.Instance,
            NullContentSchemas.Instance);
        var sut = new ReflectionExtractionService(
            client,
            realPrompts,
            PedagogyService,
            NullLogger<ReflectionExtractionService>.Instance);

        await sut.ExtractAsync("Le di clase ayer, trabajamos el subjuntivo.", hasOpenSession: false);

        captured!.SystemPrompt.Should().Contain("no open session in scope");
    }

    [Fact]
    public async Task ExtractAsync_PassesHasOpenSession_True_ToPrompt()
    {
        ClaudeRequest? captured = null;
        var client = new ReflectionClaudeClient(req =>
        {
            captured = req;
            return new ClaudeResponse("""{"suggestedDifficulties":[],"topicTags":[],"teachingTodos":[],"teacherFollowups":[],"difficultiesWorkedOn":[]}""", "claude-haiku", 10, 50);
        });
        var realPrompts = new PromptService(
            new SectionProfileService(NullLogger<SectionProfileService>.Instance),
            PedagogyService,
            NullLogger<PromptService>.Instance,
            NullContentSchemas.Instance);
        var sut = new ReflectionExtractionService(
            client,
            realPrompts,
            PedagogyService,
            NullLogger<ReflectionExtractionService>.Instance);

        await sut.ExtractAsync("Hoy trabajamos el subjuntivo.", hasOpenSession: true);

        captured!.SystemPrompt.Should().NotContain("no open session in scope");
    }

    [Fact]
    public void ParseResponse_ParsesModeAppend()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "whatWasCovered": { "value": "Present perfect", "mode": "append" },
              "nextLessonIdeas": { "value": "Subjunctive", "mode": "append" }
            }
            """;

        var result = sut.ParseResponse(json);

        result.WhatWasCovered!.Value.Should().Be("Present perfect");
        result.WhatWasCovered.Mode.Should().Be(ExtractionMode.Append);
        result.NextLessonIdeas!.Value.Should().Be("Subjunctive");
        result.NextLessonIdeas.Mode.Should().Be(ExtractionMode.Append);
    }

    [Fact]
    public void ParseResponse_ParsesModeReplace()
    {
        var sut = CreateSut("{}");
        var json = """
            {
              "homeworkAssigned": { "value": "Page 5 exercises", "mode": "replace" },
              "areasToImprove": { "value": "Verb conjugation", "mode": "replace" }
            }
            """;

        var result = sut.ParseResponse(json);

        result.HomeworkAssigned!.Value.Should().Be("Page 5 exercises");
        result.HomeworkAssigned.Mode.Should().Be(ExtractionMode.Replace);
        result.AreasToImprove!.Value.Should().Be("Verb conjugation");
        result.AreasToImprove.Mode.Should().Be(ExtractionMode.Replace);
    }

    [Fact]
    public void ParseResponse_ParsesModeSkip()
    {
        var sut = CreateSut("{}");
        var json = """{"whatWasCovered": { "value": "Past tense", "mode": "skip" }}""";

        var result = sut.ParseResponse(json);

        result.WhatWasCovered!.Mode.Should().Be(ExtractionMode.Skip);
    }

    [Fact]
    public void ParseResponse_HandlesLegacyStringFallback_TreatsAsReplace()
    {
        var sut = CreateSut("{}");
        var json = """{"whatWasCovered": "Plain string value", "homeworkAssigned": "Homework text"}""";

        var result = sut.ParseResponse(json);

        result.WhatWasCovered!.Value.Should().Be("Plain string value");
        result.WhatWasCovered.Mode.Should().Be(ExtractionMode.Replace);
        result.HomeworkAssigned!.Value.Should().Be("Homework text");
        result.HomeworkAssigned.Mode.Should().Be(ExtractionMode.Replace);
    }

    [Fact]
    public void ParseResponse_InvalidModeDefaultsToSkip()
    {
        var sut = CreateSut("{}");
        var json = """{"whatWasCovered": { "value": "Some content", "mode": "unknown" }}""";

        var result = sut.ParseResponse(json);

        result.WhatWasCovered!.Value.Should().Be("Some content");
        result.WhatWasCovered.Mode.Should().Be(ExtractionMode.Skip);
    }

    [Theory]
    [InlineData("""{"whatWasCovered": { "value": null, "mode": "replace" }}""")]
    [InlineData("""{"whatWasCovered": { "value": "", "mode": "replace" }}""")]
    [InlineData("""{"whatWasCovered": { "value": "   ", "mode": "replace" }}""")]
    public void ParseResponse_ObjectFormWithNullOrEmptyValue_ReturnsNullDto(string json)
    {
        var sut = CreateSut("{}");

        var result = sut.ParseResponse(json);

        result.WhatWasCovered.Should().BeNull();
    }

    // Regression guard: prompt must instruct Claude to match the teacher's input language.
    // Root cause of Jordi's bug: weak "preserve original language" instruction + English sessionTitle
    // example biased Haiku to generate English titles from Spanish voice notes.

    private static readonly IPromptService RealPrompts = new PromptService(
        ProfileService,
        PedagogyService,
        NullLogger<PromptService>.Instance,
        NullContentSchemas.Instance);

    [Fact]
    public void BuildReflectionExtractionPrompt_SystemPrompt_ContainsExplicitLanguageInstruction()
    {
        var ctx = new ReflectionExtractionContext(DateOnly.FromDateTime(DateTime.UtcNow), "Hoy practicamos el subjuntivo.", null);

        var request = RealPrompts.BuildReflectionExtractionPrompt(ctx);

        request.SystemPrompt.Should().Contain("same language as the teacher's input text",
            because: "the prompt must instruct Claude to match the teacher's input language for all generated fields");
    }

    [Fact]
    public void BuildReflectionExtractionPrompt_SystemPrompt_SessionTitleExampleIsNotInEnglish()
    {
        var ctx = new ReflectionExtractionContext(DateOnly.FromDateTime(DateTime.UtcNow), "Hoy practicamos el subjuntivo.", null);

        var request = RealPrompts.BuildReflectionExtractionPrompt(ctx);

        request.SystemPrompt.Should().NotContain("Subjunctive in time clauses",
            because: "English examples in sessionTitle bias Haiku to generate English titles from Spanish input");
    }

    // ---------------------------------------------------------------------
    // whatWasCovered fallback synthesis (issue #986)
    // ---------------------------------------------------------------------

    private static string MainExtractionJson(string? whatWasCoveredObj, string topicTagsArray, string? areasToImproveObj = null, bool isCancelled = false)
    {
        var wcc = whatWasCoveredObj ?? "null";
        var areas = areasToImproveObj ?? "null";
        var cancel = isCancelled ? "true" : "null";
        return $$"""
            {
              "whatWasCovered": {{wcc}},
              "areasToImprove": {{areas}},
              "emotionalSignals": null,
              "homeworkAssigned": null,
              "nextLessonIdeas": null,
              "topicTags": {{topicTagsArray}},
              "isCancelled": {{cancel}}
            }
            """;
    }

    private static ReflectionExtractionService CreateSutWithSequencedResponses(params string[] contents)
    {
        var idx = 0;
        var client = new ReflectionClaudeClient(_ =>
        {
            var c = contents[Math.Min(idx, contents.Length - 1)];
            idx++;
            return new ClaudeResponse(c, "claude-haiku", 10, 20);
        });
        return new ReflectionExtractionService(client, new FakePromptService(), PedagogyService, NullLogger<ReflectionExtractionService>.Instance);
    }

    [Fact]
    public async Task ExtractAsync_FallbackFires_WhenWhatWasCoveredNullAndTopicTagsPresent()
    {
        var mainJson = MainExtractionJson(
            whatWasCoveredObj: "null",
            topicTagsArray: """[{"tag":"por y para","category":"grammar"}]""");
        var sut = CreateSutWithSequencedResponses(mainJson, "Trabajamos el contraste entre por y para.");

        var result = await sut.ExtractAsync("estuvimos trabajando el por y para");

        result.WhatWasCovered.Should().NotBeNull();
        result.WhatWasCovered!.Value.Should().Be("Trabajamos el contraste entre por y para.");
        result.WhatWasCovered.Mode.Should().Be(ExtractionMode.Replace);
    }

    [Fact]
    public async Task ExtractAsync_FallbackFires_WhenWhatWasCoveredHasSkipMode()
    {
        var mainJson = MainExtractionJson(
            whatWasCoveredObj: """{"value":"","mode":"skip"}""",
            topicTagsArray: """[{"tag":"subjuntivo","category":"grammar"}]""");
        var sut = CreateSutWithSequencedResponses(mainJson, "Practicamos el subjuntivo.");

        var result = await sut.ExtractAsync("practicamos el subjuntivo");

        result.WhatWasCovered!.Value.Should().Be("Practicamos el subjuntivo.");
        result.WhatWasCovered.Mode.Should().Be(ExtractionMode.Replace);
    }

    [Fact]
    public async Task ExtractAsync_FallbackFires_WhenOnlyAreasToImproveIsPopulated()
    {
        var mainJson = MainExtractionJson(
            whatWasCoveredObj: "null",
            topicTagsArray: "[]",
            areasToImproveObj: """{"value":"struggles with subjunctive","mode":"replace"}""");
        var sut = CreateSutWithSequencedResponses(mainJson, "La alumna tuvo dificultades con el subjuntivo.");

        var result = await sut.ExtractAsync("la alumna tuvo problemas con el subjuntivo");

        result.WhatWasCovered!.Value.Should().Be("La alumna tuvo dificultades con el subjuntivo.");
    }

    [Fact]
    public async Task ExtractAsync_FallbackSkipped_WhenIsCancelledTrue()
    {
        var mainJson = MainExtractionJson(
            whatWasCoveredObj: "null",
            topicTagsArray: """[{"tag":"x","category":null}]""",
            isCancelled: true);
        var sut = CreateSutWithSequencedResponses(mainJson, "should-not-be-used");

        var result = await sut.ExtractAsync("el alumno no vino hoy");

        result.WhatWasCovered.Should().BeNull();
        result.IsCancelled.Should().BeTrue();
    }

    [Fact]
    public async Task ExtractAsync_FallbackSkipped_WhenNoTopicsAndNoAreas()
    {
        var mainJson = MainExtractionJson(
            whatWasCoveredObj: "null",
            topicTagsArray: "[]");
        var sut = CreateSutWithSequencedResponses(mainJson, "should-not-be-used");

        var result = await sut.ExtractAsync("hola");

        result.WhatWasCovered.Should().BeNull();
    }

    [Fact]
    public async Task ExtractAsync_FallbackSkipped_WhenMainPromptReturnsValue()
    {
        var mainJson = MainExtractionJson(
            whatWasCoveredObj: """{"value":"Practicamos el pretérito.","mode":"replace"}""",
            topicTagsArray: """[{"tag":"pretérito","category":"grammar"}]""");
        var calls = 0;
        var client = new ReflectionClaudeClient(_ =>
        {
            calls++;
            return new ClaudeResponse(mainJson, "claude-haiku", 10, 20);
        });
        var sut = new ReflectionExtractionService(client, new FakePromptService(), PedagogyService, NullLogger<ReflectionExtractionService>.Instance);

        var result = await sut.ExtractAsync("hicimos el pretérito");

        result.WhatWasCovered!.Value.Should().Be("Practicamos el pretérito.");
        calls.Should().Be(1, because: "no fallback call should be made when main extraction returns a usable value");
    }

    [Fact]
    public async Task ExtractAsync_FallbackPropagatesCancellation_DoesNotFallToDeterministicJoin()
    {
        var mainJson = MainExtractionJson(
            whatWasCoveredObj: "null",
            topicTagsArray: """[{"tag":"x","category":null}]""");
        var calls = 0;
        var client = new ReflectionClaudeClient(_ =>
        {
            calls++;
            if (calls == 1) return new ClaudeResponse(mainJson, "claude-haiku", 10, 20);
            throw new OperationCanceledException();
        });
        var sut = new ReflectionExtractionService(client, new FakePromptService(), PedagogyService, NullLogger<ReflectionExtractionService>.Instance);

        var act = async () => await sut.ExtractAsync("trabajamos x");

        await act.Should().ThrowAsync<OperationCanceledException>(
            because: "cancellation must propagate, not be swallowed and replaced with a deterministic Spanish sentence");
    }

    [Fact]
    public async Task ExtractAsync_FallbackUsesDeterministicJoin_WhenSecondCallReturnsEmpty()
    {
        var mainJson = MainExtractionJson(
            whatWasCoveredObj: "null",
            topicTagsArray: """[{"tag":"por y para","category":"grammar"},{"tag":"ser/estar","category":"grammar"}]""");
        var sut = CreateSutWithSequencedResponses(mainJson, "   ");

        var result = await sut.ExtractAsync("estuvimos trabajando el por y para y ser/estar");

        result.WhatWasCovered!.Value.Should().Be("Trabajamos: por y para, ser/estar.");
        result.WhatWasCovered.Mode.Should().Be(ExtractionMode.Replace);
    }

    [Fact]
    public async Task ExtractAsync_FallbackUsesDeterministicJoin_WhenSecondCallThrows()
    {
        var mainJson = MainExtractionJson(
            whatWasCoveredObj: "null",
            topicTagsArray: """[{"tag":"subjuntivo","category":null}]""");
        var calls = 0;
        var client = new ReflectionClaudeClient(_ =>
        {
            calls++;
            if (calls == 1) return new ClaudeResponse(mainJson, "claude-haiku", 10, 20);
            throw new HttpRequestException("network error");
        });
        var sut = new ReflectionExtractionService(client, new FakePromptService(), PedagogyService, NullLogger<ReflectionExtractionService>.Instance);

        var result = await sut.ExtractAsync("trabajamos el subjuntivo");

        result.WhatWasCovered!.Value.Should().Be("Trabajamos: subjuntivo.");
    }

    [Fact]
    public void NeedsWhatWasCoveredFallback_AreasToImproveWithSkipMode_DoesNotTriggerFallback()
    {
        var dto = MakeDto(
            whatWasCovered: null,
            areasToImprove: new ExtractedTextFieldDto("not used", ExtractionMode.Skip),
            topicTags: new List<TopicTagDto>());

        ReflectionExtractionService.NeedsWhatWasCoveredFallback(dto).Should().BeFalse();
    }

    [Fact]
    public void NeedsWhatWasCoveredFallback_AppendModeWithValue_DoesNotTriggerFallback()
    {
        var dto = MakeDto(
            whatWasCovered: new ExtractedTextFieldDto("more notes", ExtractionMode.Append),
            topicTags: new List<TopicTagDto> { new("x", null) });

        ReflectionExtractionService.NeedsWhatWasCoveredFallback(dto).Should().BeFalse();
    }

    [Fact]
    public void DeterministicWhatWasCoveredFromSignals_EmptyTagsAndNoAreas_ReturnsNull()
    {
        ReflectionExtractionService.DeterministicWhatWasCoveredFromSignals(new List<TopicTagDto>(), null).Should().BeNull();
    }

    [Fact]
    public void DeterministicWhatWasCoveredFromSignals_EmptyTagsButAreasPresent_UsesAreas()
    {
        var result = ReflectionExtractionService.DeterministicWhatWasCoveredFromSignals(
            new List<TopicTagDto>(), "subjuntivo");
        result.Should().Be("Trabajamos: subjuntivo.");
    }

    [Fact]
    public async Task ExtractAsync_FallbackUsesAreas_WhenHaikuThrowsAndOnlyAreasPopulated()
    {
        var mainJson = MainExtractionJson(
            whatWasCoveredObj: "null",
            topicTagsArray: "[]",
            areasToImproveObj: """{"value":"subjuntivo","mode":"replace"}""");
        var calls = 0;
        var client = new ReflectionClaudeClient(_ =>
        {
            calls++;
            if (calls == 1) return new ClaudeResponse(mainJson, "claude-haiku", 10, 20);
            throw new HttpRequestException("network error");
        });
        var sut = new ReflectionExtractionService(client, new FakePromptService(), PedagogyService, NullLogger<ReflectionExtractionService>.Instance);

        var result = await sut.ExtractAsync("la alumna tiene problemas con el subjuntivo");

        result.WhatWasCovered.Should().NotBeNull(
            because: "areas-only fallback path must still produce a value when Haiku fails");
        result.WhatWasCovered!.Value.Should().Be("Trabajamos: subjuntivo.");
    }

    private static ExtractedReflectionDto MakeDto(
        ExtractedTextFieldDto? whatWasCovered = null,
        ExtractedTextFieldDto? areasToImprove = null,
        List<TopicTagDto>? topicTags = null,
        bool? isCancelled = null) =>
        new(
            WhatWasCovered: whatWasCovered, AreasToImprove: areasToImprove, EmotionalSignals: null,
            HomeworkAssigned: null, NextLessonIdeas: null, SessionDate: null,
            SuggestedDifficulties: [], RawExtractionJson: null, SessionTitle: null,
            TopicTags: topicTags ?? [], PreviousHomeworkStatus: null, TeachingTodos: [],
            TeacherFollowups: [], LevelReassessment: null, DurationMinutes: null,
            IsCancelled: isCancelled, DifficultiesWorkedOn: [], SessionStartTime: null, NewSessionTitle: null, NewSessionDate: null);
}
