using System.Text;

namespace LangTeach.Api.AI;

public class PromptService : IPromptService
{
    public ClaudeRequest BuildLessonPlanPrompt(GenerationContext ctx) =>
        new(BuildSystemPrompt(ctx), LessonPlanUserPrompt(ctx), ClaudeModel.Sonnet, MaxTokens: 8192);

    public ClaudeRequest BuildVocabularyPrompt(GenerationContext ctx) =>
        new(BuildSystemPrompt(ctx), VocabularyUserPrompt(ctx), ClaudeModel.Haiku, MaxTokens: 2048);

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

    public ClaudeRequest BuildCurriculumPrompt(CurriculumContext ctx) =>
        new(CurriculumSystemPrompt(ctx), CurriculumUserPrompt(ctx), ClaudeModel.Sonnet, MaxTokens: 8192);

    private static string Sanitize(string? value) =>
        value is null ? string.Empty : string.Concat(value.Where(c => c >= ' ' || c == '\t')).Trim();

    private static string BuildSystemPrompt(GenerationContext ctx)
    {
        var language      = Sanitize(ctx.Language);
        var cefrLevel     = Sanitize(ctx.CefrLevel);
        var topic         = Sanitize(ctx.Topic);
        var style         = Sanitize(ctx.Style);
        var studentName   = Sanitize(ctx.StudentName);
        var nativeLang    = Sanitize(ctx.StudentNativeLanguage);
        var existingNotes = Sanitize(ctx.ExistingNotes);
        var direction     = Sanitize(ctx.Direction);

        var sb = new StringBuilder();

        sb.AppendLine($"You are an expert {language} teacher creating materials for a {cefrLevel} level lesson.");
        sb.AppendLine($"Teaching style: {style}. Topic: {topic}. Duration: {ctx.DurationMinutes} minutes.");
        sb.AppendLine();
        sb.AppendLine($"Write all examples, sentences, and instructions using vocabulary and grammar appropriate for {cefrLevel}. Do not use structures above this level in examples. Definitions and explanations aimed at the teacher may use higher-level language.");

        if (ctx.GrammarConstraints is { Count: > 0 })
        {
            sb.AppendLine();
            sb.AppendLine($"Target grammar structures for {cefrLevel} (from the course curriculum syllabus). Use only these and lower-level structures in examples:");
            foreach (var g in ctx.GrammarConstraints)
                sb.AppendLine($"- {Sanitize(g)}");
        }

        if (ctx.StudentName is not null)
        {
            var interests  = ctx.StudentInterests?.Select(Sanitize).Where(s => s.Length > 0).ToArray() ?? [];
            var goals      = ctx.StudentGoals?.Select(Sanitize).Where(s => s.Length > 0).ToArray() ?? [];
            var weaknesses = ctx.StudentWeaknesses?.Select(Sanitize).Where(s => s.Length > 0).ToArray() ?? [];

            sb.AppendLine();
            sb.AppendLine("Student profile:");
            sb.AppendLine($"- Name: {studentName}");

            if (ctx.StudentNativeLanguage is not null)
                sb.AppendLine($"- Native language: {nativeLang}");

            if (interests.Length > 0)
                sb.AppendLine($"- Interests: {string.Join(", ", interests)}");

            if (goals.Length > 0)
                sb.AppendLine($"- Learning goals: {string.Join(", ", goals)}");

            if (weaknesses.Length > 0)
                sb.AppendLine($"- Areas to improve: {string.Join(", ", weaknesses)}");

            sb.AppendLine();
            sb.AppendLine($"Personalize content for this student. Reference their interests in examples.");

            if (ctx.StudentNativeLanguage is not null)
            {
                sb.AppendLine($"The student's native language is {nativeLang}.");
                sb.AppendLine($"- For grammar explanations, note where {language} differs from {nativeLang}.");
                sb.AppendLine($"- Flag false cognates between {nativeLang} and {language} when relevant.");
                sb.AppendLine($"- Be aware of common errors {nativeLang} speakers make in {language}.");
            }

            if (weaknesses.Length > 0)
                sb.AppendLine("Focus practice on weak areas when relevant to the topic.");

            if (ctx.StudentDifficulties is { Length: > 0 })
            {
                sb.AppendLine();
                sb.AppendLine("Known difficulties (prioritize these in exercises and examples):");
                foreach (var d in ctx.StudentDifficulties)
                    sb.AppendLine($"- [{Sanitize(d.Severity)}] {Sanitize(d.Category)}: {Sanitize(d.Item)}");
                sb.AppendLine("Design exercises that specifically target these difficulty patterns. For each exercise, ensure at least one item directly addresses a listed difficulty.");
            }
        }

        if (!string.IsNullOrWhiteSpace(existingNotes))
        {
            sb.AppendLine();
            sb.AppendLine($"The teacher has already written these notes for context: {existingNotes}");
            sb.AppendLine("Build on these notes rather than replacing them entirely.");
        }

        if (!string.IsNullOrWhiteSpace(direction))
        {
            sb.AppendLine();
            sb.AppendLine($"IMPORTANT DIRECTION: {direction}. Adjust the generated content accordingly while keeping the same topic and JSON format.");
        }

        if (ctx.MaterialFileNames is { Length: > 0 })
        {
            sb.AppendLine();
            sb.AppendLine("The teacher has uploaded the following reference materials (attached as files):");
            foreach (var name in ctx.MaterialFileNames)
                sb.AppendLine($"- {Sanitize(name)}");
            sb.AppendLine("Use these materials as source/inspiration for the generated content. Adapt, reference, or build upon them as appropriate for the student's level.");
        }
        else
        {
            sb.AppendLine();
            sb.AppendLine("IMPORTANT: All content must be self-contained and work with text alone. Do not reference images, audio clips, videos, physical objects, or any external materials. Every exercise, example, and activity must be completable using only the text provided.");
        }

        sb.AppendLine();
        sb.AppendLine("Respond ONLY with valid JSON matching the schema below. No markdown, no prose, no code fences. Start your response with { and end with }.");

        return sb.ToString().TrimEnd();
    }

