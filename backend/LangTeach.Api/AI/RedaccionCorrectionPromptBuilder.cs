using System.Text;
using LangTeach.Api.Services;
using Microsoft.Extensions.Logging;

namespace LangTeach.Api.AI;

public record RedaccionCorrectionPromptContext(
    string StudentText,
    string StudentCefr,
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
        var system = SystemPrompt;
        var user = BuildUserPrompt(ctx);

        _logger.LogDebug("PromptSystem | blockType=redaccion-correction\n{SystemPrompt}", system);
        _logger.LogDebug(
            "PromptUser | blockType=redaccion-correction level={Level} l1={L1}\n{UserPrompt}",
            ctx.StudentCefr, ctx.StudentL1 ?? "(none)", user);

        // temperature=0: the verbatim originalText echo is non-negotiable; default sampling
        // (1.0) leads the model to silently smooth typos and normalize punctuation while
        // copying the student text into originalText, which then fails the strict ordinal
        // guard in RedaccionCorrectionService. Sonnet 4.6 still supports temperature.
        return new ClaudeRequest(system, user, ClaudeModel.Sonnet, MaxTokens: 4096, Temperature: 0);
    }

    private const string SystemPrompt = """
You are an experienced Spanish language teacher (EOI / private tutoring context) marking a student's redacción. You categorize errors using exactly four single-letter categories plus one "muy bien" category.

CATEGORIES (use the exact code letter):

- C (Cohesión): missing connector, missing temporal marker, wrong connector, repetitive structure.
  Example: "Fui al cine. Vi una película." → missing connector → C.
- G (Gramática): verb conjugation, prepositions (selection, not spelling), gender/number agreement, word order, articles.
  Example: "*el problema es muy grande*" → if "el" is wrong gender for the noun, G.
- L (Léxico): wrong vocabulary, literal translations from L1, unnatural usage.
  Example: "*hago una foto*" (calque from English/French) → L.
- O (Ortografía): accents (tildes), misspelled words, punctuation.
  Example: "*esta*" instead of "está" → O. "*ablar*" instead of "hablar" → O.
- MuyBien: a phrase or word that demonstrates genuinely strong usage worth highlighting (idiomatic connector, well-handled subjunctive, precise vocabulary). Use sparingly. spannedText is the highlighted phrase (non-empty).

CRITICAL RULES:

- A misspelling or missing accent is O, NEVER G.
- A wrong preposition is G, NEVER L.
- A literal translation from the student's L1 is L, NEVER G.
- A missing or wrong connector is C, NEVER G.

OUTPUT CONTRACT:

Emit raw JSON only. No prose before or after. No markdown fences. The JSON must match exactly:

{
  "schemaVersion": 1,
  "originalText": "...the student text...",
  "tags": [
    {
      "category": "G" | "C" | "L" | "O" | "MuyBien",
      "startIndex": <int>,
      "endIndex": <int>,
      "spannedText": "<exact substring of originalText[startIndex..endIndex]>",
      "explanation": "<short, in Spanish, calibrated to the student's level>",
      "correctedForm": "<the corrected form>"
    }
  ]
}

OFFSETS:
- startIndex and endIndex are character offsets into originalText (0-based, end-exclusive).
- spannedText MUST equal originalText.Substring(startIndex, endIndex - startIndex).
- Tags MUST NOT overlap. Sort tags by startIndex.

"explanation" and "correctedForm" are non-empty for C/G/L/O tags and null for MuyBien.

Copy the student text byte-for-byte into the originalText field, preserving every typo, missing accent, and punctuation mark exactly as written between the STUDENT_TEXT_VERBATIM_... marker lines in the user prompt. Do not normalize or rewrite. The errors and irregularities are precisely the signal we are here to mark - if you silently "fix" them during the echo, the corresponding tags lose their anchor and the correction is unusable.
""";

    private string BuildUserPrompt(RedaccionCorrectionPromptContext ctx)
    {
        var sb = new StringBuilder();

        sb.AppendLine($"STUDENT LEVEL: {ctx.StudentCefr}");
        sb.AppendLine(LevelCalibrationCue(ctx.StudentCefr));
        sb.AppendLine();

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
            sb.AppendLine($"ASSIGNMENT CONTEXT: {InputSanitizer.Sanitize(ctx.AssignmentPrompt)}");
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

        sb.AppendLine($"STUDENT TEXT (copy byte-for-byte into originalText; see OUTPUT CONTRACT for why; the text appears between the <<<{marker}>>> ... <<</{marker}>>> marker lines below):");
        sb.AppendLine($"<<<{marker}>>>");
        sb.AppendLine(ctx.StudentText);
        sb.AppendLine($"<<</{marker}>>>");

        return sb.ToString().TrimEnd();
    }

    private static string LevelCalibrationCue(string cefr) => cefr switch
    {
        "A1" or "A2" => "Calibration: at A1/A2, prioritize basic agreement (gender/number), core verb forms (ser/estar/haber, present, basic past), high-frequency vocabulary, and high-frequency tildes (está, qué, cómo, sé vs se). Keep explanations short and concrete. Do not correct stylistic subtleties beyond the student's level.",
        "B1" or "B2" => "Calibration: at B1/B2, prioritize cohesion (connectors, temporal markers), register, prepositions, formulaic subjunctive triggers (quiero que, es importante que), and natural usage. Explanations may invoke the rule briefly.",
        "C1" or "C2" => "Calibration: at C1/C2, flag genuine errors at any level, but treat as priority findings only what a native peer would notice: subtle nuance, register mismatch, idiomaticity, and non-formulaic subjunctive (volitional, doubt, concessive in extended contexts). Do not let lower-level features dominate the markup if the student handles them well.",
        _ => "Calibration: treat the student as a generic intermediate learner; emphasize the core categories and avoid stylistic nitpicks.",
    };

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
