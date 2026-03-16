using System.Text.Json.Serialization;

namespace LangTeach.Api.Services.PdfExport;

// Vocabulary
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record VocabularyItem(
    [property: JsonPropertyName("word")] string Word = "",
    [property: JsonPropertyName("definition")] string Definition = "",
    [property: JsonPropertyName("exampleSentence")] string? ExampleSentence = null,
    [property: JsonPropertyName("translation")] string? Translation = null);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record VocabularyContent(
    [property: JsonPropertyName("items")] VocabularyItem[]? Items = null);

// Grammar
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record GrammarExample(
    [property: JsonPropertyName("sentence")] string Sentence = "",
    [property: JsonPropertyName("note")] string? Note = null);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record GrammarContent(
    [property: JsonPropertyName("title")] string Title = "",
    [property: JsonPropertyName("explanation")] string Explanation = "",
    [property: JsonPropertyName("examples")] GrammarExample[]? Examples = null,
    [property: JsonPropertyName("commonMistakes")] string[]? CommonMistakes = null);

// Exercises
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record ExercisesFillInBlank(
    [property: JsonPropertyName("sentence")] string Sentence = "",
    [property: JsonPropertyName("answer")] string Answer = "",
    [property: JsonPropertyName("hint")] string? Hint = null);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record ExercisesMultipleChoice(
    [property: JsonPropertyName("question")] string Question = "",
    [property: JsonPropertyName("options")] string[]? Options = null,
    [property: JsonPropertyName("answer")] string Answer = "");

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record ExercisesMatching(
    [property: JsonPropertyName("left")] string Left = "",
    [property: JsonPropertyName("right")] string Right = "");

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record ExercisesContent(
    [property: JsonPropertyName("fillInBlank")] ExercisesFillInBlank[]? FillInBlank = null,
    [property: JsonPropertyName("multipleChoice")] ExercisesMultipleChoice[]? MultipleChoice = null,
    [property: JsonPropertyName("matching")] ExercisesMatching[]? Matching = null);

// Conversation
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record ConversationScenario(
    [property: JsonPropertyName("setup")] string Setup = "",
    [property: JsonPropertyName("roleA")] string RoleA = "",
    [property: JsonPropertyName("roleB")] string RoleB = "",
    [property: JsonPropertyName("roleAPhrases")] string[]? RoleAPhrases = null,
    [property: JsonPropertyName("roleBPhrases")] string[]? RoleBPhrases = null,
    [property: JsonPropertyName("keyPhrases")] string[]? KeyPhrases = null);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record ConversationContent(
    [property: JsonPropertyName("scenarios")] ConversationScenario[]? Scenarios = null);

// Reading
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record ReadingVocabHighlight(
    [property: JsonPropertyName("word")] string Word = "",
    [property: JsonPropertyName("definition")] string Definition = "");

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record ReadingQuestion(
    [property: JsonPropertyName("question")] string Question = "",
    [property: JsonPropertyName("answer")] string Answer = "",
    [property: JsonPropertyName("type")] string Type = "");

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record ReadingContent(
    [property: JsonPropertyName("passage")] string Passage = "",
    [property: JsonPropertyName("comprehensionQuestions")] ReadingQuestion[]? ComprehensionQuestions = null,
    [property: JsonPropertyName("vocabularyHighlights")] ReadingVocabHighlight[]? VocabularyHighlights = null);

// Homework
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record HomeworkTask(
    [property: JsonPropertyName("type")] string Type = "",
    [property: JsonPropertyName("instructions")] string Instructions = "",
    [property: JsonPropertyName("examples")] string[]? Examples = null);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record HomeworkContent(
    [property: JsonPropertyName("tasks")] HomeworkTask[]? Tasks = null);

// Lesson Plan
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record LessonPlanSections(
    [property: JsonPropertyName("warmUp")] string WarmUp = "",
    [property: JsonPropertyName("presentation")] string Presentation = "",
    [property: JsonPropertyName("practice")] string Practice = "",
    [property: JsonPropertyName("production")] string Production = "",
    [property: JsonPropertyName("wrapUp")] string WrapUp = "");

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Skip)]
public record LessonPlanContent(
    [property: JsonPropertyName("title")] string Title = "",
    [property: JsonPropertyName("objectives")] string[]? Objectives = null,
    [property: JsonPropertyName("sections")] LessonPlanSections? Sections = null);
