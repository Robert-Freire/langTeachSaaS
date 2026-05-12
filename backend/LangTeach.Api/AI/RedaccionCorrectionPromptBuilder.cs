using System.Text;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging;

namespace LangTeach.Api.AI;

public record RedaccionCorrectionPromptContext(
    string StudentText,
    string? StudentL1,
    IReadOnlyList<string> StudentDifficulties,
    string? AssignmentPrompt);

public class RedaccionCorrectionPromptBuilder
{
    private readonly IPedagogyConfigService _pedagogy;
    private readonly ILogger<RedaccionCorrectionPromptBuilder> _logger;

    public RedaccionCorrectionPromptBuilder(
        IPedagogyConfigService pedagogy,
        ILogger<RedaccionCorrectionPromptBuilder> logger)
    {
        _pedagogy = pedagogy;
        _logger = logger;
    }

    public ClaudeRequest Build(RedaccionCorrectionPromptContext ctx)
    {
        var system = BuildSystemPrompt(_pedagogy.GetCorrectionCategories());
        var user = BuildUserPrompt(ctx);

        _logger.LogDebug("PromptSystem | blockType=redaccion-correction chars={Chars}", system.Length);
        _logger.LogDebug(
            "PromptUser | blockType=redaccion-correction l1={L1} chars={Chars}",
            ctx.StudentL1 ?? "(none)", user.Length);

        // temperature=0: deterministic offset generation -- spannedText must locate uniquely
        // via indexOf in the student text; sampling variation leads the model to rephrase
        // spannedText, breaking the rescue logic in ValidateAndOrderTags.
        // MaxTokens 16384: accumulated prompt rules (#1210-#1215) make Sonnet more verbose;
        // 150-word texts with many errors can exceed 8192 output tokens (#1219).
        return new ClaudeRequest(system, user, ClaudeModel.Sonnet, MaxTokens: 16384, Temperature: 0);
    }

    private static string BuildSystemPrompt(CorrectionCategoriesFile config)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are an experienced Spanish language teacher (EOI / private tutoring context) marking a student's redacción. You categorize errors using exactly four single-letter categories.");
        sb.AppendLine();
        sb.AppendLine("CATEGORIES (use the exact code letter):");
        sb.AppendLine();

        foreach (var cat in config.Categories)
        {
            sb.Append($"- {cat.Code} ({cat.Name}): {cat.Description}");
            if (cat.SubTypes.Length > 0)
            {
                sb.AppendLine();
                foreach (var sub in cat.SubTypes)
                    sb.AppendLine($"  {sub}");
            }
            else
            {
                sb.AppendLine();
            }
            foreach (var ex in cat.Examples)
                sb.AppendLine($"  Example: \"{ex.Text}\" → {ex.Note} → {ex.Label}.");
        }

        sb.AppendLine();
        sb.AppendLine("CRITICAL RULES:");
        sb.AppendLine();

        foreach (var rule in config.CriticalRules)
        {
            sb.AppendLine($"- {rule.Preamble}");
            foreach (var g in rule.Guidance)
                sb.AppendLine($"  {g}");
            foreach (var ex in rule.Examples)
            {
                sb.AppendLine($"  Example: \"{ex.Text}\" → this is a {ex.Situation}.");
                sb.AppendLine($"  spannedText = \"{ex.SpannedText}\", category {ex.Category}, correctedForm = \"{ex.CorrectedForm}\". {ex.Note}");
            }
        }

        foreach (var rule in config.AntiPatternRules)
            sb.AppendLine($"- {rule}");

        sb.AppendLine();
        sb.AppendLine(OutputContract);

