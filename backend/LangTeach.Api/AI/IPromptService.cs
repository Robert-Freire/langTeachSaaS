using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.AI;

/// <summary>
/// A student weakness with a category type used to route to the correct prompt guidance.
/// Default type is "grammatical" so existing weaknesses without an explicit type are handled correctly.
/// </summary>
public record StudentWeakness(string Description, string WeaknessType = "grammatical");

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
    ClaudeRequest BuildGuidedWritingPrompt(GenerationContext ctx);
    ClaudeRequest BuildErrorCorrectionPrompt(GenerationContext ctx);
    ClaudeRequest BuildNoticingTaskPrompt(GenerationContext ctx);
    ClaudeRequest BuildCurriculumPrompt(CurriculumContext ctx);
    ClaudeRequest BuildReflectionExtractionPrompt(ReflectionExtractionContext ctx);
    ClaudeRequest BuildReplanSuggestionPrompt(ReplanSuggestionContext ctx);
    ClaudeRequest BuildCurriculumValidationPrompt(CurriculumValidationContext ctx);
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
    StudentWeakness[]? StudentWeaknesses = null,
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

public record SessionSummaryEntry(
    DateTime SessionDate,
    string? PlannedContent,
    string? ActualContent
);

public record CoveredTopicEntry(string Tag, string? Category);

public record SessionHistoryContext(
    IReadOnlyList<SessionSummaryEntry> RecentSessions,
    int DaysSinceLastSession,
    string? OpenActionItems,
    string? PendingHomework,
    HomeworkStatus? LastHomeworkStatus,
    IReadOnlyList<CoveredTopicEntry> CoveredTopics,
    IReadOnlyDictionary<string, string> SkillLevelOverrides,
    string? LearningStyleNotes
);

public record ReflectionExtractionContext(DateOnly Today, string TeacherText, IReadOnlyList<string>? KnownDifficulties = null);

public record TaughtEntryContext(string Topic, string? GrammarFocus, string? WhatWasCovered, string? AreasToImprove);
public record PlannedEntryContext(Guid Id, int OrderIndex, string Topic, string? GrammarFocus);

public record ReplanSuggestionContext(
    string CourseName,
    string Language,
    string? TargetCefrLevel,
    string? StudentName,
    IReadOnlyList<TaughtEntryContext> TaughtEntries,
    IReadOnlyList<PlannedEntryContext> PlannedEntries,
    IReadOnlyList<string> Difficulties,
    int MaxSuggestions
);

public record CurriculumValidationContext(
    string TargetLevel,
    IReadOnlyList<string> AllowedGrammar,
    IReadOnlyList<(int OrderIndex, string GrammarFocus)> EntriesWithGrammar
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
    StudentWeakness[]? StudentWeaknesses,
    string? ExistingNotes,
    string? LessonSummary = null,
    string? Direction = null,
    string[]? MaterialFileNames = null,
    DifficultyDto[]? StudentDifficulties = null,
    IReadOnlyList<string>? GrammarConstraints = null,
    string? TemplateName = null,
    string? CurriculumObjectives = null,
    string? TeacherGrammarConstraints = null,
    string? SectionType = null,
    SessionHistoryContext? SessionHistory = null,
    string? StudentReasonForStudying = null,
    string[]? StudentSpokenLanguages = null,
    string? StudentProfession = null,
    int? StudentBirthYear = null,
    string? StudentCountryOfOrigin = null,
    string? StudentCountryOfResidence = null,
    string? StudentOfficialCefrLevel = null
);
