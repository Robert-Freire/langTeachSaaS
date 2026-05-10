using System.Text;
using LangTeach.Api.Services;

namespace LangTeach.Api.AI;

public record LevelFilterTagInput(string Category, string SpannedText, string? Explanation);

public class RedaccionLevelFilterPromptBuilder
{
    private readonly IPedagogyConfigService _pedagogy;
    private readonly ILogger<RedaccionLevelFilterPromptBuilder> _logger;

    public RedaccionLevelFilterPromptBuilder(
        IPedagogyConfigService pedagogy,
        ILogger<RedaccionLevelFilterPromptBuilder> logger)
    {
        _pedagogy = pedagogy;
        _logger = logger;
    }

    // Model: Haiku (classification task, grounded by curriculum JSON grammar scope).
    // Escalate to Sonnet if teacher QA misclassification rate exceeds 20% on borderline G/L/C tags
    // (more than 1 wrong call per 5 reviewed); one-line change: ClaudeModel.Sonnet below.
    public ClaudeRequest Build(string cefr, IReadOnlyList<LevelFilterTagInput> tags, string? assignmentPrompt = null)
    {
        var scope = _pedagogy.GetGrammarScope(cefr);
        var user = BuildUserPrompt(cefr, scope, tags, assignmentPrompt);

        _logger.LogDebug("PromptSystem | blockType=redaccion-level-filter\n{SystemPrompt}", SystemPrompt);
        _logger.LogDebug(
            "PromptUser | blockType=redaccion-level-filter level={Level} tagCount={Count}\n{UserPrompt}",
            cefr, tags.Count, user);

        // Scale MaxTokens with tag count: each decision + optional note is ~60-80 tokens;
        // 2048 is safe for up to ~25 tags with notes; hard cap avoids truncation on dense texts.
        var maxTokens = Math.Max(1024, Math.Min(2048, 512 + tags.Count * 64));
        return new ClaudeRequest(SystemPrompt, user, ClaudeModel.Haiku, MaxTokens: maxTokens, Temperature: 0);
    }

    private const string SystemPrompt = """
You are a CEFR grammar filter for a Spanish writing correction pipeline. You receive a numbered list of error tags detected in a student's text, the student's CEFR level, the grammar scope for that level, and the assignment context. For each tag, classify it as one of:
- keep    -- the error is within the student's level scope; surface it.
- soften  -- the error is above level but the attempt deserves a warm acknowledgement; do not penalise. (include a warm note in Spanish)
- remove  -- the error is above level and should not be surfaced.
- muybien -- the structure is at or near the student's level ceiling, used correctly or nearly correctly, AND appropriate for the register of the assignment; highlight it as praiseworthy. (include a warm note in Spanish)

MANDATORY RULES (never override these):
1. Tags with category "O" (Ortografía: accents, spelling, punctuation) MUST always be "keep".

GUIDANCE:
- Use the grammar in-scope and out-of-scope lists to anchor your decision.
- When a structure is on the out-of-scope list, prefer "soften" if the student attempted it correctly or nearly correctly, "remove" if the attempt is clearly wrong and above level.
- When the out-of-scope list is empty (e.g. C1/C2), keep everything.
- G (Gramática), L (Léxico), C (Cohesión) tags may be softened, removed, or promoted to muybien based on level scope.
- Use "muybien" only when the student demonstrates genuinely strong usage: a structure at or near their level ceiling, used correctly, AND fitting the register of the assignment. Never use "muybien" for structures that are over-formal for the task register (e.g. imperfect subjunctive in a casual letter).

OUTPUT CONTRACT:
Emit raw JSON only. No prose. No markdown fences. The JSON must be an array:
[
  {"index": <int>, "decision": "keep" | "soften" | "remove" | "muybien", "note": "<warm praise in Spanish, only when decision=soften or decision=muybien>"}
]
Every input tag must appear in the output exactly once, identified by its index.
""";

    private static string BuildUserPrompt(string cefr, GrammarScope scope, IReadOnlyList<LevelFilterTagInput> tags, string? assignmentPrompt)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Student CEFR level: {cefr}");

        if (scope.InScope.Length > 0)
            sb.AppendLine($"Grammar in scope for {cefr}: {string.Join(", ", scope.InScope)}");
        else
            sb.AppendLine($"Grammar in scope for {cefr}: (all structures; no restrictions)");

        if (scope.OutOfScope.Length > 0)
            sb.AppendLine($"Grammar out of scope for {cefr}: {string.Join(", ", scope.OutOfScope)}");

        if (!string.IsNullOrWhiteSpace(assignmentPrompt))
            sb.AppendLine($"Assignment context: {SanitizeForPrompt(assignmentPrompt)}");

        sb.AppendLine();
        sb.AppendLine("Tags to classify:");

        for (var i = 0; i < tags.Count; i++)
        {
            var t = tags[i];
            // Sanitize student-controlled text: strip newlines/quotes so they cannot break the prompt
            // structure and mislead the model into treating student content as instructions.
            var span = SanitizeForPrompt(t.SpannedText);
            var expl = string.IsNullOrWhiteSpace(t.Explanation) ? "(none)" : SanitizeForPrompt(t.Explanation);
            sb.AppendLine($"[{i}] Category: {t.Category} | Text: <span>{span}</span> | Explanation: {expl}");
        }

        return sb.ToString().TrimEnd();
    }

    private static string SanitizeForPrompt(string s) =>
        s.Replace('\n', ' ').Replace('\r', ' ').Replace('"', '\'').Replace('<', ' ').Replace('>', ' ');
}