        return sb.ToString().TrimEnd();
    }

    private const string OutputContract = """
OUTPUT CONTRACT:

Emit raw JSON only. Start directly with {. No prose before or after. No markdown fences. The JSON must match exactly:

{
  "schemaVersion": 1,
  "tags": [
    {
      "category": "G" | "C" | "L" | "O",
      "startIndex": <int>,
      "endIndex": <int>,
      "spannedText": "<exact substring of the student text at [startIndex..endIndex]>",
      "contextBefore": "<the substring of the student text immediately before spannedText, up to 20 characters; use empty string if spannedText starts at position 0>",
      "explanation": "<short, in Spanish>",
      "correctedForm": "<the corrected form>"
    }
  ]
}

"explanation" and "correctedForm" are always non-empty for every tag.

OFFSETS (read carefully — accented characters cause silent errors if you count positions):
- startIndex and endIndex are Unicode character offsets into the student text between the markers (0-based, end-exclusive).
- DO NOT derive offsets by counting characters forward from the start of the text. Counting is unreliable near accented characters (é, ó, á, ñ, ü, etc.) because your internal position tracking may not match the host's character indices.
- CORRECT procedure for every tag:
  1. Decide which substring of the student text to mark; that substring is spannedText.
  2. Write the explanation.
  3. Locate spannedText inside the student text using a forward string search (like indexOf / find), starting from position 0.
  4. Set startIndex to the result of that search. Set endIndex = startIndex + length(spannedText).
- spannedText MUST equal the student text at [startIndex, endIndex).
- contextBefore MUST always be emitted: it is the exact characters immediately preceding spannedText in the student text (up to 20 chars, or an empty string if spannedText starts at position 0). It is used server-side to locate the correct occurrence when spannedText appears more than once.
- If spannedText is still ambiguous after contextBefore (i.e. the same contextBefore + spannedText sequence appears more than once), choose a longer or more specific span for spannedText that is unique. Tags that cannot be located will be dropped.
- spannedText MUST be the minimum substring that is itself erroneous: the specific word or
  morpheme to replace, not its surrounding context. For a verb error, span the verb only.
  For a missing accent, span the word only. Never span a surrounding phrase (unless a wider
  span is required for uniqueness per the rule above).
  Example: in "Los libros son interesante", spannedText must be "interesante" (the wrong
  adjective) and correctedForm must be "interesantes", not "Los libros son interesante"
  or any larger span.
- Tags MUST NOT overlap. Sort tags by startIndex.
""";

    private string BuildUserPrompt(RedaccionCorrectionPromptContext ctx)
    {
        var sb = new StringBuilder();

        var l1Block = BuildL1Block(ctx.StudentL1);
        if (!string.IsNullOrEmpty(l1Block))
        {
            sb.AppendLine(l1Block);
            sb.AppendLine();
        }

        if (ctx.StudentDifficulties.Count > 0)
        {
            sb.AppendLine("WEAK POINTS TO WATCH (give extra emphasis if seen):");
            foreach (var d in ctx.StudentDifficulties.Take(3))
            {
                var clean = InputSanitizer.Sanitize(d);
                if (clean.Length > 0)
                    sb.AppendLine($"- {Truncate(clean, 200)}");
            }
            sb.AppendLine();
        }

        if (!string.IsNullOrWhiteSpace(ctx.AssignmentPrompt))
        {
            sb.AppendLine($"ASSIGNMENT CONTEXT: {ctx.AssignmentPrompt}");
            sb.AppendLine();
        }

        // Per-request nonce so the markers cannot collide with anything the student wrote.
        // A user-controlled redacción could in principle contain the literal string
        // "<<<STUDENT_TEXT_VERBATIM>>>"; with a fixed marker that would either truncate the
        // model's view of the text or be parsed as instructions. Re-roll the nonce in the
        // (vanishingly rare) case it appears in the student text.
        var marker = "STUDENT_TEXT_VERBATIM_" + Guid.NewGuid().ToString("N");
        while (ctx.StudentText.Contains(marker, StringComparison.Ordinal))
            marker = "STUDENT_TEXT_VERBATIM_" + Guid.NewGuid().ToString("N");

        sb.AppendLine($"STUDENT TEXT (your tag offsets must reference this text exactly; see OUTPUT CONTRACT; the text appears between the <<<{marker}>>> ... <<</{marker}>>> marker lines below):");
        sb.AppendLine($"<<<{marker}>>>");
        sb.AppendLine(ctx.StudentText);
        sb.AppendLine($"<<</{marker}>>>");

        return sb.ToString().TrimEnd();
    }

    private string BuildL1Block(string? l1)
    {
        if (string.IsNullOrWhiteSpace(l1)) return string.Empty;

        var adj = _pedagogy.GetL1Adjustments(l1);
        var sb = new StringBuilder();
        sb.AppendLine($"L1 INTERFERENCE: the student's native language is {l1}. When you flag a (L) error, prefer explanations that point to the L1 source if applicable.");
        if (adj is not null)
        {
            if (adj.IncreaseEmphasis.Length > 0)
                sb.AppendLine($"L1 hot spots to watch: {string.Join(", ", adj.IncreaseEmphasis)}.");
            if (!string.IsNullOrWhiteSpace(adj.Notes))
                sb.AppendLine(adj.Notes);
        }
        return sb.ToString().TrimEnd();
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max];
}
