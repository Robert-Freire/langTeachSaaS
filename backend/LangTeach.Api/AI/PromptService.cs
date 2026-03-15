using System.Text;

namespace LangTeach.Api.AI;

public class PromptService : IPromptService
{
    public ClaudeRequest BuildLessonPlanPrompt(GenerationContext ctx) =>
        new(BuildSystemPrompt(ctx), LessonPlanUserPrompt(ctx), ClaudeModel.Sonnet, MaxTokens: 4096);

    public ClaudeRequest BuildVocabularyPrompt(GenerationContext ctx) =>
        new(BuildSystemPrompt(ctx), VocabularyUserPrompt(ctx), ClaudeModel.Haiku, MaxTokens: 1024);

    public ClaudeRequest BuildGrammarPrompt(GenerationContext ctx) =>
        new(BuildSystemPrompt(ctx), GrammarUserPrompt(ctx), ClaudeModel.Sonnet, MaxTokens: 1500);

    public ClaudeRequest BuildExercisesPrompt(GenerationContext ctx) =>
        new(BuildSystemPrompt(ctx), ExercisesUserPrompt(ctx), ClaudeModel.Haiku, MaxTokens: 2048);

    public ClaudeRequest BuildConversationPrompt(GenerationContext ctx) =>
        new(BuildSystemPrompt(ctx), ConversationUserPrompt(ctx), ClaudeModel.Haiku, MaxTokens: 1500);

    public ClaudeRequest BuildReadingPrompt(GenerationContext ctx) =>
        new(BuildSystemPrompt(ctx), ReadingUserPrompt(ctx), ClaudeModel.Sonnet, MaxTokens: 2048);

    public ClaudeRequest BuildHomeworkPrompt(GenerationContext ctx) =>
        new(BuildSystemPrompt(ctx), HomeworkUserPrompt(ctx), ClaudeModel.Sonnet, MaxTokens: 1024);

    private static string BuildSystemPrompt(GenerationContext ctx)
    {
        var sb = new StringBuilder();

        sb.AppendLine($"You are an expert {ctx.Language} teacher creating materials for a {ctx.CefrLevel} level lesson.");
        sb.AppendLine($"Teaching style: {ctx.Style}. Topic: {ctx.Topic}. Duration: {ctx.DurationMinutes} minutes.");
        sb.AppendLine();
        sb.AppendLine($"Write all examples, sentences, and instructions using vocabulary and grammar appropriate for {ctx.CefrLevel}. Do not use structures above this level in examples. Definitions and explanations aimed at the teacher may use higher-level language.");

        if (ctx.StudentName is not null)
        {
            sb.AppendLine();
            sb.AppendLine("Student profile:");
            sb.AppendLine($"- Name: {ctx.StudentName}");

            if (ctx.StudentNativeLanguage is not null)
                sb.AppendLine($"- Native language: {ctx.StudentNativeLanguage}");

            if (ctx.StudentInterests is { Length: > 0 })
                sb.AppendLine($"- Interests: {string.Join(", ", ctx.StudentInterests)}");

            if (ctx.StudentGoals is { Length: > 0 })
                sb.AppendLine($"- Learning goals: {string.Join(", ", ctx.StudentGoals)}");

            if (ctx.StudentWeaknesses is { Length: > 0 })
                sb.AppendLine($"- Areas to improve: {string.Join(", ", ctx.StudentWeaknesses)}");

            sb.AppendLine();
            sb.AppendLine($"Personalize content for this student. Reference their interests in examples.");

            if (ctx.StudentNativeLanguage is not null)
            {
                sb.AppendLine($"The student's native language is {ctx.StudentNativeLanguage}.");
                sb.AppendLine($"- Provide translations in {ctx.StudentNativeLanguage} for vocabulary items.");
                sb.AppendLine($"- For grammar explanations, note where {ctx.Language} differs from {ctx.StudentNativeLanguage}.");
                sb.AppendLine($"- Flag false cognates between {ctx.StudentNativeLanguage} and {ctx.Language} when relevant.");
                sb.AppendLine($"- Be aware of common errors {ctx.StudentNativeLanguage} speakers make in {ctx.Language}.");
            }

            if (ctx.StudentWeaknesses is { Length: > 0 })
                sb.AppendLine("Focus practice on weak areas when relevant to the topic.");
        }

        if (!string.IsNullOrWhiteSpace(ctx.ExistingNotes))
        {
            sb.AppendLine();
            sb.AppendLine($"The teacher has already written these notes for context: {ctx.ExistingNotes}");
            sb.AppendLine("Build on these notes rather than replacing them entirely.");
        }

        sb.AppendLine();
        sb.AppendLine("Respond ONLY with valid JSON matching the schema below. No markdown, no prose, no code fences. Start your response with { and end with }.");

        return sb.ToString().TrimEnd();
    }