    private static string VocabularyUserPrompt(GenerationContext ctx)
    {
        var topic = Sanitize(ctx.Topic);
        var level = Sanitize(ctx.CefrLevel);
        var seed = Guid.NewGuid().ToString("N")[..8];
        return $$"""
        Generate a vocabulary list for the lesson on "{{topic}}". Return JSON:
        {"items":[{"word":"","definition":"","exampleSentence":""}]}
        Limit to 10-15 items appropriate for {{level}}.
        Choose a varied and unexpected selection — avoid the most obvious or common words for this topic (seed: {{seed}}).
        """;
    }

    private static string GrammarUserPrompt(GenerationContext ctx)
    {
        var topic = Sanitize(ctx.Topic);
        return $$"""
        Generate a grammar explanation for the lesson on "{{topic}}". Return JSON:
        {"title":"","explanation":"","examples":[{"sentence":"","note":""}],"commonMistakes":[""]}
        Include 3-5 examples and 2-3 common mistakes.
        """;
    }

    private static string ExercisesUserPrompt(GenerationContext ctx)
    {
        var topic = Sanitize(ctx.Topic);
        return $$"""
        Generate practice exercises for the lesson on "{{topic}}". Return JSON:
        {"fillInBlank":[{"sentence":"","answer":"","hint":"","explanation":""}],"multipleChoice":[{"question":"","options":[""],"answer":"","explanation":""}],"matching":[{"left":"","right":"","explanation":""}]}
        Include at least 3 items of each type.
        For each exercise, include a concise explanation (2-3 sentences) of why the correct answer is correct, considering the student's level and common L1 interference patterns.
        """;
    }

    private static string ConversationUserPrompt(GenerationContext ctx)
    {
        var topic = Sanitize(ctx.Topic);
        var level = Sanitize(ctx.CefrLevel);
        return $$"""
        Generate conversation scenarios for the lesson on "{{topic}}". Return JSON:
        {"scenarios":[{"setup":"","roleA":"","roleB":"","roleAPhrases":[""],"roleBPhrases":[""]}]}
        Include 2-3 scenarios using {{level}}-appropriate language.
        """;
    }

    private static string ReadingUserPrompt(GenerationContext ctx)
    {
        var topic = Sanitize(ctx.Topic);
        var level = Sanitize(ctx.CefrLevel);
        return $$"""
        Generate a reading passage for the lesson on "{{topic}}". Return JSON:
        {"passage":"","comprehensionQuestions":[{"question":"","answer":"","type":"factual|inferential|vocabulary"}],"vocabularyHighlights":[{"word":"","definition":""}]}
        IMPORTANT: Emit the passage field completely before writing comprehensionQuestions.
        Passage must use {{level}} vocabulary and grammar. Include 3-5 questions and 5-8 vocabulary highlights.
        """;
    }

    private static string HomeworkUserPrompt(GenerationContext ctx)
    {
        var topic         = Sanitize(ctx.Topic);
        var lessonSummary = Sanitize(ctx.LessonSummary);
        var lessonSummaryLine = lessonSummary.Length > 0
            ? $"This homework follows a lesson where: {lessonSummary}\n"
            : string.Empty;

        return $$"""
        Generate homework tasks for the lesson on "{{topic}}". Return JSON:
        {"tasks":[{"type":"","instructions":"","examples":[""]}]}
        Use human-readable type labels such as "Fill in the Blanks", "Sentence Writing", "Vocabulary in Context", "Matching", "Translation", or "Short Answer".
        {{lessonSummaryLine}}Include 3-5 varied tasks the student can complete independently.
        """;
    }

