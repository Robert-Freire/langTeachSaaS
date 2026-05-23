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

// This pass affirms CORRECT usage of structures STRICTLY ABOVE the student's CEFR level
// (next-level grammarInScope or higher) when no Pass 2 tag exists for that span.
// Compare with RedaccionLevelFilterPromptBuilder, which converts soften/muybien decisions
// from Pass 2 G-tags into MuyBien for near-ceiling structures.
// The two paths are intentionally non-overlapping: ScopeAffirmer = no Pass 2 tag exists;
// LevelFilter = Pass 2 tag exists and gets reframed. Future edits to one path must not
// silently change the boundary -- update both comments together.
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
    // The tool returns an empty spans array when no above-level structures are found.
    public (ClaudeRequest Request, ClaudeToolDefinition Tool) BuildWithTool(string studentCefr, string studentText, string nextCefr)
    {
        var studentScope = _pedagogy.GetGrammarScope(studentCefr);
        var nextScope = _pedagogy.GetGrammarScope(nextCefr);
        var user = BuildUserPrompt(studentCefr, studentText, studentScope, nextCefr, nextScope);

        _logger.LogDebug(
            "PromptUser | blockType=redaccion-scope-affirmer level={Level} nextLevel={NextLevel} textLength={TextLength}",
            studentCefr, nextCefr, studentText.Length);

        return (new ClaudeRequest(SystemPrompt, user, ClaudeModel.Haiku, MaxTokens: 4096, Temperature: 0), ToolDefinition);
    }

    public static readonly ClaudeToolDefinition ToolDefinition = new(
        Name: "submit_scope_spans",
        Description: "Submit the above-level grammar structures found correctly used in the student's text.",
        InputSchema: new
        {
            type = "object",
            properties = new
            {
                spans = new
                {
                    type = "array",
                    items = new
                    {
                        type = "object",
                        properties = new
                        {
                            startIndex     = new { type = "integer" },
                            endIndex       = new { type = "integer" },
                            spannedText    = new { type = "string" },
                            structureLabel = new { type = "string" },
                            structureLevel = new { type = "string" },
                        },
                        required = new[] { "startIndex", "endIndex", "spannedText", "structureLabel", "structureLevel" },
                    },
                },
            },
            required = new[] { "spans" },
        });

    private const string SystemPrompt = """
You are a Spanish CEFR stretch detector for a writing correction pipeline. Your task is to find grammar structures in a student's text that:
1. Are used CORRECTLY
2. Are at or above the NEXT CEFR level threshold (not just at the student's current level)

You will receive:
- The student's CEFR level and their grammar scope (what they should know)
- The next CEFR level and its grammar scope (the minimum threshold for affirmation)
- The student's text with character offsets (the text is 0-indexed)

RULES:
- Only flag structures used CORRECTLY. Incorrect attempts above level are handled elsewhere.
- If a structure appears multiple times, flag each correct occurrence separately.
- If no above-level structures are found, return an empty array.

DISAMBIGUATION: Before flagging "haya", "hubiera", or "hubiese" as subjuntivo perfecto:
- These forms qualify ONLY when followed by a past participle (compound subjuntivo tense, e.g. "haya terminado", "hubiera podido") OR when clearly in a subordinate clause requiring subjuntivo.
- Standalone "haya" used as the present of "haber" in existential or modal constructions (e.g. "no haya problema", "tal vez haya tiempo") does NOT qualify as a subjuntivo perfecto achievement at B2 or above -- do not flag it.
- Only flag when the construction is unambiguously subjuntivo perfecto or imperfecto.

Call the submit_scope_spans tool with a spans array containing all above-level structures found. Use an empty spans array if none are found.
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

    // Only normalize whitespace: replacing \n/\r with spaces keeps offsets correct (1-to-1 swap)
    // and prevents newlines from breaking the prompt structure. Do NOT replace " < > or other
    // characters: the model reports span indices into the text it sees, so any character mutation
    // would cause RunScopeAffirmerAsync's span validation to incorrectly reject valid spans.
    private static string SanitizeForPrompt(string s) =>
        s.Replace('\n', ' ').Replace('\r', ' ');
}
