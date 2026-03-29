using LangTeach.Api.DTOs;

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
    ClaudeRequest BuildFreeTextPrompt(GenerationContext ctx);
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
    string[]? StudentGoals,
    string[]? StudentWeaknesses = null,
    DifficultyDto[]? StudentDifficulties = null,
    string? TemplateLevel = null,
    IReadOnlyList<TemplateUnitContext>? TemplateUnits = null,
    string? TeacherNotes = null,
    string CourseType = "general"
);

/// <summary>
/// Minimal representation of a template unit passed to the prompt builder
/// for student-specific personalization.
/// </summary>
public record TemplateUnitContext(
    int OrderIndex,
    string Topic,
    string? GrammarFocus,
    IReadOnlyList<string> CompetencyFocus
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
    string? Direction = null,
    string[]? MaterialFileNames = null,
    DifficultyDto[]? StudentDifficulties = null,
    IReadOnlyList<string>? GrammarConstraints = null,
    string? TemplateName = null,
    string? CurriculumObjectives = null,
    string? TeacherGrammarConstraints = null,
    string? SectionType = null
);
