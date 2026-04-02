using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.Services;

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

internal sealed class FakePromptService : IPromptService
{
    public ClaudeRequest BuildLessonPlanPrompt(GenerationContext ctx) => Dummy();
    public ClaudeRequest BuildVocabularyPrompt(GenerationContext ctx) => Dummy();
    public ClaudeRequest BuildGrammarPrompt(GenerationContext ctx) => Dummy();
    public ClaudeRequest BuildExercisesPrompt(GenerationContext ctx) => Dummy();
    public ClaudeRequest BuildConversationPrompt(GenerationContext ctx) => Dummy();
    public ClaudeRequest BuildReadingPrompt(GenerationContext ctx) => Dummy();
    public ClaudeRequest BuildHomeworkPrompt(GenerationContext ctx) => Dummy();
    public ClaudeRequest BuildFreeTextPrompt(GenerationContext ctx) => Dummy();
    public ClaudeRequest BuildGuidedWritingPrompt(GenerationContext ctx) => Dummy();
    public ClaudeRequest BuildErrorCorrectionPrompt(GenerationContext ctx) => Dummy();
    public ClaudeRequest BuildNoticingTaskPrompt(GenerationContext ctx) => Dummy();

    public ClaudeRequest BuildCurriculumPrompt(CurriculumContext ctx)
    {
        LastCurriculumContext = ctx;
        return Dummy();
    }

    public CurriculumContext? LastCurriculumContext { get; private set; }

    private static ClaudeRequest Dummy() =>
        new("system", "user", ClaudeModel.Haiku, MaxTokens: 100);
}

internal sealed class ConfigurableClaudeClient : IClaudeClient
{
    private readonly string _content;
    public int CompleteCallCount { get; private set; }
    public ClaudeRequest? LastRequest { get; private set; }

    public ConfigurableClaudeClient(string content)
    {
        _content = content;
    }

    public Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default)
    {
        CompleteCallCount++;
        LastRequest = request;
        return Task.FromResult(new ClaudeResponse(_content, "claude-haiku", 10, 20));
    }

    public async IAsyncEnumerable<string> StreamAsync(ClaudeRequest request,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        CompleteCallCount++;
        await Task.Yield();
        yield return _content;
    }
}

/// <summary>
/// Returns responses from a queue so different calls can return different content.
/// </summary>
internal sealed class SequentialClaudeClient : IClaudeClient
{
    private readonly Queue<string> _responses;
    public int CompleteCallCount { get; private set; }

    public SequentialClaudeClient(params string[] responses)
    {
        _responses = new Queue<string>(responses);
    }

    public Task<ClaudeResponse> CompleteAsync(ClaudeRequest request, CancellationToken ct = default)
    {
        CompleteCallCount++;
        var content = _responses.Count > 0 ? _responses.Dequeue() : "[]";
        return Task.FromResult(new ClaudeResponse(content, "claude-haiku", 10, 20));
    }

    public async IAsyncEnumerable<string> StreamAsync(ClaudeRequest request,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        CompleteCallCount++;
        await Task.Yield();
        yield return _responses.Count > 0 ? _responses.Dequeue() : "[]";
    }
}

internal sealed class FakeCurriculumValidationService : ICurriculumValidationService
{
    public Task<List<CurriculumWarning>> ValidateAsync(
        List<CurriculumEntry> entries,
        string targetLevel,
        IReadOnlyList<string> allowedGrammar,
        CancellationToken ct = default) =>
        Task.FromResult(new List<CurriculumWarning>());
}

internal sealed class FakeTemplateService : ICurriculumTemplateService
{
    private readonly CurriculumTemplateData? _data;

    public FakeTemplateService(CurriculumTemplateData? data = null)
    {
        _data = data;
    }

    public IReadOnlyList<CurriculumTemplateSummary> GetAll() => [];

    public CurriculumTemplateData? GetByLevel(string level) => _data;

    public IReadOnlyList<string> GetGrammarForCefrPrefix(string cefrPrefix) => [];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

internal static class FakeTemplates
{
    public static CurriculumTemplateData TwoUnitTemplate() => new(
        Level: "A1.1",
        CefrLevel: "A1",
        Units: new List<CurriculumTemplateUnit>
        {
            new(1, "Nosotros", "Conocer a los compañeros",
                Grammar: ["El género", "Las conjugaciones"],
                VocabularyThemes: ["Profesiones"],
                CommunicativeFunctions: ["Dar datos personales", "Saludar"],
                CompetencyFocus: ["EO", "CO", "EE"]),
            new(2, "Quiero aprender español", "Hablar sobre el español",
                Grammar: ["El presente de indicativo", "Por/para"],
                VocabularyThemes: ["Idiomas"],
                CommunicativeFunctions: ["Expresar intenciones"],
                CompetencyFocus: ["EO", "CO"])
        });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

public class CurriculumGenerationServiceTests
{
    private static CurriculumGenerationService BuildService(
        ICurriculumTemplateService templateService,
        IClaudeClient? claude = null,
        IPromptService? prompts = null) =>
        new(
            claude ?? new ConfigurableClaudeClient("[]"),
            prompts ?? new FakePromptService(),
            templateService,
            new SessionMappingService(),
            new FakeCurriculumValidationService(),
            NullLogger<CurriculumGenerationService>.Instance);

