using FluentAssertions;
using LangTeach.Api.AI;
using LangTeach.Api.DTOs;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace LangTeach.Api.Tests.AI;

public class PromptServiceTests
{
    private static readonly ISectionProfileService ProfileService =
        new SectionProfileService(NullLogger<SectionProfileService>.Instance);

    private static readonly IPedagogyConfigService PedagogyService =
        new PedagogyConfigService(NullLogger<PedagogyConfigService>.Instance, ProfileService);

    private readonly PromptService _sut = new(ProfileService, PedagogyService);

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
    public void GrammarPrompt_HasMaxTokens1500()
        => _sut.BuildGrammarPrompt(BaseCtx()).MaxTokens.Should().Be(1500);

    [Fact]
    public void ExercisesPrompt_HasMaxTokens2048()
        => _sut.BuildExercisesPrompt(BaseCtx()).MaxTokens.Should().Be(2048);

    [Fact]
    public void ConversationPrompt_HasMaxTokens1500()
        => _sut.BuildConversationPrompt(BaseCtx()).MaxTokens.Should().Be(1500);

    [Fact]
    public void ReadingPrompt_HasMaxTokens2048()
        => _sut.BuildReadingPrompt(BaseCtx()).MaxTokens.Should().Be(2048);

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
        // Template override content from template-overrides.json (data-driven, replaces hardcoded block)
        req.UserPrompt.Should().Contain("READING & COMPREHENSION TEMPLATE");
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

        // Template override content from template-overrides.json (data-driven, replaces hardcoded block)
        req.UserPrompt.Should().Contain("EXAM PREP TEMPLATE");
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

        req.UserPrompt.Should().Contain("Production is MANDATORY");
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
    public void LessonPlanPrompt_UserPrompt_SpecifiesPracticeOrdering_ControlledFirst()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        req.UserPrompt.Should().Contain("controlled to meaningful");
        req.UserPrompt.Should().Contain("mechanical");
    }

    [Fact]
    public void LessonPlanPrompt_UserPrompt_SpecifiesPracticeOrdering_MeaningfulSecond()
    {
        var req = _sut.BuildLessonPlanPrompt(BaseCtx());

        req.UserPrompt.Should().Contain("MC with close distractors");
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

        // Unknown level: profile guidance is empty, but the static production section text is always present
        req.UserPrompt.Should().Contain("Production is MANDATORY");
        req.UserPrompt.Should().Contain("communicative activity");
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

    // --- Snapshot: key blocks present for representative combinations ---

    [Fact]
    public void Snapshot_A1GrammarFocus_LessonPlan_ContainsAllPedagogyBlocks()
    {
        var ctx = BaseCtx() with { CefrLevel = "A1", TemplateName = "Grammar Focus" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("SECTION COHERENCE RULES");
        req.UserPrompt.Should().Contain("GRAMMAR SCOPE for A1");
        req.UserPrompt.Should().Contain("VOCABULARY TARGETS for A1");
        req.UserPrompt.Should().Contain("GRAMMAR FOCUS TEMPLATE");
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
        req.UserPrompt.Should().Contain("READING & COMPREHENSION TEMPLATE");
        req.UserPrompt.Should().Contain("L1 ADJUSTMENTS for Italian speakers");
    }

    [Fact]
    public void Snapshot_C1Conversation_LessonPlan_ContainsApproachString()
    {
        var ctx = BaseCtx() with { CefrLevel = "C1", TemplateName = "Conversation" };

        var req = _sut.BuildLessonPlanPrompt(ctx);

        req.UserPrompt.Should().Contain("SECTION COHERENCE RULES");
        req.UserPrompt.Should().Contain("VOCABULARY APPROACH for C1");
        req.UserPrompt.Should().Contain("CONVERSATION TEMPLATE");
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
}
