using System.Text;
using System.Text.Json.Serialization;
using LangTeach.Api.Services;

namespace LangTeach.Api.AI;

public record ScopeAffirmerSpan(
    [property: JsonPropertyName("startIndex")] int StartIndex,
    [property: JsonPropertyName("endIndex")] int EndIndex,
    [property: JsonPropertyName("spannedText")] string SpannedText,
    [property: JsonPropertyName("structureLabel")] string StructureLabel,
    [property: JsonPropertyName("structureLevel")] string StructureLevel);

public class RedaccionScopeAffirmerPromptBuilder
{
    private readonly IPedagogyConfigService _pedagogy;
    private readonly ILogger<RedaccionScopeAffirmerPromptBuilder> _logger;

    // Maps each CEFR level to the next level whose grammarInScope defines the minimum threshold.
    // C2 is absent: callers must skip ScopeAffirmer for C2 students.
    public static readonly IReadOnlyDictionary<string, string> NextLevel =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["A1"] = "A2",
            ["A2"] = "B1",
            ["B1"] = "B2",
            ["B2"] = "C1",
            ["C1"] = "C2",
        };

    public RedaccionScopeAffirmerPromptBuilder(
        IPedagogyConfigService pedagogy,
        ILogger<RedaccionScopeAffirmerPromptBuilder> logger)
    {
        _pedagogy = pedagogy;
        _logger = logger;
    }

    // Model: Haiku (enrichment pass; low stakes, grounded by curriculum JSON).
    // The prompt returns an empty array when no above-level structures are found.
    public ClaudeRequest Build(string studentCefr, string studentText, string nextCefr)
    {
        var studentScope = _pedagogy.GetGrammarScope(studentCefr);
        var nextScope = _pedagogy.GetGrammarScope(nextCefr);
        var user = BuildUserPrompt(studentCefr, studentText, studentScope, nextCefr, nextScope);

        _logger.LogDebug(
            "PromptUser | blockType=redaccion-scope-affirmer level={Level} nextLevel={NextLevel}\n{UserPrompt}",
            studentCefr, nextCefr, user);

        return new ClaudeRequest(SystemPrompt, user, ClaudeModel.Haiku, MaxTokens: 1024, Temperature: 0);
    }

    private const string SystemPrompt = """
You are a Spanish CEFR stretch detector for a writing correction pipeline. Your task is to find grammar structures in a student's text that:
1. Are used CORRECTLY
2. Are at or above the NEXT CEFR level threshold (not just at the student's current level)

You will receive:
- The student's CEFR level and their grammar scope (what they should know)
- The next CEFR level and its grammar scope (the minimum threshold for affirmation)
- The student's text with character offsets (the text is 0-indexed)

RULES:
- Only flag structures at or above the NEXT CEFR level threshold (next-level grammarInScope or higher).
- Only flag structures used CORRECTLY. Incorrect attempts above level are handled elsewhere.
- If a structure appears multiple times, flag each correct occurrence separately.
- If no above-level structures are found, return an empty array.

OUTPUT CONTRACT:
Emit raw JSON only. No prose. No markdown fences. The JSON must be an array:
[
  {
    "startIndex": <int>,
    "endIndex": <int>,
    "spannedText": "<exact substring from text>",
    "structureLabel": "<short label, e.g. 'presente de subjuntivo'>",
    "structureLevel": "<CEFR level, e.g. 'B1'>"
  }
]
startIndex is inclusive; endIndex is exclusive.
""";

    private static string BuildUserPrompt(
        string studentCefr,
        string studentText,
        GrammarScope studentScope,
        string nextCefr,
        GrammarScope nextScope)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Student CEFR level: {studentCefr}");

        if (studentScope.InScope.Length > 0)
            sb.AppendLine($"Grammar in scope for {studentCefr} (student's current level): {string.Join(", ", studentScope.InScope)}");
        else
            sb.AppendLine($"Grammar in scope for {studentCefr}: (all structures)");

        sb.AppendLine();
        sb.AppendLine($"Next CEFR level: {nextCefr}");

        if (nextScope.InScope.Length > 0)
            sb.AppendLine($"Grammar in scope for {nextCefr} (minimum threshold for affirmation): {string.Join(", ", nextScope.InScope)}");
        else
            sb.AppendLine($"Grammar in scope for {nextCefr}: (all structures)");

        sb.AppendLine();
        sb.AppendLine("Student text (0-indexed characters):");
        sb.AppendLine(SanitizeForPrompt(studentText));

        return sb.ToString().TrimEnd();
    }

    // All replacements are single-char-to-single-char so string length (and thus character offsets)
    // is preserved. The model receives sanitized text but reports spans by position, which remain
    // valid against the original text after validation in RunScopeAffirmerAsync.
    private static string SanitizeForPrompt(string s) =>
        s.Replace('\n', ' ').Replace('\r', ' ').Replace('"', '\'').Replace('<', ' ').Replace('>', ' ');
}