    private static string LessonPlanUserPrompt(GenerationContext ctx)
    {
        var topic = Sanitize(ctx.Topic);
        const string schema = """{"title":"","objectives":[""],"sections":{"warmUp":"","presentation":"","practice":"","production":"","wrapUp":""}}""";
        var baseInstruction = $"""
        Generate a complete lesson plan for the lesson on "{topic}". Return JSON:
        {schema}
        Each section should be detailed enough for the teacher to follow without additional preparation. Focus on activities suitable for one-on-one online tutoring. Do not reference physical classroom resources like whiteboards, projectors, or video players.

        Section guidelines:
        - warmUp (2-5 min): A conversational icebreaker. Use a discussion question, opinion prompt, or anecdote starter that the student can answer freely. There is no right or wrong answer. NEVER generate a vocabulary list, grammar drill, translation exercise, or fill-in-blank activity for warmUp. The sole purpose is to get the student talking and relaxed before the lesson begins.
        - presentation: Introduce the new language (vocabulary, grammar, or structure) with examples in context. Explain meanings and usage.
        - practice: Controlled activities where the student practises the new language (fill-in-blank, matching, short answers). Correction is expected.
        - production: A free or communicative activity where the student uses the new language independently with minimal guidance.
        - wrapUp (2-3 min): Brief review of what was covered and preview of homework or next session.
        """;

        if (string.Equals(ctx.TemplateName, "Reading & Comprehension", StringComparison.OrdinalIgnoreCase))
        {
            baseInstruction +=
                "\n\nREADING & COMPREHENSION TEMPLATE REQUIREMENTS (mandatory):\n" +
                "- warmUp: a pre-reading activation task only. Activate schema, predict content from the title, or discuss the topic. Do NOT use grammar drills, vocabulary lists, or fill-in-blank exercises here.\n" +
                "- presentation: embed a complete reading passage (300-500 words, using vocabulary and grammar appropriate for the stated CEFR level) inside this section's notes. The teacher reads it with the student: first read for gist, second read for detail. Pre-teach any blocking vocabulary before reading.\n" +
                "- practice: comprehension questions covering three types: (1) factual - explicitly stated in the text, (2) inferential - requiring the student to read between the lines, (3) vocabulary in context - explain the meaning of a word or phrase as used in the passage. Include at least 2 questions of each type.\n" +
                "- production: a free-production task connected to the passage topic (e.g. short written response, opinion discussion, or a creative extension). The student works independently.\n" +
                "- wrapUp: student summarises the passage in 1-2 sentences; brief discussion of the author's purpose or the student's reaction.\n" +
                "All five sections (warmUp, presentation, practice, production, wrapUp) are required. Do not collapse or omit any of them.";
        }

        return baseInstruction;
    }

    private static string CurriculumSystemPrompt(CurriculumContext ctx)
    {
        var language = Sanitize(ctx.Language);
        var sb = new StringBuilder();
        sb.AppendLine($"You are an expert {language} language teacher and curriculum designer.");
        sb.AppendLine("You output ONLY valid JSON arrays with no markdown, no prose, no code fences.");

        if (ctx.StudentName is not null)
        {
            sb.AppendLine();
            sb.AppendLine($"Student: {Sanitize(ctx.StudentName)}");
            if (ctx.StudentNativeLanguage is not null)
                sb.AppendLine($"Native language: {Sanitize(ctx.StudentNativeLanguage)}");
            if (ctx.StudentInterests?.Length > 0)
                sb.AppendLine($"Interests: {string.Join(", ", ctx.StudentInterests.Select(Sanitize).Where(s => s.Length > 0))}");
            if (ctx.StudentGoals?.Length > 0)
                sb.AppendLine($"Goals: {string.Join(", ", ctx.StudentGoals.Select(Sanitize).Where(s => s.Length > 0))}");
        }

        return sb.ToString();
    }

    private static string CurriculumUserPrompt(CurriculumContext ctx)
    {
        var language = Sanitize(ctx.Language);
        var sb = new StringBuilder();

        if (ctx.Mode == "exam-prep")
        {
            var exam = Sanitize(ctx.TargetExam);
            var dateStr = ctx.ExamDate.HasValue ? ctx.ExamDate.Value.ToString("yyyy-MM-dd") : "unspecified";
            sb.AppendLine($"Design a {ctx.SessionCount}-session {language} exam preparation course for {exam} (exam date: {dateStr}).");
            sb.AppendLine("Each session should target specific exam sections and skill areas.");
        }
        else
        {
            var level = Sanitize(ctx.TargetCefrLevel ?? "B1");
            sb.AppendLine($"Design a {ctx.SessionCount}-session {language} course for a {level} learner.");
            sb.AppendLine("Distribute reading, writing, listening, and speaking across sessions with a logical grammar progression.");
        }

        sb.AppendLine();
        sb.AppendLine("Return a JSON array with exactly one object per session. Each object must have these fields:");
        sb.AppendLine("- orderIndex (integer, 1-based)");
        sb.AppendLine("- topic (string, concise session topic)");
        sb.AppendLine("- grammarFocus (string or null, main grammar point)");
        sb.AppendLine("- competencies (array of strings, subset of: reading, writing, listening, speaking)");
        sb.AppendLine("- lessonType (string, e.g. Communicative, Grammar-focused, Exam Practice, Mixed)");
        sb.AppendLine();
        sb.AppendLine("Output ONLY the JSON array. No markdown, no explanation.");

        return sb.ToString();
    }
}