    // -------------------------------------------------------------------------
    // Template path: basic skeleton creation
    // -------------------------------------------------------------------------

    [Fact]
    public async Task TemplatePath_CreatesEntriesMatchingTemplateUnitCount()
    {
        var template = FakeTemplates.TwoUnitTemplate();
        var sut = BuildService(new FakeTemplateService(template));

        var ctx = new CurriculumContext(
            Language: "Spanish", Mode: "general", SessionCount: 2,
            TargetCefrLevel: "A1", TargetExam: null, ExamDate: null,
            StudentName: null, StudentNativeLanguage: null,
            StudentInterests: null, StudentGoals: null,
            TemplateLevel: "A1.1");

        var (entries, _) = await sut.GenerateAsync(ctx);

        entries.Should().HaveCount(template.Units.Count);
    }

    [Fact]
    public async Task TemplatePath_PreservesGrammarFocusAndOrder()
    {
        var template = FakeTemplates.TwoUnitTemplate();
        var sut = BuildService(new FakeTemplateService(template));

        var ctx = new CurriculumContext(
            Language: "Spanish", Mode: "general", SessionCount: 2,
            TargetCefrLevel: "A1", TargetExam: null, ExamDate: null,
            StudentName: null, StudentNativeLanguage: null,
            StudentInterests: null, StudentGoals: null,
            TemplateLevel: "A1.1");

        var (entries, _) = await sut.GenerateAsync(ctx);

        entries[0].OrderIndex.Should().Be(1);
        entries[0].GrammarFocus.Should().Contain("El género");

        entries[1].OrderIndex.Should().Be(2);
        entries[1].GrammarFocus.Should().Contain("El presente de indicativo");
    }

    [Fact]
    public async Task TemplatePath_SetsTemplateUnitRefAndCompetencyFocus()
    {
        var template = FakeTemplates.TwoUnitTemplate();
        var sut = BuildService(new FakeTemplateService(template));

        var ctx = new CurriculumContext(
            Language: "Spanish", Mode: "general", SessionCount: 2,
            TargetCefrLevel: "A1", TargetExam: null, ExamDate: null,
            StudentName: null, StudentNativeLanguage: null,
            StudentInterests: null, StudentGoals: null,
            TemplateLevel: "A1.1");

        var (entries, _) = await sut.GenerateAsync(ctx);

        entries[0].TemplateUnitRef.Should().Be("Nosotros");
        entries[0].CompetencyFocus.Should().Be("EO,CO,EE");

        entries[1].TemplateUnitRef.Should().Be("Quiero aprender español");
        entries[1].CompetencyFocus.Should().Be("EO,CO");
    }

    [Fact]
    public async Task TemplatePath_NoStudent_SkipsAiCall()
    {
        var claude = new ConfigurableClaudeClient("should-not-be-called");
        var sut = BuildService(new FakeTemplateService(FakeTemplates.TwoUnitTemplate()), claude);

        var ctx = new CurriculumContext(
            Language: "Spanish", Mode: "general", SessionCount: 2,
            TargetCefrLevel: "A1", TargetExam: null, ExamDate: null,
            StudentName: null, StudentNativeLanguage: null,
            StudentInterests: null, StudentGoals: null,
            TemplateLevel: "A1.1");

        await sut.GenerateAsync(ctx);

        claude.CompleteCallCount.Should().Be(0);
    }

    [Fact]
    public async Task TemplatePath_WithStudent_CallsAiForPersonalization()
    {
        var personalizationJson =
            "[{\"orderIndex\":1,\"topic\":\"Marco meets his football team\"},{\"orderIndex\":2,\"topic\":\"Marco explains why he loves football\"}]";
        var claude = new ConfigurableClaudeClient(personalizationJson);
        var prompts = new FakePromptService();
        var sut = BuildService(new FakeTemplateService(FakeTemplates.TwoUnitTemplate()), claude, prompts);

        var ctx = new CurriculumContext(
            Language: "Spanish", Mode: "general", SessionCount: 2,
            TargetCefrLevel: "A1", TargetExam: null, ExamDate: null,
            StudentName: "Marco", StudentNativeLanguage: "Italian",
            StudentInterests: ["football"], StudentGoals: null,
            TemplateLevel: "A1.1");

        var (entries, _) = await sut.GenerateAsync(ctx);

        claude.CompleteCallCount.Should().Be(1);
        entries[0].Topic.Should().Be("Marco meets his football team");
        entries[1].Topic.Should().Be("Marco explains why he loves football");
    }