    private static string VocabularyUserPrompt(GenerationContext ctx) =>
        $$"""
        Generate a vocabulary list for the lesson on "{{ctx.Topic}}". Return JSON:
        {"items":[{"word":"","definition":"","exampleSentence":"","translation":""}]}
        Limit to 10-15 items appropriate for {{ctx.CefrLevel}}.
        """;

    private static string GrammarUserPrompt(GenerationContext ctx) =>
        $$"""
        Generate a grammar explanation for the lesson on "{{ctx.Topic}}". Return JSON:
        {"title":"","explanation":"","examples":[{"sentence":"","note":""}],"commonMistakes":[""]}
        Include 3-5 examples and 2-3 common mistakes.
        """;

    private static string ExercisesUserPrompt(GenerationContext ctx) =>
        $$"""
        Generate practice exercises for the lesson on "{{ctx.Topic}}". Return JSON:
        {"fillInBlank":[{"sentence":"","answer":"","hint":""}],"multipleChoice":[{"question":"","options":[""],"answer":""}],"matching":[{"left":"","right":""}]}
        Include at least 3 items of each type.
        """;

    private static string ConversationUserPrompt(GenerationContext ctx) =>
        $$"""
        Generate conversation scenarios for the lesson on "{{ctx.Topic}}". Return JSON:
        {"scenarios":[{"setup":"","roleA":"","roleB":"","keyPhrases":[""]}]}
        Include 2-3 scenarios using {{ctx.CefrLevel}}-appropriate language.
        """;

    private static string ReadingUserPrompt(GenerationContext ctx) =>
        $$"""
        Generate a reading passage for the lesson on "{{ctx.Topic}}". Return JSON:
        {"passage":"","comprehensionQuestions":[{"question":"","answer":"","type":"factual|inferential|vocabulary"}],"vocabularyHighlights":[{"word":"","definition":""}]}
        Passage must use {{ctx.CefrLevel}} vocabulary and grammar. Include 3-5 questions and 5-8 vocabulary highlights.
        """;

    private static string HomeworkUserPrompt(GenerationContext ctx)
    {
        var lessonSummaryLine = !string.IsNullOrWhiteSpace(ctx.LessonSummary)
            ? $"This homework follows a lesson where: {ctx.LessonSummary}\n"
            : string.Empty;

        return $$"""
        Generate homework tasks for the lesson on "{{ctx.Topic}}". Return JSON:
        {"tasks":[{"type":"","instructions":"","examples":[""]}]}
        {{lessonSummaryLine}}Include 3-5 varied tasks the student can complete independently.
        """;
    }

    private static string LessonPlanUserPrompt(GenerationContext ctx)
    {
        const string schema = """{"title":"","objectives":[""],"sections":{"warmUp":"","presentation":"","practice":"","production":"","wrapUp":""}}""";
        return $"Generate a complete lesson plan for the lesson on \"{ctx.Topic}\". Return JSON:\n{schema}\nEach section should be detailed enough for the teacher to follow without additional preparation.";
    }
}
