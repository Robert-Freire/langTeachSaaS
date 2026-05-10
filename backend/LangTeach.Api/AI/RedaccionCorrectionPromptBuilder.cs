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
        var system = SystemPrompt;
        var user = BuildUserPrompt(ctx);

        _logger.LogDebug("PromptSystem | blockType=redaccion-correction\n{SystemPrompt}", system);
        _logger.LogDebug(
            "PromptUser | blockType=redaccion-correction l1={L1}\n{UserPrompt}",
            ctx.StudentL1 ?? "(none)", user);

        // temperature=0: deterministic offset generation -- spannedText must locate uniquely
        // via indexOf in the student text; sampling variation leads the model to rephrase
        // spannedText, breaking the rescue logic in ValidateAndOrderTags.
        return new ClaudeRequest(system, user, ClaudeModel.Sonnet, MaxTokens: 8192, Temperature: 0);
    }

    private const string SystemPrompt = """
You are an experienced Spanish language teacher (EOI / private tutoring context) marking a student's redacción. You categorize errors using exactly four single-letter categories.

CATEGORIES (use the exact code letter):

- C (Cohesión): missing connector, missing temporal marker, wrong connector, repetitive structure.
  Example: "Fui al cine. Vi una película." → missing connector → C.
- G (Gramática): verb conjugation, prepositions (selection, not spelling), gender/number agreement, word order, articles.
  Example: "*el problema es muy grande*" → if "el" is wrong gender for the noun, G.
- L (Léxico): wrong vocabulary, literal translations from L1, unnatural usage, register mismatch (a structure or expression grammatically correct but inappropriate for the formality level of the task).
  Example: "*hago una foto*" (calque from English/French) → L. "Si te invitaran" in a casual informal letter → L (over-formal for the register).
  register mismatch: flag when the structure would be penalised in a written EOI task for that register (e.g. imperfect subjunctive in an A2 informal letter, highly formal fixed expressions in a casual email). Do not flag slightly elevated vocabulary or register-neutral structures.
- O (Ortografía): accents (tildes), misspelled words, punctuation.
  Example: "*musica*" instead of "música" → O. "*ablar*" instead of "hablar" → O.

CRITICAL RULES:

- ser/estar (never omit): a verb that violates the ser/estar distinction is always G at every level.
  Use ser for general characteristics, classifications, and cultural norms
  (es común, es importante, es normal, es difícil).
  Use estar for temporary states and ongoing conditions.
  If the correct form is a different word (e.g. "esta" corrected to "es"): tag G; spannedText is the verb only; correctedForm is the correct verb.
  If only a tilde is missing (e.g. "esta" corrected to "está"): tag O; spannedText is the word only; correctedForm is the accented form.
- A misspelling or missing accent is O, NEVER G.
- A wrong preposition is G, NEVER L.
- A literal translation from the student's L1 is L, NEVER G.
- A missing or wrong connector is C, NEVER G.

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
- If spannedText would appear more than once in the student text, choose a longer or more specific span that is unique. Tags whose spannedText cannot be located unambiguously will be dropped.
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