    [Fact]
    public async Task TemplatePath_WithStudent_PreservesGrammarFocusDespitePersonalization()
    {
        var personalizationJson =
            "[{\"orderIndex\":1,\"topic\":\"Marco meets his football team\"}]";
        var sut = BuildService(
            new FakeTemplateService(FakeTemplates.TwoUnitTemplate()),
            new ConfigurableClaudeClient(personalizationJson));

        var ctx = new CurriculumContext(
            Language: "Spanish", Mode: "general", SessionCount: 2,
            TargetCefrLevel: "A1", TargetExam: null, ExamDate: null,
            StudentName: "Marco", StudentNativeLanguage: null,
            StudentInterests: null, StudentGoals: null,
            TemplateLevel: "A1.1");

        var (entries, _) = await sut.GenerateAsync(ctx);

        // Grammar must not be altered by personalization
        entries[0].GrammarFocus.Should().Contain("El género");
        entries[1].GrammarFocus.Should().Contain("El presente de indicativo");
    }

    [Fact]
    public async Task TemplatePath_AiPartialResponse_KeepsUnmatchedOriginalTopics()
    {
        // AI only returns entry for orderIndex 1, not 2
        var partialJson = "[{\"orderIndex\":1,\"topic\":\"Marco's personalized topic\"}]";
        var sut = BuildService(
            new FakeTemplateService(FakeTemplates.TwoUnitTemplate()),
            new ConfigurableClaudeClient(partialJson));

        var ctx = new CurriculumContext(
            Language: "Spanish", Mode: "general", SessionCount: 2,
            TargetCefrLevel: "A1", TargetExam: null, ExamDate: null,
            StudentName: "Marco", StudentNativeLanguage: null,
            StudentInterests: null, StudentGoals: null,
            TemplateLevel: "A1.1");

        var (entries, _) = await sut.GenerateAsync(ctx);

        entries[0].Topic.Should().Be("Marco's personalized topic");
        // Entry 2 should keep original template topic (not crash)
        entries[1].Topic.Should().NotBeNullOrEmpty();
        entries[1].TemplateUnitRef.Should().Be("Quiero aprender español");
    }

    // -------------------------------------------------------------------------
    // Free AI generation path (unchanged)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task FreePath_StillProducesValidEntries()
    {
        var freeGenJson = """
            [
                {"orderIndex":1,"topic":"Greetings","grammarFocus":"ser/estar","competencies":["speaking","listening"],"lessonType":"Communicative"},
                {"orderIndex":2,"topic":"Numbers","grammarFocus":"números","competencies":["listening","writing"],"lessonType":"Grammar-focused"}
            ]
            """;
        var sut = BuildService(
            new FakeTemplateService(),
            new ConfigurableClaudeClient(freeGenJson));

        var ctx = new CurriculumContext(
            Language: "Spanish", Mode: "general", SessionCount: 2,
            TargetCefrLevel: "A1", TargetExam: null, ExamDate: null,
            StudentName: null, StudentNativeLanguage: null,
            StudentInterests: null, StudentGoals: null);

        var (entries, _) = await sut.GenerateAsync(ctx);

        entries.Should().HaveCount(2);
        entries[0].Topic.Should().Be("Greetings");
        entries[0].GrammarFocus.Should().Be("ser/estar");
        entries[0].TemplateUnitRef.Should().BeNull();
        entries[0].CompetencyFocus.Should().BeNull();
    }

    // -------------------------------------------------------------------------
    // Personalization: ContextDescription and PersonalizationNotes
    // -------------------------------------------------------------------------

    [Fact]
    public async Task TemplatePath_WithStudent_AppliesContextDescriptionAndNotes()
    {
        var personalizationJson = """
            [
                {"orderIndex":1,"topic":"Marco at the registration office","contextDescription":"Marco tells the clerk his name and phone number at a Barcelona registration office.","personalizationNotes":"Extra ser/estar practice. No role-play, written exercises only."},
                {"orderIndex":2,"topic":"Marco counts the seats at Camp Nou","contextDescription":"Marco uses numbers to count seats and prices at Camp Nou.","personalizationNotes":"Reinforce false cognates with Italian numbers."}
            ]
            """;
        var claude = new ConfigurableClaudeClient(personalizationJson);
        var sut = BuildService(new FakeTemplateService(FakeTemplates.TwoUnitTemplate()), claude);

        var ctx = new CurriculumContext(
            Language: "Spanish", Mode: "general", SessionCount: 2,
            TargetCefrLevel: "A1", TargetExam: null, ExamDate: null,
            StudentName: "Marco", StudentNativeLanguage: "Italian",
            StudentInterests: ["football"], StudentGoals: null,
            TemplateLevel: "A1.1");

        var (entries, _) = await sut.GenerateAsync(ctx);

        entries[0].ContextDescription.Should().Be("Marco tells the clerk his name and phone number at a Barcelona registration office.");
        entries[0].PersonalizationNotes.Should().Contain("ser/estar");
        entries[1].ContextDescription.Should().Be("Marco uses numbers to count seats and prices at Camp Nou.");
        entries[1].PersonalizationNotes.Should().Contain("false cognates");
    }

