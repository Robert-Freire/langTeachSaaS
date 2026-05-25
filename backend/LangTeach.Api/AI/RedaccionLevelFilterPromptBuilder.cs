using System.Text;
using LangTeach.Api.Services;
using Microsoft.Extensions.Options;

namespace LangTeach.Api.AI;

public record LevelFilterTagInput(string Category, string SpannedText, string? Explanation, bool IsSerEstar = false);

// This pass converts Pass 2 G-tag soften/muybien decisions into MuyBien for structures at
// or near the student's level ceiling.
// Compare with RedaccionScopeAffirmerPromptBuilder, which affirms CORRECT usage of
// structures STRICTLY ABOVE the student's level when no Pass 2 tag exists for that span.
// The two paths are intentionally non-overlapping: LevelFilter = Pass 2 tag exists and gets
// reframed; ScopeAffirmer = no Pass 2 tag exists. Future edits to one path must not silently
// change the boundary -- update both comments together.
public class RedaccionLevelFilterPromptBuilder
{
    private readonly IPedagogyConfigService _pedagogy;
    private readonly ILogger<RedaccionLevelFilterPromptBuilder> _logger;
    private readonly PassConfig _filterConfig;

    public RedaccionLevelFilterPromptBuilder(
        IPedagogyConfigService pedagogy,
        ILogger<RedaccionLevelFilterPromptBuilder> logger,
        IOptions<CorrectionPassOptions>? options = null)
    {
        _pedagogy = pedagogy;
        _logger = logger;
        _filterConfig = options?.Value.Filter ?? new PassConfig { Model = "haiku", MaxTokens = 2048 };
    }

    // Model: Haiku (classification task, grounded by curriculum JSON grammar scope).
    // Escalate to Sonnet via CorrectionPasses:Filter:Model in appsettings if teacher QA
    // misclassification rate exceeds 20% on borderline G/L/C tags.
    public (ClaudeRequest Request, ClaudeToolDefinition Tool) BuildWithTool(string cefr, IReadOnlyList<LevelFilterTagInput> tags, string? assignmentPrompt = null)
    {
        var scope = _pedagogy.GetGrammarScope(cefr);
        var calibrationCue = _pedagogy.GetCorrectionCalibrationCue(cefr);
        var user = BuildUserPrompt(cefr, scope, tags, assignmentPrompt, calibrationCue);

        _logger.LogDebug("PromptSystem | blockType=redaccion-level-filter\n{SystemPrompt}", SystemPrompt);
        _logger.LogDebug(
            "PromptUser | blockType=redaccion-level-filter level={Level} tagCount={Count}\n{UserPrompt}",
            cefr, tags.Count, user);

        // Scale MaxTokens with tag count: each decision is ~30-40 tokens;
        // 2048 is safe for up to ~50 tags; hard cap avoids truncation on dense texts.
        var maxTokens = Math.Max(1024, Math.Min(_filterConfig.MaxTokens, 512 + tags.Count * 64));
        var model = RedaccionCorrectionPromptBuilder.ParseModel(_filterConfig.Model);
        return (new ClaudeRequest(SystemPrompt, user, model, MaxTokens: maxTokens, Temperature: _filterConfig.Temperature), ToolDefinition);
    }

    public static readonly ClaudeToolDefinition ToolDefinition = new(
        Name: "submit_filter_decisions",
        Description: "Submit the classification decision for every input tag.",
        InputSchema: new
        {
            type = "object",
            properties = new
            {
                decisions = new
                {
                    type = "array",
                    items = new
                    {
                        type = "object",
                        properties = new
                        {
                            index    = new { type = "integer" },
                            decision = new { type = "string", @enum = new[] { "keep", "soften", "remove", "muybien" } },
                        },
                        required = new[] { "index", "decision" },
                    },
                },
            },
            required = new[] { "decisions" },
        });

    private const string SystemPrompt = """
You are a CEFR grammar filter for a Spanish writing correction pipeline. You receive a numbered list of error tags detected in a student's text, the student's CEFR level, the grammar scope for that level, and the assignment context. For each tag, classify it as one of:
- keep    -- the error is within the student's level scope; surface it.
- soften  -- the error is above level but the attempt deserves a warm acknowledgement; do not penalise.
- remove  -- the error is above level and should not be surfaced.
- muybien -- the structure is at or near the student's level ceiling, used correctly or nearly correctly, AND appropriate for the register of the assignment; highlight it as praiseworthy.

MANDATORY RULES:
1. Tags with category "O" (Ortografía: accents, spelling, punctuation) MUST always be "keep".

GUIDANCE:
- Use the grammar in-scope and out-of-scope lists to anchor your decision. Use the calibration cue in the request to anchor keep/soften/remove decisions.
- When a structure is on the out-of-scope list, use "soften" if the student attempted it with intentional effort (even if imperfect), "remove" if the attempt is clearly wrong and above level.
- Use "muybien" only when the student demonstrates genuinely strong usage: a structure at or near their level ceiling, used correctly, AND fitting the register of the assignment.
- When the out-of-scope list is empty (e.g. C1/C2), keep everything or promote to muybien; softening and removal are rarely appropriate at this level.

Call the submit_filter_decisions tool with a decisions array. Every input tag must appear in the output exactly once, identified by its index.
""";

    private static string BuildUserPrompt(string cefr, GrammarScope scope, IReadOnlyList<LevelFilterTagInput> tags, string? assignmentPrompt, string? calibrationCue = null)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Student CEFR level: {cefr}");

        if (scope.InScope.Length > 0)
            sb.AppendLine($"Grammar in scope for {cefr}: {string.Join(", ", scope.InScope)}");
        else
            sb.AppendLine($"Grammar in scope for {cefr}: (all structures; no restrictions)");

        if (scope.OutOfScope.Length > 0)
            sb.AppendLine($"Grammar out of scope for {cefr}: {string.Join(", ", scope.OutOfScope)}");

        if (!string.IsNullOrWhiteSpace(calibrationCue))
        {
            sb.AppendLine();
            sb.AppendLine($"Level calibration for {cefr}: {calibrationCue}");
        }

        if (!string.IsNullOrWhiteSpace(assignmentPrompt))
            sb.AppendLine($"Assignment context: {assignmentPrompt}");

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
