namespace LangTeach.Api.AI;

public interface IPromptService
{
    ClaudeRequest BuildLessonPlanPrompt(GenerationContext ctx);
    ClaudeRequest BuildVocabularyPrompt(GenerationContext ctx);
    ClaudeRequest BuildGrammarPrompt(GenerationContext ctx);
    ClaudeRequest BuildExercisesPrompt(GenerationContext ctx);
    ClaudeRequest BuildConversationPrompt(GenerationContext ctx);
    ClaudeRequest BuildReadingPrompt(GenerationContext ctx);
    ClaudeRequest BuildHomeworkPrompt(GenerationContext ctx);
    ClaudeRequest BuildCurriculumPrompt(CurriculumContext ctx);
}

public record CurriculumContext(
    string Language,
    string Mode,
    int SessionCount,
    string? TargetCefrLevel,
    string? TargetExam,
    DateOnly? ExamDate,
    string? StudentName,
    string? StudentNativeLanguage,
    string[]? StudentInterests,
    string[]? StudentGoals
);

public record GenerationContext(
    string Language,
    string CefrLevel,
    string Topic,
    string Style,
    int DurationMinutes,
    string? StudentName,
    string? StudentNativeLanguage,
    string[]? StudentInterests,
    string[]? StudentGoals,
    string[]? StudentWeaknesses,
    string? ExistingNotes,
    string? LessonSummary = null,
    string? Direction = null
);
