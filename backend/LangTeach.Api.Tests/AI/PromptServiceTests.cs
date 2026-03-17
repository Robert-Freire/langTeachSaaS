using FluentAssertions;
using LangTeach.Api.AI;

namespace LangTeach.Api.Tests.AI;

public class PromptServiceTests
{
    private readonly PromptService _sut = new();

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
}