    [Fact]
    public async Task TemplatePath_WithStudent_SpreadsWeaknessNotesAcrossMultipleSessions()
    {
        // AI response where weakness emphasis ("ser/estar") appears in BOTH session notes
        var personalizationJson = """
            [
                {"orderIndex":1,"topic":"Marco greets at the office","contextDescription":"Marco introduces himself at a Barcelona office.","personalizationNotes":"ser/estar focus: Marco uses 'soy' (not 'estoy') to introduce himself."},
                {"orderIndex":2,"topic":"Marco discusses his work","contextDescription":"Marco talks about his job and daily routines.","personalizationNotes":"ser/estar revisited: describing permanent (ser) vs. temporary (estar) states."}
            ]
            """;
        var claude = new ConfigurableClaudeClient(personalizationJson);
        var sut = BuildService(new FakeTemplateService(FakeTemplates.TwoUnitTemplate()), claude);

        var ctx = new CurriculumContext(
            Language: "Spanish", Mode: "general", SessionCount: 2,
            TargetCefrLevel: "A1", TargetExam: null, ExamDate: null,
            StudentName: "Marco", StudentNativeLanguage: "Italian",
            StudentInterests: null, StudentGoals: null,
            TemplateLevel: "A1.1",
            TemplateUnits: null,
            StudentWeaknesses: ["ser/estar distinction"]);

        var (entries, _) = await sut.GenerateAsync(ctx);

        // Weakness emphasis should appear in PersonalizationNotes for BOTH entries
        entries[0].PersonalizationNotes.Should().Contain("ser/estar");
        entries[1].PersonalizationNotes.Should().Contain("ser/estar");
    }

    [Fact]
    public async Task FreePath_WithStudent_CallsAiTwice()
    {
        var freeGenJson = """
            [
                {"orderIndex":1,"topic":"Greetings","grammarFocus":"ser/estar","competencies":["speaking"],"lessonType":"Communicative"},
                {"orderIndex":2,"topic":"Numbers","grammarFocus":"números","competencies":["listening"],"lessonType":"Grammar-focused"}
            ]
            """;
        var personalizationJson = """
            [
                {"orderIndex":1,"topic":"Marco greets the team","contextDescription":"Marco introduces himself to his football team.","personalizationNotes":"Ser/estar focus for Italian speaker."},
                {"orderIndex":2,"topic":"Marco counts goals","contextDescription":"Marco counts goals and match scores.","personalizationNotes":"Numbers in sports context."}
            ]
            """;
        var claude = new SequentialClaudeClient(freeGenJson, personalizationJson);
        var sut = BuildService(new FakeTemplateService(), claude);

        var ctx = new CurriculumContext(
            Language: "Spanish", Mode: "general", SessionCount: 2,
            TargetCefrLevel: "A1", TargetExam: null, ExamDate: null,
            StudentName: "Marco", StudentNativeLanguage: "Italian",
            StudentInterests: ["football"], StudentGoals: null);

        await sut.GenerateAsync(ctx);

        claude.CompleteCallCount.Should().Be(2);
    }

    [Fact]
    public async Task FreePath_WithStudent_AppliesContextDescriptionFromPersonalizationPass()
    {
        var freeGenJson = """
            [
                {"orderIndex":1,"topic":"Greetings","grammarFocus":"ser/estar","competencies":["speaking"],"lessonType":"Communicative"}
            ]
            """;
        var personalizationJson = """
            [
                {"orderIndex":1,"topic":"Marco greets the team","contextDescription":"Marco introduces himself to his football team in Barcelona.","personalizationNotes":"Ser/estar for Italian speaker."}
            ]
            """;
        var claude = new SequentialClaudeClient(freeGenJson, personalizationJson);
        var sut = BuildService(new FakeTemplateService(), claude);

        var ctx = new CurriculumContext(
            Language: "Spanish", Mode: "general", SessionCount: 1,
            TargetCefrLevel: "A1", TargetExam: null, ExamDate: null,
            StudentName: "Marco", StudentNativeLanguage: null,
            StudentInterests: null, StudentGoals: null);

        var (entries, _) = await sut.GenerateAsync(ctx);

        entries[0].ContextDescription.Should().Be("Marco introduces himself to his football team in Barcelona.");
        entries[0].PersonalizationNotes.Should().Contain("Ser/estar");
    }
}
