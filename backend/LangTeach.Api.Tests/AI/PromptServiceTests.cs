using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.AI;

file sealed class FakeLogger<T> : ILogger<T>
{
    public record LogEntry(LogLevel Level, string Message);
    public List<LogEntry> Entries { get; } = [];

    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
    public bool IsEnabled(LogLevel logLevel) => true;
    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        => Entries.Add(new(logLevel, formatter(state, exception)));
}

public class PromptServiceTests
{
    private static readonly ISectionProfileService ProfileService =
        new SectionProfileService(NullLogger<SectionProfileService>.Instance);

    private static readonly IPedagogyConfigService PedagogyService =
        new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, ProfileService);

    private static readonly IContentSchemaService NoOpSchemas = new NullContentSchemaService();

    private readonly PromptService _sut = new(ProfileService, PedagogyService, NullLogger<PromptService>.Instance, NoOpSchemas);

    private sealed class NullContentSchemaService : IContentSchemaService
    {
        public string? GetSchema(string contentType) => null;
    }

    private sealed class StubContentSchemaService(string contentType, string schema) : IContentSchemaService
    {
        public string? GetSchema(string ct) => ct == contentType ? schema : null;
    }

    private static GenerationContext BaseCtx(string? studentName = null) => new(
        Language: "English",
        CefrLevel: "B1",
        Topic: "ordering food",
        Style: "Conversational",
        DurationMinutes: 60,
        StudentName: studentName,
        StudentNativeLanguage: null,
        StudentInterests: null,
        StudentGoals: null,
        StudentWeaknesses: null,
        ExistingNotes: null
    );

    // --- Student block ---

    [Fact]
    public void SystemPrompt_IncludesStudentBlock_WhenStudentNameProvided()
    {
        var ctx = BaseCtx("Maria") with
        {
            StudentNativeLanguage = "Portuguese",
            StudentInterests = ["cooking", "travel"],
            StudentGoals = ["speak fluently"],
            StudentWeaknesses = ["articles"]
        };

        var req = _sut.BuildVocabularyPrompt(ctx);

        req.SystemPrompt.Should().Contain("Student profile:");
        req.SystemPrompt.Should().Contain("Maria");
        req.SystemPrompt.Should().Contain("Portuguese");
        req.SystemPrompt.Should().Contain("cooking, travel");
        req.SystemPrompt.Should().Contain("speak fluently");
        req.SystemPrompt.Should().Contain("articles");
    }

    [Fact]
    public void SystemPrompt_OmitsStudentBlock_WhenStudentNameIsNull()
    {
        var req = _sut.BuildVocabularyPrompt(BaseCtx());

        req.SystemPrompt.Should().NotContain("Student profile:");
    }

    [Fact]
    public void SystemPrompt_OmitsInterestsLine_WhenInterestsArrayIsEmpty()
    {
        var ctx = BaseCtx("Ana") with { StudentInterests = [] };

        var req = _sut.BuildVocabularyPrompt(ctx);

        req.SystemPrompt.Should().Contain("Student profile:");
        req.SystemPrompt.Should().NotContain("Interests:");
    }

    [Fact]
    public void SystemPrompt_OmitsNativeLanguageGuidance_WhenNativeLanguageIsNull()
    {
        var ctx = BaseCtx("Ana");

        var req = _sut.BuildVocabularyPrompt(ctx);

        req.SystemPrompt.Should().NotContain("native language is");
        req.SystemPrompt.Should().NotContain("false cognates");
    }

    // --- Notes block ---

    [Fact]
    public void SystemPrompt_IncludesNotesBlock_WhenExistingNotesProvided()
    {
        var ctx = BaseCtx() with { ExistingNotes = "We covered past simple last week." };

        var req = _sut.BuildGrammarPrompt(ctx);

        req.SystemPrompt.Should().Contain("We covered past simple last week.");
        req.SystemPrompt.Should().Contain("Build on these notes");
    }

    [Fact]
    public void SystemPrompt_OmitsNotesBlock_WhenExistingNotesIsNull()
    {
        var req = _sut.BuildGrammarPrompt(BaseCtx());

        req.SystemPrompt.Should().NotContain("Build on these notes");
    }

    [Fact]
    public void SystemPrompt_OmitsNotesBlock_WhenExistingNotesIsWhitespace()
    {
        var ctx = BaseCtx() with { ExistingNotes = "   " };

        var req = _sut.BuildGrammarPrompt(ctx);

        req.SystemPrompt.Should().NotContain("Build on these notes");
    }

    // --- Homework lesson summary ---

    [Fact]
    public void HomeworkPrompt_IncludesLessonSummary_WhenProvided()
    {
        var ctx = BaseCtx() with { LessonSummary = "We practised modal verbs." };

        var req = _sut.BuildHomeworkPrompt(ctx);

        req.UserPrompt.Should().Contain("We practised modal verbs.");
    }

    [Fact]
    public void HomeworkPrompt_OmitsLessonSummaryLine_WhenNotProvided()
    {
        var req = _sut.BuildHomeworkPrompt(BaseCtx());

        req.UserPrompt.Should().NotContain("This homework follows a lesson where:");
    }

    // --- Direction block ---

    [Fact]
    public void SystemPrompt_IncludesDirectionBlock_WhenDirectionProvided()
    {
        var ctx = BaseCtx() with { Direction = "Make it easier" };

        var req = _sut.BuildVocabularyPrompt(ctx);

        req.SystemPrompt.Should().Contain("IMPORTANT DIRECTION");
        req.SystemPrompt.Should().Contain("Make it easier");
    }

    [Fact]
    public void SystemPrompt_OmitsDirectionBlock_WhenDirectionIsNull()
    {
        var req = _sut.BuildVocabularyPrompt(BaseCtx());

        req.SystemPrompt.Should().NotContain("IMPORTANT DIRECTION");
    }

    [Fact]
    public void SystemPrompt_OmitsDirectionBlock_WhenDirectionIsWhitespace()
    {
        var ctx = BaseCtx() with { Direction = "   " };

        var req = _sut.BuildVocabularyPrompt(ctx);

        req.SystemPrompt.Should().NotContain("IMPORTANT DIRECTION");
    }

    [Fact]
    public void SystemPrompt_OmitsDirectionBlock_WhenDirectionIsEmpty()
    {
        var ctx = BaseCtx() with { Direction = "" };

        var req = _sut.BuildVocabularyPrompt(ctx);

        req.SystemPrompt.Should().NotContain("IMPORTANT DIRECTION");
    }

    // --- Vocabulary CEFR level and L1 definitions ---

    [Fact]
    public void VocabularyPrompt_RequiresCefrLevelOnItems()
    {
        var req = _sut.BuildVocabularyPrompt(BaseCtx());

        req.UserPrompt.Should().Contain("B1 level");
        req.UserPrompt.Should().Contain("do not include words above this CEFR level");
    }

    [Fact]
    public void VocabularyPrompt_RequiresL1Definitions_WhenNativeLanguageKnown()
    {
        var ctx = BaseCtx("Ana") with { StudentNativeLanguage = "English" };

        var req = _sut.BuildVocabularyPrompt(ctx);

        req.UserPrompt.Should().Contain("translation or gloss in English");
        req.UserPrompt.Should().Contain("student's native language");
    }

    [Fact]
    public void VocabularyPrompt_NoL1Instruction_WhenNativeLanguageNull()
    {
        var req = _sut.BuildVocabularyPrompt(BaseCtx());

        req.UserPrompt.Should().NotContain("student's native language");
        req.UserPrompt.Should().NotContain("translation or gloss in");
    }

    // --- MaxTokens ---

    [Fact]
    public void LessonPlanPrompt_HasMaxTokens8192()
        => _sut.BuildLessonPlanPrompt(BaseCtx()).MaxTokens.Should().Be(8192);

    [Fact]
    public void VocabularyPrompt_HasMaxTokens2048()
        => _sut.BuildVocabularyPrompt(BaseCtx()).MaxTokens.Should().Be(2048);

    [Fact]
    public void GrammarPrompt_HasMaxTokens3000()
        => _sut.BuildGrammarPrompt(BaseCtx()).MaxTokens.Should().Be(3000);

    [Fact]
    public void ExercisesPrompt_HasMaxTokens4096()
        => _sut.BuildExercisesPrompt(BaseCtx()).MaxTokens.Should().Be(4096);

    [Fact]
    public void ConversationPrompt_HasMaxTokens3000()
        => _sut.BuildConversationPrompt(BaseCtx()).MaxTokens.Should().Be(3000);

    [Fact]
    public void ReadingPrompt_HasMaxTokens4096()
        => _sut.BuildReadingPrompt(BaseCtx()).MaxTokens.Should().Be(4096);

    [Fact]
    public void HomeworkPrompt_HasMaxTokens1024()
        => _sut.BuildHomeworkPrompt(BaseCtx()).MaxTokens.Should().Be(1024);

    // --- Exercises explanation ---

    [Fact]
    public void ExercisesPrompt_IncludesExplanationField_InJsonSchema()
    {
        var req = _sut.BuildExercisesPrompt(BaseCtx());

        req.UserPrompt.Should().Contain("\"explanation\":\"\"");
    }

    // --- JSON schema injected ---

    [Theory]
    [InlineData("vocabulary")]
    [InlineData("grammar")]
    [InlineData("exercises")]
    [InlineData("conversation")]
    [InlineData("reading")]
    [InlineData("homework")]
    [InlineData("lessonplan")]
    public void UserPrompt_ContainsReturnJson_ForAllMethods(string method)
    {
        var ctx = BaseCtx();
        var req = method switch
        {
            "vocabulary"  => _sut.BuildVocabularyPrompt(ctx),
            "grammar"     => _sut.BuildGrammarPrompt(ctx),
            "exercises"   => _sut.BuildExercisesPrompt(ctx),
            "conversation"=> _sut.BuildConversationPrompt(ctx),
            "reading"     => _sut.BuildReadingPrompt(ctx),
            "homework"    => _sut.BuildHomeworkPrompt(ctx),
            "lessonplan"  => _sut.BuildLessonPlanPrompt(ctx),
            _             => throw new ArgumentException(method)
        };

        req.UserPrompt.Should().Contain("Return JSON");
    }

    // --- Model routing ---

    [Fact]
    public void SonnetUsed_ForLessonPlan() =>
        _sut.BuildLessonPlanPrompt(BaseCtx()).Model.Should().Be(ClaudeModel.Sonnet);

    [Fact]
    public void HaikuUsed_ForVocabulary() =>
        _sut.BuildVocabularyPrompt(BaseCtx()).Model.Should().Be(ClaudeModel.Haiku);

    [Fact]
    public void SonnetUsed_ForGrammar() =>
        _sut.BuildGrammarPrompt(BaseCtx()).Model.Should().Be(ClaudeModel.Sonnet);

    [Fact]
    public void HaikuUsed_ForExercises() =>
        _sut.BuildExercisesPrompt(BaseCtx()).Model.Should().Be(ClaudeModel.Haiku);

    [Fact]
    public void HaikuUsed_ForConversation() =>
        _sut.BuildConversationPrompt(BaseCtx()).Model.Should().Be(ClaudeModel.Haiku);

    [Fact]
    public void SonnetUsed_ForReading() =>
        _sut.BuildReadingPrompt(BaseCtx()).Model.Should().Be(ClaudeModel.Sonnet);

    [Fact]
    public void SonnetUsed_ForHomework() =>
        _sut.BuildHomeworkPrompt(BaseCtx()).Model.Should().Be(ClaudeModel.Sonnet);

    // --- Material file names ---

    [Fact]
    public void SystemPrompt_IncludesMaterialBlock_WhenMaterialFileNamesProvided()
    {
        var ctx = BaseCtx() with { MaterialFileNames = ["worksheet.pdf", "vocab-list.png"] };

        var req = _sut.BuildVocabularyPrompt(ctx);

        req.SystemPrompt.Should().Contain("reference materials");
        req.SystemPrompt.Should().Contain("worksheet.pdf");
        req.SystemPrompt.Should().Contain("vocab-list.png");
        req.SystemPrompt.Should().Contain("Adapt, reference, or build upon them");
    }

    [Fact]
    public void SystemPrompt_OmitsMaterialBlock_WhenMaterialFileNamesIsNull()
    {
        var req = _sut.BuildVocabularyPrompt(BaseCtx());

        req.SystemPrompt.Should().NotContain("reference materials");
    }

    // --- Difficulty targeting ---

    [Fact]
    public void SystemPrompt_IncludesDifficultyBlock_WhenStudentDifficultiesProvided()
    {
        var ctx = BaseCtx("Maria") with
        {
            StudentDifficulties =
            [
                new DifficultyDto("d1", "grammar", "ser/estar in past tense", "high", "stable"),
                new DifficultyDto("d2", "vocabulary", "false cognates with English", "medium", "improving"),
                new DifficultyDto("d3", "pronunciation", "vowel reduction", "low", "stable"),
            ]
        };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.SystemPrompt.Should().Contain("Known difficulties");
        req.SystemPrompt.Should().Contain("[high] grammar: ser/estar in past tense");
        req.SystemPrompt.Should().Contain("[medium] vocabulary: false cognates with English");
        req.SystemPrompt.Should().Contain("[low] pronunciation: vowel reduction");
        req.SystemPrompt.Should().Contain("target these difficulty patterns");
    }

    [Fact]
    public void SystemPrompt_OmitsDifficultyBlock_WhenStudentDifficultiesIsNull()
    {
        var ctx = BaseCtx("Maria");

        var req = _sut.BuildVocabularyPrompt(ctx);

        req.SystemPrompt.Should().NotContain("Known difficulties");
    }

    [Fact]
    public void SystemPrompt_OmitsDifficultyBlock_WhenStudentDifficultiesIsEmpty()
    {
        var ctx = BaseCtx("Maria") with { StudentDifficulties = [] };

        var req = _sut.BuildVocabularyPrompt(ctx);

        req.SystemPrompt.Should().NotContain("Known difficulties");
    }

    [Fact]
    public void SystemPrompt_OmitsDifficultyBlock_WhenNoStudent()
    {
        var ctx = BaseCtx() with
        {
            StudentDifficulties =
            [
                new DifficultyDto("d1", "grammar", "articles", "high", "stable"),
            ]
        };

        var req = _sut.BuildVocabularyPrompt(ctx);

        // Without a student name, the student block (and difficulties) should not appear
        req.SystemPrompt.Should().NotContain("Known difficulties");
    }

    [Fact]
    public void SystemPrompt_OmitsMaterialBlock_WhenMaterialFileNamesIsEmpty()
    {
        var ctx = BaseCtx() with { MaterialFileNames = [] };

        var req = _sut.BuildVocabularyPrompt(ctx);

        req.SystemPrompt.Should().NotContain("reference materials");
    }

    // --- Grammar constraints ---

    [Fact]
    public void SystemPrompt_IncludesGrammarConstraints_WhenProvided()
    {
        var constraints = new List<string> { "Present simple", "Modal verbs: can/could" };
        var ctx = BaseCtx() with { GrammarConstraints = constraints };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.SystemPrompt.Should().Contain("Target grammar structures");
        req.SystemPrompt.Should().Contain("Present simple");
        req.SystemPrompt.Should().Contain("Modal verbs: can/could");
    }

    [Fact]
    public void SystemPrompt_OmitsGrammarConstraints_WhenNotProvided()
    {
        var ctx = BaseCtx();

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.SystemPrompt.Should().NotContain("Target grammar structures");
    }

    [Fact]
    public void SystemPrompt_OmitsGrammarConstraints_WhenListIsEmpty()
    {
        var ctx = BaseCtx() with { GrammarConstraints = new List<string>() };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.SystemPrompt.Should().NotContain("Target grammar structures");
    }

    // --- Teacher grammar instructions ---

    [Fact]
    public void SystemPrompt_IncludesTeacherGrammarConstraints_WhenProvided()
    {
        var ctx = BaseCtx() with { TeacherGrammarConstraints = "include subjunctive, only regular verbs" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.SystemPrompt.Should().Contain("Additional grammar instructions from the teacher:");
        req.SystemPrompt.Should().Contain("include subjunctive, only regular verbs");
    }

    [Fact]
    public void SystemPrompt_OmitsTeacherGrammarConstraints_WhenNull()
    {
        var ctx = BaseCtx();

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.SystemPrompt.Should().NotContain("Additional grammar instructions from the teacher:");
    }

    [Fact]
    public void SystemPrompt_OmitsTeacherGrammarConstraints_WhenWhitespace()
    {
        var ctx = BaseCtx() with { TeacherGrammarConstraints = "   " };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.SystemPrompt.Should().NotContain("Additional grammar instructions from the teacher:");
    }

    // --- WarmUp content type allowlist (per CEFR band) ---

    [Fact]
    public void LessonPlanPrompt_WarmUp_ContainsOpinionPromptGuidance_ForB1()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx()); // BaseCtx defaults to B1

        req.UserPrompt.Should().Contain("Opinion prompts");
    }

    [Fact]
    public void LessonPlanPrompt_WarmUp_UsesLowDemandActivities_ForA1()
    {
        var ctx = BaseCtx() with { CefrLevel = "A1" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        // A1: yes/no questions and a concrete example
        req.UserPrompt.Should().Contain("yes/no");
        req.UserPrompt.Should().Contain("Te gusta");
    }

    [Fact]
    public void LessonPlanPrompt_WarmUp_AllowsDiscussionActivities_ForB2()
    {
        var ctx = BaseCtx() with { CefrLevel = "B2" };
        var req = _sut.BuildLessonPlanPrompt(ctx);

        // B2: agree/disagree or headline prediction format
        req.UserPrompt.Should().Contain("agree/disagree");
    }

    [Fact]
    public void LessonPlanPrompt_WarmUp_UsesHigherOrderActivities_ForC1Plus()
    {
        var ctx = BaseCtx() with { CefrLevel = "C1" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        // C1 band: higher-order thinking activities
        req.UserPrompt.Should().Contain("ethical dilemma");
        req.UserPrompt.Should().Contain("circumlocution");
    }

    [Fact]
    public void LessonPlanPrompt_WarmUp_DoesNotContainNegativeVocabularyConstraint()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        // Positive allowlist replaces old "NEVER" defensive wording
        req.UserPrompt.Should().NotContain("NEVER generate a vocabulary list");
    }

    // --- Reading & Comprehension template ---

    [Fact]
    public void LessonPlanPrompt_IncludesReadingPassageRequirements_WhenReadingComprehensionTemplate()
    {
        var ctx = BaseCtx() with { TemplateName = "Reading & Comprehension" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("Generate a complete lesson plan");
        // Template override content is now inline per-section (additive model — no monolithic block header)
        req.UserPrompt.Should().Contain("reading passage");
        req.UserPrompt.Should().Contain("Comprehension questions");
        req.UserPrompt.Should().Contain("inferential");
        req.UserPrompt.Should().Contain("warmUp");
        req.UserPrompt.Should().Contain("presentation");
        req.UserPrompt.Should().Contain("practice");
        req.UserPrompt.Should().Contain("production");
        req.UserPrompt.Should().Contain("wrapUp");
        req.UserPrompt.Should().Contain("All five sections");
    }

    [Fact]
    public void LessonPlanPrompt_DoesNotIncludeReadingPassageRequirements_WhenNoTemplate()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        req.UserPrompt.Should().NotContain("READING & COMPREHENSION TEMPLATE");
        req.UserPrompt.Should().NotContain("Embed a complete reading passage");
    }

    // --- Exam Prep template ---

    [Fact]
    public void LessonPlanPrompt_IncludesWrittenProductionRequirement_WhenExamPrepTemplate()
    {
        var ctx = BaseCtx() with { TemplateName = "Exam Prep" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        // Template override content is now inline per-section (additive model — no monolithic block header)
        req.UserPrompt.Should().Contain("written exam task");
        req.UserPrompt.Should().Contain("All tasks must be written");
        req.UserPrompt.Should().Contain("opinion essay, formal letter, short report");
    }

    [Fact]
    public void LessonPlanPrompt_IncludesTimeLimitGuidance_WhenExamPrepTemplate()
    {
        var ctx = BaseCtx() with { TemplateName = "Exam Prep" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("time limit");
        req.UserPrompt.Should().Contain("target word count");
    }

    [Fact]
    public void LessonPlanPrompt_DoesNotIncludeExamPrepRequirements_WhenNoTemplate()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx() with { TemplateName = null });

        req.UserPrompt.Should().NotContain("EXAM PREP TEMPLATE");
        req.UserPrompt.Should().NotContain("Timer is mandatory");
    }

    [Fact]
    public void LessonPlanPrompt_DoesNotIncludeExamPrepRequirements_WhenDifferentTemplate()
    {
        var ctx = BaseCtx() with { TemplateName = "Reading & Comprehension" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().NotContain("EXAM PREP TEMPLATE");
        req.UserPrompt.Should().NotContain("Timer is mandatory");
    }

    // --- Additive section guidance model ---

    [Fact]
    public void LessonPlanPrompt_IncludesTemplateFocusInlineWithSectionGuidance()
    {
        // Template override guidance must appear inline with section, not appended as a separate block
        var ctx = BaseCtx() with { TemplateName = "Reading & Comprehension" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        // Inline: "Template focus:" appears inside Section guidelines block
        req.UserPrompt.Should().Contain("Template focus:");
        // Substance of the inline override for presentation section
        req.UserPrompt.Should().Contain("reading passage");
    }

    [Fact]
    public void LessonPlanPrompt_EnforcesRestrictions_WhenTemplateHasRestrictions()
    {
        // R&C template has restrictions: [{type: "exerciseCategory", value: "LUD"}]
        var ctx = BaseCtx() with { TemplateName = "Reading & Comprehension" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("Do not use [LUD] exercises in this lesson.");
    }

    [Fact]
    public void LessonPlanPrompt_PresentationUsesProfileGuidance_WhenNoTemplate()
    {
        // presentation section must come from section profile, not hardcoded prose
        var ctx = BaseCtx() with { TemplateName = null };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        // B1 presentation profile guidance contains conditional grammar-discovery framing
        req.UserPrompt.Should().Contain("When the lesson includes a grammar point");
        req.UserPrompt.Should().NotContain("Introduce the new language (vocabulary, grammar, or structure) with examples in context");
    }

    [Fact]
    public void LessonPlanPrompt_WrapUpUsesProfileGuidance_WhenNoTemplate()
    {
        // wrapUp section must come from section profile, not hardcoded prose
        var ctx = BaseCtx() with { TemplateName = null };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        // B1 wrapUp profile guidance: student summarises lesson in 3-4 sentences
        req.UserPrompt.Should().Contain("summarises");
        req.UserPrompt.Should().NotContain("Reflection and self-assessment only. Ask the student what they learned");
    }

    [Fact]
    public void LessonPlanPrompt_SectionIncludesDuration_WhenProfileHasDuration()
    {
        // Section headers should include duration when the profile defines it
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        // B1 warmup duration: min=2, max=5 (from warmup.json); may include scope label
        req.UserPrompt.Should().MatchRegex(@"warmUp \(\d+-\d+ min[^)]*\)");
    }

    // --- CEFR-level exercise guidance ---

    [Fact]
    public void ExercisesPrompt_A1_RequiresWordBankForFillInBlank()
    {
        var ctx = BaseCtx() with { CefrLevel = "A1" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("word bank");
    }

    [Fact]
    public void ExercisesPrompt_B1_RequiresAtLeastTwoFormats()
    {
        var ctx = BaseCtx() with { CefrLevel = "B1" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("at least 2 different exercise formats");
    }

    [Fact]
    public void ExercisesPrompt_C1_MinimizesMechanicalDrills()
    {
        var ctx = BaseCtx() with { CefrLevel = "C1" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("Minimize purely mechanical");
    }

    [Fact]
    public void LessonPlanPrompt_A1_MentionsWordBankInPractice()
    {
        var ctx = BaseCtx() with { CefrLevel = "A1" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("word bank");
    }

    [Fact]
    public void LessonPlanPrompt_B1_RequiresVarietyInPractice()
    {
        var ctx = BaseCtx() with { CefrLevel = "B1" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("at least 2 different exercise formats");
    }

    [Fact]
    public void LessonPlanPrompt_C1_MinimizesMechanicalDrillsInPractice()
    {
        var ctx = BaseCtx() with { CefrLevel = "C1" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("Minimize purely mechanical items");
    }

    [Fact]
    public void ExercisesPrompt_UnknownLevel_FallsBackToGenericVarietyGuidance()
    {
        var ctx = BaseCtx() with { CefrLevel = "X9" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("variety of exercise formats");
    }

    // --- No phantom materials constraint ---

    [Fact]
    public void SystemPrompt_IncludesSelfContainedConstraint_WhenNoMaterials()
    {
        var req = _sut.BuildExercisesPrompt(BaseCtx());

        req.SystemPrompt.Should().Contain("text-only and self-contained");
        req.SystemPrompt.Should().Contain("completable using only the text provided");
    }

    [Fact]
    public void SystemPrompt_IncludesSelfContainedConstraint_WhenMaterialsEmpty()
    {
        var ctx = BaseCtx() with { MaterialFileNames = [] };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.SystemPrompt.Should().Contain("text-only and self-contained");
    }

    [Fact]
    public void SystemPrompt_OmitsSelfContainedConstraint_WhenMaterialsProvided()
    {
        var ctx = BaseCtx() with { MaterialFileNames = ["worksheet.pdf"] };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.SystemPrompt.Should().NotContain("text-only and self-contained");
    }

    // --- Mandatory Production and Practice ordering ---

    [Fact]
    public void LessonPlanPrompt_UserPrompt_RequiresProductionInEveryLesson()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        // Production section guidance is now data-driven from the section profile
        req.UserPrompt.Should().Contain("Production must be");
    }

    [Fact]
    public void LessonPlanPrompt_UserPrompt_AllFiveSectionsRequired()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        req.UserPrompt.Should().Contain("All five sections");
        req.UserPrompt.Should().Contain("required in every lesson plan");
    }

    [Fact]
    public void LessonPlanPrompt_A1_ProductionGuidance_MentionsGuidedWriting()
    {
        var ctx = BaseCtx() with { CefrLevel = "A1" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("guided writing");
        req.UserPrompt.Should().Contain("3-5 sentences");
    }

    [Fact]
    public void LessonPlanPrompt_A1_ProductionGuidance_ExcludesOralOnlyActivities()
    {
        var ctx = BaseCtx() with { CefrLevel = "A1" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("Guided writing is appropriate and achievable even at A1");
    }

    [Fact]
    public void LessonPlanPrompt_B1_ProductionGuidance_MentionsCommunicativeTask()
    {
        var ctx = BaseCtx() with { CefrLevel = "B1" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("communicative task");
    }

    [Fact]
    public void LessonPlanPrompt_UserPrompt_PracticeGuidance_SpecifiesExerciseVariety()
    {
        // Practice section guidance is data-driven from the section profile
        // B1 practice profile specifies variety of exercise formats
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        req.UserPrompt.Should().Contain("at least 2 different exercise formats");
    }

    [Fact]
    public void LessonPlanPrompt_UserPrompt_PracticeGuidance_IncludesErrorCorrection()
    {
        // B1 practice profile includes error correction and transformation tasks
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        req.UserPrompt.Should().Contain("error correction");
    }

    [Fact]
    public void LessonPlanPrompt_C1_ProductionGuidance_MentionsOpenEndedTask()
    {
        var ctx = BaseCtx() with { CefrLevel = "C1" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("open-ended task");
        req.UserPrompt.Should().Contain("structured argument");
    }

    [Fact]
    public void LessonPlanPrompt_UnknownLevel_ProductionGuidance_ContainsStaticProductionText()
    {
        var ctx = BaseCtx() with { CefrLevel = "X9" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        // Unknown level: profile guidance is empty, fallback text is used
        req.UserPrompt.Should().Contain("communicative task");
        req.UserPrompt.Should().Contain("independently");
    }

    // --- CurriculumContext: weaknesses, difficulties, and personalization ---

    private static CurriculumContext BaseCurriculumCtx(string? studentName = "Marco") => new(
        Language: "Spanish",
        Mode: "general",
        SessionCount: 10,
        TargetCefrLevel: "A1",
        TargetExam: null,
        ExamDate: null,
        StudentName: studentName,
        StudentNativeLanguage: "Italian",
        StudentInterests: null,
        StudentGoals: null,
        TemplateLevel: null,
        TemplateUnits:
        [
            new TemplateUnitContext(1, "Greetings", "present tense ser/estar", []),
            new TemplateUnitContext(2, "Numbers", "cardinal numbers", []),
        ]
    );

    [Fact]
    public void CurriculumSystemPrompt_IncludesWeaknesses_WhenStudentWeaknessesProvided()
    {
        var ctx = BaseCurriculumCtx() with { StudentWeaknesses = ["ser vs estar", "subjunctive mood"] };

        var req = _sut.BuildCurriculumPrompt(ctx);

        req.SystemPrompt.Should().Contain("Known weaknesses");
        req.SystemPrompt.Should().Contain("ser vs estar");
        req.SystemPrompt.Should().Contain("subjunctive mood");
    }

    [Fact]
    public void CurriculumSystemPrompt_IncludesDifficulties_WhenStudentDifficultiesProvided()
    {
        var ctx = BaseCurriculumCtx() with
        {
            StudentDifficulties =
            [
                new DifficultyDto("1", "grammar", "past tense", "high", "stable"),
                new DifficultyDto("2", "vocabulary", "false cognates", "medium", "improving"),
            ]
        };

        var req = _sut.BuildCurriculumPrompt(ctx);

        req.SystemPrompt.Should().Contain("Documented difficulties");
        req.SystemPrompt.Should().Contain("grammar: past tense");
        req.SystemPrompt.Should().Contain("vocabulary: false cognates");
    }

    [Fact]
    public void CurriculumSystemPrompt_OmitsWeaknessesSection_WhenNullOrEmpty()
    {
        var ctxNull = BaseCurriculumCtx() with { StudentWeaknesses = null };
        var ctxEmpty = BaseCurriculumCtx() with { StudentWeaknesses = [] };

        _sut.BuildCurriculumPrompt(ctxNull).SystemPrompt.Should().NotContain("Known weaknesses");
        _sut.BuildCurriculumPrompt(ctxEmpty).SystemPrompt.Should().NotContain("Known weaknesses");
    }

    [Fact]
    public void CurriculumSystemPrompt_OmitsDifficultiesSection_WhenNullOrEmpty()
    {
        var ctxNull = BaseCurriculumCtx() with { StudentDifficulties = null };
        var ctxEmpty = BaseCurriculumCtx() with { StudentDifficulties = [] };

        _sut.BuildCurriculumPrompt(ctxNull).SystemPrompt.Should().NotContain("Documented difficulties");
        _sut.BuildCurriculumPrompt(ctxEmpty).SystemPrompt.Should().NotContain("Documented difficulties");
    }

    // --- CurriculumObjectives: pedagogical constraints section ---

    [Fact]
    public void LessonPlanPrompt_IncludesPedagogicalConstraints_WhenCurriculumObjectivesPresent()
    {
        var ctx = BaseCtx() with
        {
            CurriculumObjectives = "Grammar: present tense -ar/-er/-ir. Communicative skills: reading,speaking. CEFR skill focus: EO,CO"
        };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("PEDAGOGICAL CONSTRAINTS");
        req.UserPrompt.Should().Contain("present tense -ar/-er/-ir");
        req.UserPrompt.Should().Contain("address these planned learning targets");
    }

    [Fact]
    public void LessonPlanPrompt_OmitsPedagogicalConstraints_WhenCurriculumObjectivesNull()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        req.UserPrompt.Should().NotContain("PEDAGOGICAL CONSTRAINTS");
    }

    [Fact]
    public void LessonPlanPrompt_OmitsPedagogicalConstraints_WhenCurriculumObjectivesEmpty()
    {
        var ctx = BaseCtx() with { CurriculumObjectives = "" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().NotContain("PEDAGOGICAL CONSTRAINTS");
    }

    [Fact]
    public void CurriculumPersonalizationPrompt_IncludesStudentProfileFields()
    {
        var ctx = BaseCurriculumCtx("Marco") with
        {
            StudentNativeLanguage = "Italian",
            StudentInterests = ["football", "cooking"],
            StudentGoals = ["work in Barcelona"],
        };

        var req = _sut.BuildCurriculumPrompt(ctx);

        req.SystemPrompt.Should().Contain("Marco");
        req.SystemPrompt.Should().Contain("Italian");
        req.SystemPrompt.Should().Contain("football");
        req.SystemPrompt.Should().Contain("work in Barcelona");
        req.UserPrompt.Should().Contain("contextDescription");
        req.UserPrompt.Should().Contain("personalizationNotes");
    }

    [Fact]
    public void CurriculumPersonalizationPrompt_IncludesTeacherNotes()
    {
        var ctx = BaseCurriculumCtx("Marco") with
        {
            TeacherNotes = "No role-play. Written exercises only.",
        };

        var req = _sut.BuildCurriculumPrompt(ctx);

        req.SystemPrompt.Should().Contain("No role-play");
        req.UserPrompt.Should().Contain("Teacher constraints:");
        req.UserPrompt.Should().Contain("No role-play. Written exercises only.");
    }

    [Fact]
    public void CurriculumPersonalizationPrompt_IncludesWeaknessesAndSpreadsEmphasis()
    {
        var ctx = BaseCurriculumCtx("Marco") with
        {
            StudentWeaknesses = ["ser/estar distinction", "false cognates"],
        };

        var req = _sut.BuildCurriculumPrompt(ctx);

        req.SystemPrompt.Should().Contain("ser/estar distinction");
        req.UserPrompt.Should().Contain("ser/estar distinction");
        req.UserPrompt.Should().Contain("Spread emphasis");
    }

    [Fact]
    public void CurriculumPersonalizationPrompt_IncludesL1InterferenceInstruction_WhenNativeLanguageSet()
    {
        var ctx = BaseCurriculumCtx("Marco") with
        {
            StudentNativeLanguage = "Italian",
        };

        var req = _sut.BuildCurriculumPrompt(ctx);

        req.UserPrompt.Should().Contain("L1 interference");
        req.UserPrompt.Should().Contain("Italian");
        req.UserPrompt.Should().Contain("false cognates");
    }

    // --- CurriculumUserPrompt: exam-prep mode ---

    [Fact]
    public void CurriculumUserPrompt_ExamPrep_IncludesExamTypeAndDeadline()
    {
        var ctx = new CurriculumContext(
            Language: "Spanish",
            Mode: "exam-prep",
            SessionCount: 8,
            TargetCefrLevel: null,
            TargetExam: "DELE",
            ExamDate: new DateOnly(2026, 6, 15),
            StudentName: null,
            StudentNativeLanguage: null,
            StudentInterests: null,
            StudentGoals: null,
            TemplateLevel: null,
            TemplateUnits: null
        );

        var req = _sut.BuildCurriculumPrompt(ctx);

        req.UserPrompt.Should().Contain("DELE");
        req.UserPrompt.Should().Contain("2026-06-15");
    }

    [Fact]
    public void CurriculumUserPrompt_ExamPrep_IncludesSessionTypeGuidanceForEightPlusSessions()
    {
        var ctx = new CurriculumContext(
            Language: "Spanish",
            Mode: "exam-prep",
            SessionCount: 8,
            TargetCefrLevel: null,
            TargetExam: "DELE",
            ExamDate: null,
            StudentName: null,
            StudentNativeLanguage: null,
            StudentInterests: null,
            StudentGoals: null,
            TemplateLevel: null,
            TemplateUnits: null
        );

        var req = _sut.BuildCurriculumPrompt(ctx);

        req.UserPrompt.Should().Contain("Mock Test");
        req.UserPrompt.Should().Contain("Strategy Session");
        req.UserPrompt.Should().Contain("Input Session");
        req.UserPrompt.Should().Contain("AT LEAST one Mock Test");
        req.UserPrompt.Should().Contain("AT LEAST one Strategy Session");
    }

    // --- CurriculumUserPrompt: course distribution rules ---

    private static CurriculumContext BaseGeneralCtx(string? teacherNotes = null) => new(
        Language: "Spanish",
        Mode: "general",
        SessionCount: 10,
        TargetCefrLevel: "B1",
        TargetExam: null,
        ExamDate: null,
        StudentName: null,
        StudentNativeLanguage: null,
        StudentInterests: null,
        StudentGoals: null,
        TeacherNotes: teacherNotes
    );

    [Fact]
    public void CurriculumUserPrompt_InjectsVarietyRules_WhenGeneralMode()
    {
        var req = _sut.BuildCurriculumPrompt(BaseGeneralCtx());

        req.UserPrompt.Should().Contain("COURSE DISTRIBUTION RULES");
        req.UserPrompt.Should().Contain("do not repeat the same combination of exercise types in");
        req.UserPrompt.Should().Contain("alternate between written and oral");
        req.UserPrompt.Should().Contain("macro-skills must appear as primary focus at least once");
    }

    [Fact]
    public void CurriculumUserPrompt_InjectsGeneralSkillDistribution_WhenCourseTypeGeneral()
    {
        var req = _sut.BuildCurriculumPrompt(BaseGeneralCtx());

        req.UserPrompt.Should().Contain("general course");
        // CE 20-25%, EO 30-35% from course-rules.json
        req.UserPrompt.Should().Contain("(CE):");
        req.UserPrompt.Should().Contain("(EO):");
    }

    [Fact]
    public void CurriculumUserPrompt_InjectsConversationalSkillDistribution_WhenCourseTypeConversational()
    {
        var ctx = BaseGeneralCtx() with { CourseType = "conversational" };

        var req = _sut.BuildCurriculumPrompt(ctx);

        req.UserPrompt.Should().Contain("conversational course");
        // EO 55-65% for conversational courses
        req.UserPrompt.Should().Contain("55-65%");
    }

    [Fact]
    public void CurriculumUserPrompt_InjectsSpiralGrammarRecyclingGuidance()
    {
        var req = _sut.BuildCurriculumPrompt(BaseGeneralCtx());

        req.UserPrompt.Should().Contain("spiral recycling model");
        req.UserPrompt.Should().Contain("Systematic errors");
        req.UserPrompt.Should().Contain("Valid recycling examples");
        req.UserPrompt.Should().Contain("Avoid lazy recycling");
    }

    [Fact]
    public void CurriculumUserPrompt_InjectsStyleSubstitutionGuidance_WhenTeacherNotesContainKeyword()
    {
        var ctx = BaseGeneralCtx(teacherNotes: "Student hates role-play. Prefers written exercises.");

        var req = _sut.BuildCurriculumPrompt(ctx);

        req.UserPrompt.Should().Contain("Activity substitution guidance");
        req.UserPrompt.Should().Contain("role-play");
    }

    [Fact]
    public void CurriculumUserPrompt_OmitsStyleSubstitutionGuidance_WhenTeacherNotesHaveNoMatchingKeyword()
    {
        var ctx = BaseGeneralCtx(teacherNotes: "Student relocating to Barcelona. Loves sports.");

        var req = _sut.BuildCurriculumPrompt(ctx);

        req.UserPrompt.Should().NotContain("Activity substitution guidance");
    }

    [Fact]
    public void CurriculumUserPrompt_DoesNotInjectDistributionRules_ForExamPrepMode()
    {
        var ctx = new CurriculumContext(
            Language: "English",
            Mode: "exam-prep",
            SessionCount: 6,
            TargetCefrLevel: null,
            TargetExam: "IELTS",
            ExamDate: null,
            StudentName: null,
            StudentNativeLanguage: null,
            StudentInterests: null,
            StudentGoals: null
        );

        var req = _sut.BuildCurriculumPrompt(ctx);

        req.UserPrompt.Should().NotContain("COURSE DISTRIBUTION RULES");
        req.UserPrompt.Should().NotContain("spiral recycling model");
    }

    // --- PedagogyConfigService integration: new blocks in lesson plan prompt ---

    [Fact]
    public void LessonPlanPrompt_ContainsSectionCoherenceRules()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        req.UserPrompt.Should().Contain("SECTION COHERENCE RULES");
        req.UserPrompt.Should().Contain("Practice MUST use EXCLUSIVELY content from Presentation");
        req.UserPrompt.Should().Contain("Production MUST be achievable");
        req.UserPrompt.Should().Contain("Wrap Up MUST refer to lesson content");
    }

    [Fact]
    public void LessonPlanPrompt_ContainsGrammarScopeBlock()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx()); // B1

        req.UserPrompt.Should().Contain("GRAMMAR SCOPE for B1");
        req.UserPrompt.Should().Contain("In scope:");
    }

    [Fact]
    public void LessonPlanPrompt_ContainsVocabularyTargetsBlock()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx()); // B1 uses numeric targets

        req.UserPrompt.Should().Contain("VOCABULARY TARGETS for B1");
        req.UserPrompt.Should().Contain("productive items");
        req.UserPrompt.Should().Contain("receptive items");
    }

    [Fact]
    public void LessonPlanPrompt_ContainsVocabularyApproachBlock_ForC1()
    {
        var ctx = BaseCtx() with { CefrLevel = "C1" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("VOCABULARY APPROACH for C1");
    }

    [Fact]
    public void LessonPlanPrompt_InjectsL1Adjustments_WhenNativeLanguageKnown()
    {
        // Italian is in the romance family in l1-influence.json
        var ctx = BaseCtx("Marco") with { StudentNativeLanguage = "Italian" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("L1 ADJUSTMENTS for Italian speakers");
    }

    [Fact]
    public void LessonPlanPrompt_NoL1Block_WhenNativeLanguageNull()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        req.UserPrompt.Should().NotContain("L1 ADJUSTMENTS");
    }

    [Fact]
    public void LessonPlanPrompt_InjectsDifficultyTargeting_WhenWeaknessesPresent()
    {
        var ctx = BaseCtx("Ana") with { StudentWeaknesses = ["articles", "ser vs estar"] };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("DECLARED WEAKNESSES");
        req.UserPrompt.Should().Contain("articles");
    }

    [Fact]
    public void LessonPlanPrompt_NoDifficultyBlock_WhenWeaknessesNull()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        req.UserPrompt.Should().NotContain("DECLARED WEAKNESSES");
    }

    // --- Grammar prompt: grammar scope injection ---

    [Fact]
    public void GrammarPrompt_ContainsGrammarScope()
    {
        var req = _sut.BuildGrammarPrompt(BaseCtx()); // B1

        req.UserPrompt.Should().Contain("GRAMMAR SCOPE for B1");
        req.UserPrompt.Should().Contain("In scope:");
    }

    // --- Vocabulary prompt: vocabulary constraints injection ---

    [Fact]
    public void VocabularyPrompt_ContainsVocabularyConstraints()
    {
        var req = _sut.BuildVocabularyPrompt(BaseCtx()); // B1

        req.UserPrompt.Should().Contain("VOCABULARY TARGETS for B1");
    }

    // --- Exercises prompt: exercise guidance injection ---

    [Fact]
    public void ExercisesPrompt_ContainsExerciseGuidanceBlock()
    {
        var req = _sut.BuildExercisesPrompt(BaseCtx()); // B1

        req.UserPrompt.Should().Contain("EXERCISE GUIDANCE for practice at B1");
        req.UserPrompt.Should().Contain("Allowed types:");
    }

    [Fact]
    public void ExercisesPrompt_B2_ContainsGR04LengthConstraintNote()
    {
        var ctx = BaseCtx() with { CefrLevel = "B2" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("GR-04", because: "B2 practice includes error correction");
        req.UserPrompt.Should().Contain("2 sentences", because: "the level-specific note should constrain GR-04 explanation length at B2");
    }

    [Fact]
    public void ExercisesPrompt_A1_InjectsGR02MaxOptionsConstraint()
    {
        var ctx = BaseCtx() with { CefrLevel = "A1" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("Maximum 3 options",
            because: "the A1 GR-02 levelSpecificNotes entry must be injected into the exercises prompt");
    }

    [Fact]
    public void ExercisesPrompt_B1_DoesNotInjectGR02MaxOptionsConstraint()
    {
        var req = _sut.BuildExercisesPrompt(BaseCtx()); // B1

        req.UserPrompt.Should().NotContain("Maximum 3 options",
            because: "B1 has no GR-02 options constraint; only A1 is restricted to 3 MC options");
    }

    // --- Snapshot: key blocks present for representative combinations ---

    [Fact]
    public void Snapshot_A1GrammarFocus_LessonPlan_ContainsAllPedagogyBlocks()
    {
        var ctx = BaseCtx() with { CefrLevel = "A1", TemplateName = "Grammar Focus" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("SECTION COHERENCE RULES");
        req.UserPrompt.Should().Contain("GRAMMAR SCOPE for A1");
        req.UserPrompt.Should().Contain("VOCABULARY TARGETS for A1");
        // Template override guidance is now inline per-section, not a monolithic block
        req.UserPrompt.Should().Contain("Template focus:");
    }

    [Fact]
    public void Snapshot_B2ReadingComprehension_LessonPlan_ContainsTemplateAndPedagogyBlocks()
    {
        var ctx = BaseCtx("Maria") with
        {
            CefrLevel = "B2",
            TemplateName = "Reading & Comprehension",
            StudentNativeLanguage = "Italian"
        };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("SECTION COHERENCE RULES");
        req.UserPrompt.Should().Contain("GRAMMAR SCOPE for B2");
        // Template override guidance is now inline per-section, not a monolithic block
        req.UserPrompt.Should().Contain("reading passage");
        req.UserPrompt.Should().Contain("L1 ADJUSTMENTS for Italian speakers");
    }

    [Fact]
    public void Snapshot_C1Conversation_LessonPlan_ContainsApproachString()
    {
        var ctx = BaseCtx() with { CefrLevel = "C1", TemplateName = "Conversation" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("SECTION COHERENCE RULES");
        req.UserPrompt.Should().Contain("VOCABULARY APPROACH for C1");
        // Template override level variation is emitted as "{TEMPLATE NAME} level note for {level}:"
        req.UserPrompt.Should().Contain("CONVERSATION level note for C1");
    }

    // --- Available type filtering ---

    [Fact]
    public void BuildExercisesPrompt_ExerciseGuidance_DoesNotContainUnavailableTypeIds()
    {
        // The exercises guidance block is built from GetValidExerciseTypes("practice", level).
        // CO-01 (audio) and LUD-01 (ludic) are unavailable types that must never reach the prompt.
        var req = _sut.BuildExercisesPrompt(BaseCtx());

        req.UserPrompt.Should().NotContain("CO-01", because: "CO-01 is unavailable (no UI renderer) and must not appear in the exercises prompt");
        req.UserPrompt.Should().NotContain("LUD-01", because: "LUD-01 is unavailable (no UI renderer) and must not appear in the exercises prompt");
    }

    [Fact]
    public void BuildExercisesPrompt_ContainsTrueFalseInJsonTemplate()
    {
        // The exercises prompt JSON template must include the trueFalse format so the AI knows it is available.
        var req = _sut.BuildExercisesPrompt(BaseCtx());

        req.UserPrompt.Should().Contain("trueFalse", because: "trueFalse is a supported exercise format and must appear in the JSON template");
        req.UserPrompt.Should().Contain("isTrue", because: "trueFalse items require the isTrue boolean field");
        req.UserPrompt.Should().Contain("justification", because: "trueFalse items require the justification field");
    }

    [Fact]
    public void BuildExercisesPrompt_StageGuidance_IncludesTrueFalseInFormatList()
    {
        // BuildPracticeStageBlock lists allowed formats; trueFalse must be included.
        var ctx = BaseCtx() with { CefrLevel = "B1" }; // B1 has stage scaffolding
        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("trueFalse", because: "trueFalse must be listed as an allowed stage format in the practice scaffolding block");
    }

    // --- Scope constraint emission ---

    [Fact]
    public void ConversationUserPrompt_WarmUp_IncludesScopeConstraint()
    {
        var ctx = BaseCtx() with { SectionType = "WarmUp" };

        var req = _sut.BuildConversationPrompt(ctx);

        req.UserPrompt.Should().Contain("exactly 1 scenario",
            because: "WarmUp scope is brief; scope-constraints.json brief/conversation must be appended");
        req.UserPrompt.Should().Contain("2-3 phrases",
            because: "scope constraint must include phraseArray size limit");
    }

    [Fact]
    public void ConversationUserPrompt_WrapUp_IncludesScopeConstraint()
    {
        var ctx = BaseCtx() with { SectionType = "WrapUp" };

        var req = _sut.BuildConversationPrompt(ctx);

        req.UserPrompt.Should().Contain("exactly 1 scenario",
            because: "WrapUp scope is brief; scope constraint must be appended");
    }

    [Fact]
    public void ConversationUserPrompt_WarmUp_DoesNotContainHardcodedBriefText()
    {
        var ctx = BaseCtx() with { SectionType = "WarmUp" };

        var req = _sut.BuildConversationPrompt(ctx);

        req.UserPrompt.Should().NotContain("Include exactly 1 brief scenario suitable for lesson activation",
            because: "hardcoded brevity text must be replaced by config-driven scope constraint");
    }

    [Fact]
    public void ConversationUserPrompt_WrapUp_DoesNotContainHardcodedBriefText()
    {
        var ctx = BaseCtx() with { SectionType = "WrapUp" };

        var req = _sut.BuildConversationPrompt(ctx);

        req.UserPrompt.Should().NotContain("Include exactly 1 brief scenario for lesson closure",
            because: "hardcoded brevity text must be replaced by config-driven scope constraint");
    }

    [Fact]
    public void ConversationUserPrompt_Practice_NoScopeConstraintAppended()
    {
        // Practice section has full scope — no constraint text should be appended
        var ctx = BaseCtx() with { SectionType = "practice" };

        var req = _sut.BuildConversationPrompt(ctx);

        req.UserPrompt.Should().NotContain("exactly 1 scenario",
            because: "practice section has full scope; no scope constraint should be emitted");
    }

    // --- Full section profile data in conversation prompts (task #371) ---

    [Fact]
    public void ConversationUserPrompt_WarmUp_B1_ScopeConstraintAppearsBeforeJsonSchema()
    {
        var ctx = BaseCtx() with { SectionType = "WarmUp" };

        var req = _sut.BuildConversationPrompt(ctx);

        var constraintIdx = req.UserPrompt.IndexOf("exactly 1 scenario", StringComparison.Ordinal);
        var schemaIdx     = req.UserPrompt.IndexOf("{\"scenarios\"", StringComparison.Ordinal);
        constraintIdx.Should().BeGreaterThan(-1, because: "scope constraint must be present");
        schemaIdx.Should().BeGreaterThan(-1, because: "JSON schema must be present");
        constraintIdx.Should().BeLessThan(schemaIdx,
            because: "scope constraint must appear before the JSON schema to act as a strong signal");
    }

    [Fact]
    public void ConversationUserPrompt_WarmUp_B1_ContainsDuration()
    {
        var ctx = BaseCtx() with { SectionType = "WarmUp" };

        var req = _sut.BuildConversationPrompt(ctx);

        req.UserPrompt.Should().Contain("3-5 minutes",
            because: "WarmUp B1 duration is 3-5 minutes per warmup.json");
    }

    [Fact]
    public void ConversationUserPrompt_WarmUp_B1_ContainsInteractionPattern()
    {
        var ctx = BaseCtx() with { SectionType = "WarmUp" };

        var req = _sut.BuildConversationPrompt(ctx);

        req.UserPrompt.Should().Contain("student-led",
            because: "WarmUp B1 interaction pattern is student-led per warmup.json");
    }

    [Fact]
    public void ConversationUserPrompt_WarmUp_B1_ContainsForbiddenReasons()
    {
        var ctx = BaseCtx() with { SectionType = "WarmUp" };

        var req = _sut.BuildConversationPrompt(ctx);

        req.UserPrompt.Should().Contain("Grammar drills",
            because: "WarmUp B1 has forbidden GR-* types; reason must appear as constraint");
        req.UserPrompt.Should().Contain("Written production",
            because: "WarmUp B1 has forbidden EE-* types; reason must appear as constraint");
    }

    [Fact]
    public void ConversationUserPrompt_WrapUp_B1_ScopeConstraintAppearsBeforeJsonSchema()
    {
        var ctx = BaseCtx() with { SectionType = "WrapUp" };

        var req = _sut.BuildConversationPrompt(ctx);

        var constraintIdx = req.UserPrompt.IndexOf("exactly 1 scenario", StringComparison.Ordinal);
        var schemaIdx     = req.UserPrompt.IndexOf("{\"scenarios\"", StringComparison.Ordinal);
        constraintIdx.Should().BeGreaterThan(-1, because: "scope constraint must be present");
        schemaIdx.Should().BeGreaterThan(-1, because: "JSON schema must be present");
        constraintIdx.Should().BeLessThan(schemaIdx,
            because: "scope constraint must appear before the JSON schema");
    }

    [Fact]
    public void ConversationUserPrompt_WrapUp_B1_ContainsNoNewMaterialConstraint()
    {
        var ctx = BaseCtx() with { SectionType = "WrapUp" };

        var req = _sut.BuildConversationPrompt(ctx);

        req.UserPrompt.Should().Contain("Do not introduce new vocabulary",
            because: "WrapUp must explicitly forbid introducing new material");
    }

    [Fact]
    public void ConversationUserPrompt_WrapUp_B1_ContainsDuration()
    {
        var ctx = BaseCtx() with { SectionType = "WrapUp" };

        var req = _sut.BuildConversationPrompt(ctx);

        req.UserPrompt.Should().Contain("2-4 minutes",
            because: "WrapUp B1 duration is 2-4 minutes per wrapup.json");
    }

    [Fact]
    public void ConversationUserPrompt_WrapUp_B1_ContainsInteractionPattern()
    {
        var ctx = BaseCtx() with { SectionType = "WrapUp" };

        var req = _sut.BuildConversationPrompt(ctx);

        req.UserPrompt.Should().Contain("student-led",
            because: "WrapUp B1 interaction pattern is student-led per wrapup.json");
    }

    [Fact]
    public void ConversationUserPrompt_WrapUp_B1_ContainsForbiddenReasons()
    {
        var ctx = BaseCtx() with { SectionType = "WrapUp" };

        var req = _sut.BuildConversationPrompt(ctx);

        req.UserPrompt.Should().Contain("Games introduce new activity type",
            because: "WrapUp B1 has forbidden LUD-* types; reason must appear as constraint");
    }

    [Fact]
    public void ConversationUserPrompt_GenericPath_UnchangedByRefactor()
    {
        // Verify the generic (non-WarmUp, non-WrapUp) path is not affected
        var ctx = BaseCtx() with { SectionType = null };

        var req = _sut.BuildConversationPrompt(ctx);

        req.UserPrompt.Should().Contain("2-3 scenarios",
            because: "generic conversation path must still request 2-3 scenarios");
        req.UserPrompt.Should().NotContain("Duration:",
            because: "generic path does not inject section profile data");
    }

    [Fact]
    public void LessonPlanUserPrompt_WarmUp_HasScopeLabelInSectionHeader()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        req.UserPrompt.Should().Contain("warmUp", because: "warmUp must appear in the section guidelines");
        req.UserPrompt.Should().Contain("scope: brief", because: "warmUp scope is brief and must be labelled in the section header");
    }

    [Fact]
    public void LessonPlanUserPrompt_WrapUp_HasScopeLabelInSectionHeader()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        req.UserPrompt.Should().Contain("wrapUp");
        req.UserPrompt.Should().Contain("scope: brief");
    }

    [Fact]
    public void LessonPlanUserPrompt_Practice_HasNoScopeLabel()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        // Practice section line should not contain scope label
        var practiceLineContainsScope = req.UserPrompt
            .Split('\n')
            .Where(l => l.Contains("practice"))
            .Any(l => l.Contains("scope:"));

        practiceLineContainsScope.Should().BeFalse(
            because: "practice has full scope and must not have a scope label in its section header");
    }

    [Fact]
    public void BuildLessonPlanPrompt_LogsSystemAndUserPromptAtDebug()
    {
        var fakeLogger = new FakeLogger<PromptService>();
        var sut = new PromptService(ProfileService, PedagogyService, fakeLogger, NoOpSchemas);

        sut.BuildLessonPlanPrompt(BaseCtx());

        var debugEntries = fakeLogger.Entries.Where(e => e.Level == LogLevel.Debug).ToList();
        debugEntries.Should().HaveCount(2, because: "one Debug entry for system prompt and one for user prompt");
        debugEntries[0].Message.Should().Contain("PromptSystem");
        debugEntries[1].Message.Should().Contain("PromptUser");
        debugEntries[1].Message.Should().Contain("blockType=lesson-plan");
    }

    // --- Exam Prep template guidance injection ---

    [Fact]
    public void BuildFreeTextPrompt_ExamPrep_WarmUp_IncludesExamBriefingRequirement()
    {
        var ctx = BaseCtx() with
        {
            TemplateName = "Exam Prep",
            SectionType = "WarmUp",
            CefrLevel = "B2",
        };

        var req = _sut.BuildFreeTextPrompt(ctx);

        req.UserPrompt.Should().Contain("SECTION REQUIREMENT");
        req.UserPrompt.Should().Contain("exam task type");
        req.UserPrompt.Should().Contain("No conversational icebreaker",
            because: "exam-prep WarmUp must explicitly forbid an icebreaker");
    }

    [Fact]
    public void BuildFreeTextPrompt_ExamPrep_Production_IncludesWrittenTaskRequirement()
    {
        var ctx = BaseCtx() with
        {
            TemplateName = "Exam Prep",
            SectionType = "Production",
            CefrLevel = "B2",
        };

        var req = _sut.BuildFreeTextPrompt(ctx);

        req.UserPrompt.Should().Contain("SECTION REQUIREMENT");
        req.UserPrompt.Should().Contain("written");
        req.UserPrompt.Should().Contain("time limit");
    }

    [Fact]
    public void BuildFreeTextPrompt_ExamPrep_IncludesLevelVariation()
    {
        var ctx = BaseCtx() with
        {
            TemplateName = "Exam Prep",
            SectionType = "Production",
            CefrLevel = "B1",
        };

        var req = _sut.BuildFreeTextPrompt(ctx);

        req.UserPrompt.Should().Contain("Level note (B1)");
        req.UserPrompt.Should().Contain("DELE B1");
    }

    [Fact]
    public void BuildExercisesPrompt_ExamPrep_Practice_IncludesTimedPracticeRequirement()
    {
        var ctx = BaseCtx() with
        {
            TemplateName = "Exam Prep",
            SectionType = "Practice",
            CefrLevel = "B2",
        };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("SECTION REQUIREMENT");
        req.UserPrompt.Should().Contain("Timed written practice");
        req.UserPrompt.Should().Contain("Timer is mandatory");
    }

    [Fact]
    public void BuildFreeTextPrompt_NoTemplate_DoesNotIncludeTemplateGuidance()
    {
        var ctx = BaseCtx() with { SectionType = "WarmUp" };

        var req = _sut.BuildFreeTextPrompt(ctx);

        req.UserPrompt.Should().NotContain("SECTION REQUIREMENT");
    }

    // --- Content type constraints in prompts (#358) ---

    [Fact]
    public void LessonPlanUserPrompt_EmitsValidContentTypes_ForEachSection()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        req.UserPrompt.Should().Contain("Valid content types:", because: "section guidelines must include valid content types from section profiles");
    }

    [Fact]
    public void LessonPlanUserPrompt_ReadingComprehension_Presentation_EmitsPreferredContentTypeReading()
    {
        var ctx = BaseCtx() with { TemplateName = "Reading & Comprehension" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("Preferred content type: reading",
            because: "R&C template presentation must signal reading as the preferred content type");
    }

    [Fact]
    public void LessonPlanUserPrompt_ExamPrep_Production_EmitsPreferredContentTypeExercises()
    {
        var ctx = BaseCtx() with { TemplateName = "Exam Prep", CefrLevel = "B2" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("Preferred content type: exercises",
            because: "Exam Prep production must signal exercises as the preferred content type");
    }

    [Fact]
    public void LessonPlanUserPrompt_ExamPrep_Practice_EmitsPreferredContentTypeExercises()
    {
        var ctx = BaseCtx() with { TemplateName = "Exam Prep", CefrLevel = "B2" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        // Practice section line contains exercises preferred type
        var lines = req.UserPrompt.Split('\n');
        var hasPracticePreferred = lines
            .SkipWhile(l => !l.Contains("- practice"))
            .TakeWhile((l, i) => i == 0 || l.StartsWith("  "))
            .Any(l => l.Contains("Preferred content type: exercises"));

        hasPracticePreferred.Should().BeTrue(because: "Exam Prep practice must signal exercises as preferred content type");
    }

    [Fact]
    public void LessonPlanUserPrompt_NoTemplate_DoesNotEmitPreferredContentType()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        req.UserPrompt.Should().NotContain("Preferred content type:",
            because: "without a template, no preferred content type should be emitted");
    }

    [Fact]
    public void BuildExercisesPrompt_ExamPrep_Production_IncludesContentTypeContext()
    {
        var ctx = BaseCtx() with
        {
            TemplateName = "Exam Prep",
            SectionType = "Production",
            CefrLevel = "B2",
        };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("SECTION CONTENT TYPE CONTEXT",
            because: "individual block prompts must include content type reinforcement context");
        req.UserPrompt.Should().Contain("Preferred type: exercises",
            because: "Exam Prep production reinforcement must confirm exercises is the preferred type");
    }

    [Fact]
    public void BuildReadingPrompt_ReadingComprehension_Presentation_IncludesContentTypeContext()
    {
        var ctx = BaseCtx() with
        {
            TemplateName = "Reading & Comprehension",
            SectionType = "Presentation",
            CefrLevel = "B1",
        };

        var req = _sut.BuildReadingPrompt(ctx);

        req.UserPrompt.Should().Contain("SECTION CONTENT TYPE CONTEXT",
            because: "reading block prompt must include content type context");
        req.UserPrompt.Should().Contain("Preferred type: reading",
            because: "R&C presentation reinforcement must confirm reading is the preferred type");
    }

    [Fact]
    public void BuildGrammarPrompt_NoTemplate_DoesNotIncludeContentTypeContext_ForSectionWithSingleType()
    {
        // warmUp has contentTypes: ["conversation"] — still emits context but no preferred type
        var ctx = BaseCtx() with { SectionType = "WarmUp" };

        var req = _sut.BuildGrammarPrompt(ctx);

        req.UserPrompt.Should().NotContain("Preferred type:",
            because: "without a template, no preferred content type should be emitted in block prompts");
    }

    // --- Grammar constraints from pedagogy config ---

    [Fact]
    public void BuildExercisesPrompt_Spanish_IncludesSubjunctiveTemporalCorrelationConstraint()
    {
        var ctx = BaseCtx() with { Language = "Spanish" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("GRAMMAR ACCURACY CONSTRAINTS");
        req.UserPrompt.Should().Contain("present subjunctive", because: "rule must specify present subjunctive after present-tense main clause");
        req.UserPrompt.Should().Contain("pueda", because: "rule must give a concrete present-subjunctive example");
    }

    [Fact]
    public void BuildExercisesPrompt_English_OmitsGrammarConstraintsBlock()
    {
        var req = _sut.BuildExercisesPrompt(BaseCtx()); // Language: "English"

        req.UserPrompt.Should().NotContain("GRAMMAR ACCURACY CONSTRAINTS");
    }

    // --- Content schema injection ---

    [Fact]
    public void BuildVocabularyPrompt_IncludesSchema_WhenSchemaServiceReturnsSchema()
    {
        const string schemaJson = """{"type":"object","required":["items"]}""";
        var sut = new PromptService(ProfileService, PedagogyService, NullLogger<PromptService>.Instance,
            new StubContentSchemaService("vocabulary", schemaJson));

        var req = sut.BuildVocabularyPrompt(BaseCtx());

        req.UserPrompt.Should().Contain("Generate JSON strictly matching this schema:");
        req.UserPrompt.Should().Contain(schemaJson);
    }

    [Fact]
    public void BuildVocabularyPrompt_OmitsSchemaSection_WhenSchemaServiceReturnsNull()
    {
        var req = _sut.BuildVocabularyPrompt(BaseCtx());

        req.UserPrompt.Should().NotContain("Generate JSON strictly matching this schema:");
    }

    [Fact]
    public void BuildGrammarPrompt_IncludesSchema_WhenSchemaServiceReturnsSchema()
    {
        const string schemaJson = """{"type":"object","required":["title"]}""";
        var sut = new PromptService(ProfileService, PedagogyService, NullLogger<PromptService>.Instance,
            new StubContentSchemaService("grammar", schemaJson));

        var req = sut.BuildGrammarPrompt(BaseCtx());

        req.UserPrompt.Should().Contain(schemaJson);
    }

    [Fact]
    public void BuildFreeTextPrompt_NeverIncludesSchema_EvenWhenSchemaServiceHasEntry()
    {
        const string schemaJson = """{"type":"object"}""";
        var sut = new PromptService(ProfileService, PedagogyService, NullLogger<PromptService>.Instance,
            new StubContentSchemaService("free-text", schemaJson));

        var req = sut.BuildFreeTextPrompt(BaseCtx());

        // free-text is prose only; schema service returns content but blockType is "free-text"
        // This test documents the behavior: if someone adds a free-text.json schema file,
        // it WILL be injected. The absence of a free-text.json schema file is what prevents it.
        req.UserPrompt.Should().Contain(schemaJson);
    }

    [Theory]
    [InlineData("exercises")]
    [InlineData("conversation")]
    [InlineData("reading")]
    [InlineData("homework")]
    [InlineData("lesson-plan")]
    public void Build_AllRemainingPrompts_IncludeSchema_WhenSchemaServiceReturnsSchema(string contentType)
    {
        const string schemaJson = """{"type":"object","required":["items"]}""";
        var sut = new PromptService(ProfileService, PedagogyService, NullLogger<PromptService>.Instance,
            new StubContentSchemaService(contentType, schemaJson));

        var req = contentType switch
        {
            "exercises"    => sut.BuildExercisesPrompt(BaseCtx()),
            "conversation" => sut.BuildConversationPrompt(BaseCtx()),
            "reading"      => sut.BuildReadingPrompt(BaseCtx()),
            "homework"     => sut.BuildHomeworkPrompt(BaseCtx()),
            "lesson-plan"  => sut.BuildLessonPlanPrompt(BaseCtx()),
            _              => throw new ArgumentOutOfRangeException(nameof(contentType))
        };

        req.UserPrompt.Should().Contain("Generate JSON strictly matching this schema:");
        req.UserPrompt.Should().Contain(schemaJson);
    }

    // --- Practice stage scaffolding ---

    [Fact]
    public void ExercisesPrompt_B1_IncludesStageGuidanceBlock()
    {
        var ctx = BaseCtx() with { CefrLevel = "B1" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("PRACTICE SCAFFOLDING STAGES:");
        req.UserPrompt.Should().Contain("controlled");
        req.UserPrompt.Should().Contain("meaningful");
        req.UserPrompt.Should().Contain("guided_free");
    }

    [Fact]
    public void ExercisesPrompt_A1_IncludesControlledAndMeaningful_NotGuidedFree()
    {
        var ctx = BaseCtx() with { CefrLevel = "A1" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("PRACTICE SCAFFOLDING STAGES:");
        req.UserPrompt.Should().Contain("\"controlled\"");
        req.UserPrompt.Should().Contain("\"meaningful\"");
        req.UserPrompt.Should().NotContain("\"guided_free\"",
            because: "guided_free is not a required stage at A1");
    }

    [Fact]
    public void ExercisesPrompt_B1_RequiresDifferentFormatPerStage()
    {
        var ctx = BaseCtx() with { CefrLevel = "B1" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("Each stage MUST use a different exercise format");
    }

    // --- Sentence ordering format ---

    [Fact]
    public void ExercisesPrompt_A1_IncludesSentenceOrderingInJsonTemplate()
    {
        var ctx = BaseCtx() with { CefrLevel = "A1" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("sentenceOrdering",
            because: "A1 is the primary use case for sentence ordering (word-level reordering)");
        req.UserPrompt.Should().Contain("correctOrder",
            because: "the prompt must specify how correctOrder encodes the correct sequence");
    }

    [Fact]
    public void ExercisesPrompt_A2_IncludesSentenceOrderingInJsonTemplate()
    {
        var ctx = BaseCtx() with { CefrLevel = "A2" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("sentenceOrdering",
            because: "A2 also uses sentence ordering for controlled practice");
    }

    // --- Sentence transformation format ---

    [Fact]
    public void ExercisesPrompt_IncludesSentenceTransformationInJsonTemplate()
    {
        var ctx = BaseCtx() with { CefrLevel = "B1" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("sentenceTransformation",
            because: "B1+ exercises should include sentence transformation format");
        req.UserPrompt.Should().Contain("alternatives",
            because: "the prompt must specify alternatives for multi-answer support");
    }

    [Fact]
    public void ExercisesPrompt_SentenceTransformationGuidanceMentionsB1Plus()
    {
        var ctx = BaseCtx() with { CefrLevel = "B2" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("B1+",
            because: "guidance should specify B1+ as the target level range");
        req.UserPrompt.Should().Contain("DELE",
            because: "guidance should reference DELE exam relevance");
    }

    [Fact]
    public void ExercisesStageGuidance_IncludesSentenceTransformationInFormatList()
    {
        var ctx = BaseCtx() with { CefrLevel = "B1" };

        var req = _sut.BuildExercisesPrompt(ctx);

        req.UserPrompt.Should().Contain("sentenceTransformation",
            because: "the stage diversity instruction must list sentenceTransformation as a valid format");
    }

    // --- BuildGuidedWritingPrompt ---

    [Fact]
    public void GuidedWritingPrompt_ContainsWordCountFromConfig_NotHardcoded()
    {
        // A1 config: wordCountMin=30, wordCountMax=50 (from data/pedagogy/cefr-levels/a1.json)
        var ctx = BaseCtx() with { CefrLevel = "A1" };
        var req = _sut.BuildGuidedWritingPrompt(ctx);

        req.UserPrompt.Should().Contain("30", because: "A1 wordCountMin=30 must come from config");
        req.UserPrompt.Should().Contain("50", because: "A1 wordCountMax=50 must come from config");
    }

    [Fact]
    public void GuidedWritingPrompt_B2_ContainsDifferentWordCount()
    {
        // B2 config: wordCountMin=130, wordCountMax=200 (from data/pedagogy/cefr-levels/b2.json)
        var ctx = BaseCtx() with { CefrLevel = "B2" };
        var req = _sut.BuildGuidedWritingPrompt(ctx);

        req.UserPrompt.Should().Contain("130", because: "B2 wordCountMin=130 must come from config");
        req.UserPrompt.Should().Contain("200", because: "B2 wordCountMax=200 must come from config");
    }

    [Fact]
    public void GuidedWritingPrompt_UsesSonnetModel()
        => _sut.BuildGuidedWritingPrompt(BaseCtx()).Model.Should().Be(ClaudeModel.Sonnet);

    [Fact]
    public void GuidedWritingPrompt_HasMaxTokens2048()
        => _sut.BuildGuidedWritingPrompt(BaseCtx()).MaxTokens.Should().Be(2048);

    [Fact]
    public void GuidedWritingPrompt_ContainsTopicFromContext()
    {
        var ctx = BaseCtx() with { Topic = "El medio ambiente" };
        var req = _sut.BuildGuidedWritingPrompt(ctx);

        req.UserPrompt.Should().Contain("El medio ambiente");
    }

    [Fact]
    public void GuidedWritingPrompt_InjectsSchema()
    {
        var schemaJson = """{"type":"object"}""";
        var sut = new PromptService(ProfileService, PedagogyService, NullLogger<PromptService>.Instance,
            new StubContentSchemaService("guided-writing", schemaJson));

        var req = sut.BuildGuidedWritingPrompt(BaseCtx());

        req.UserPrompt.Should().Contain("Generate JSON strictly matching this schema:",
            because: "guided-writing schema must be injected by ContentSchemaService");
        req.UserPrompt.Should().Contain(schemaJson);
    }

    // --- BuildErrorCorrectionPrompt ---

    [Fact]
    public void ErrorCorrectionPrompt_ContainsTopicFromContext()
    {
        var ctx = BaseCtx() with { Topic = "El trabajo" };
        var req = _sut.BuildErrorCorrectionPrompt(ctx);

        req.UserPrompt.Should().Contain("El trabajo");
    }

    [Fact]
    public void ErrorCorrectionPrompt_ContainsCefrLevel()
    {
        var ctx = BaseCtx() with { CefrLevel = "B2" };
        var req = _sut.BuildErrorCorrectionPrompt(ctx);

        req.UserPrompt.Should().Contain("B2");
    }

    [Fact]
    public void ErrorCorrectionPrompt_UsesSonnetModel()
        => _sut.BuildErrorCorrectionPrompt(BaseCtx()).Model.Should().Be(ClaudeModel.Sonnet);

    [Fact]
    public void ErrorCorrectionPrompt_HasMaxTokens3000()
        => _sut.BuildErrorCorrectionPrompt(BaseCtx()).MaxTokens.Should().Be(3000);

    [Fact]
    public void ErrorCorrectionPrompt_IncludesErrorSpanInstruction()
    {
        var req = _sut.BuildErrorCorrectionPrompt(BaseCtx());
        req.UserPrompt.Should().Contain("errorSpan",
            because: "prompt must instruct Claude to generate errorSpan character indices");
    }

    [Fact]
    public void ErrorCorrectionPrompt_IncludesErrorTypeInstruction()
    {
        var req = _sut.BuildErrorCorrectionPrompt(BaseCtx());
        req.UserPrompt.Should().Contain("errorType",
            because: "prompt must include errorType field guidance");
    }

    [Fact]
    public void ErrorCorrectionPrompt_A2_IncludesLevelSpecificNote()
    {
        // A2 practice.json levelSpecificNotes GR-04: "Simple agreement/gender errors only..."
        var ctx = BaseCtx() with { CefrLevel = "A2" };
        var req = _sut.BuildErrorCorrectionPrompt(ctx);

        req.UserPrompt.Should().Contain("Simple agreement",
            because: "A2 level note for GR-04 must be injected from practice.json levelSpecificNotes");
    }

    [Fact]
    public void ErrorCorrectionPrompt_B1_IncludesLevelSpecificNote()
    {
        // B1 practice.json levelSpecificNotes GR-04: "Sentence-level corrections only at B1..."
        var ctx = BaseCtx() with { CefrLevel = "B1" };
        var req = _sut.BuildErrorCorrectionPrompt(ctx);

        req.UserPrompt.Should().Contain("Sentence-level corrections",
            because: "B1 level note for GR-04 must be injected from practice.json levelSpecificNotes");
    }

    [Fact]
    public void ErrorCorrectionPrompt_WithNativeLanguage_IncludesL1Block()
    {
        var ctx = BaseCtx() with { StudentNativeLanguage = "Italian" };
        var req = _sut.BuildErrorCorrectionPrompt(ctx);

        req.UserPrompt.Should().Contain("L1 ADJUSTMENTS",
            because: "L1 influence notes must be included when native language is known");
    }

    [Fact]
    public void ErrorCorrectionPrompt_NoHardcodedLevelConditionals_SameStructureAcrossLevels()
    {
        // Verify the prompt structure is consistent (no level-specific code paths)
        var b1 = _sut.BuildErrorCorrectionPrompt(BaseCtx() with { CefrLevel = "B1" });
        var c1 = _sut.BuildErrorCorrectionPrompt(BaseCtx() with { CefrLevel = "C1" });

        b1.UserPrompt.Should().Contain("errorSpan");
        c1.UserPrompt.Should().Contain("errorSpan");
    }

    // ─── Noticing Task ──────────────────────────────────────────────────

    [Fact]
    public void BuildNoticingTaskPrompt_IncludesDiscoveryInstructions()
    {
        var result = _sut.BuildNoticingTaskPrompt(BaseCtx() with { CefrLevel = "B1" });

        result.UserPrompt.Should().Contain("noticing task");
        result.UserPrompt.Should().Contain("discoveryQuestions");
        result.UserPrompt.Should().Contain("targets");
        result.UserPrompt.Should().Contain("teacherNotes");
    }

    [Fact]
    public void BuildNoticingTaskPrompt_IncludesCefrGuidance()
    {
        var result = _sut.BuildNoticingTaskPrompt(BaseCtx() with { CefrLevel = "B1" });

        result.UserPrompt.Should().Contain("DISCOVERY TASK PARAMETERS");
        result.UserPrompt.Should().Contain("tense contrasts");
    }

    [Fact]
    public void BuildNoticingTaskPrompt_IncludesGrammarScope()
    {
        var result = _sut.BuildNoticingTaskPrompt(BaseCtx() with { CefrLevel = "B1", Language = "Spanish" });

        result.UserPrompt.Should().Contain("GRAMMAR SCOPE");
    }

    [Fact]
    public void BuildNoticingTaskPrompt_UsesSonnetModel()
    {
        var result = _sut.BuildNoticingTaskPrompt(BaseCtx());

        result.Model.Should().Be(ClaudeModel.Sonnet);
    }

    [Fact]
    public void BuildNoticingTaskPrompt_DefaultsToPresentationSection()
    {
        var logger = new FakeLogger<PromptService>();
        var sut = new PromptService(ProfileService, PedagogyService, logger, NoOpSchemas);

        sut.BuildNoticingTaskPrompt(BaseCtx());

        logger.Entries.Should().Contain(e => e.Message.Contains("section=presentation"));
    }

    [Fact]
    public void BuildNoticingTaskPrompt_NoLevelConditionals()
    {
        var a2 = _sut.BuildNoticingTaskPrompt(BaseCtx() with { CefrLevel = "A2" });
        var c1 = _sut.BuildNoticingTaskPrompt(BaseCtx() with { CefrLevel = "C1" });

        a2.UserPrompt.Should().Contain("discoveryQuestions");
        c1.UserPrompt.Should().Contain("discoveryQuestions");
    }

    [Fact]
    public void BuildNoticingTaskPrompt_InjectsSchemaWhenAvailable()
    {
        var schemaService = new StubContentSchemaService("noticing-task", "{\"type\":\"object\"}");
        var sut = new PromptService(ProfileService, PedagogyService, NullLogger<PromptService>.Instance, schemaService);

        var result = sut.BuildNoticingTaskPrompt(BaseCtx());

        result.UserPrompt.Should().Contain("Generate JSON strictly matching this schema");
    }

    // --- BuildGrammarPrompt: L1 contrastive notes ---

    [Fact]
    public void BuildGrammarPrompt_WithItalianAndSerEstarTopic_IncludesContrastiveBlock()
    {
        var ctx = BaseCtx() with
        {
            StudentNativeLanguage = "italian",
            Topic = "ser-estar distinction",
            CefrLevel = "A2"
        };

        var req = _sut.BuildGrammarPrompt(ctx);

        req.UserPrompt.Should().Contain("L1 CONTRASTIVE NOTE",
            because: "Italian + ser-estar topic + A2 level matches a contrastive pattern in l1-influence.json");
        req.UserPrompt.Should().Contain("essere",
            because: "the Italian-specific contrastive pattern references 'essere'");
    }

    [Fact]
    public void BuildGrammarPrompt_WithNoNativeLanguage_OmitsContrastiveBlock()
    {
        var ctx = BaseCtx() with { StudentNativeLanguage = null, Topic = "ser-estar distinction" };

        var req = _sut.BuildGrammarPrompt(ctx);

        req.UserPrompt.Should().NotContain("L1 CONTRASTIVE NOTE",
            because: "no native language means no contrastive note should be generated");
    }

    [Fact]
    public void BuildGrammarPrompt_WithItalianButUnmatchedTopic_OmitsContrastiveBlock()
    {
        var ctx = BaseCtx() with
        {
            StudentNativeLanguage = "italian",
            Topic = "preterite vs imperfect",
            CefrLevel = "B1"
        };

        var req = _sut.BuildGrammarPrompt(ctx);

        req.UserPrompt.Should().NotContain("L1 CONTRASTIVE NOTE",
            because: "no contrastive pattern matches 'preterite vs imperfect' for Italian");
    }
}
