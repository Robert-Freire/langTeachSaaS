using System.Text.RegularExpressions;

namespace LangTeach.Api.AI;

public class SpanishGrammarValidationService : ISpanishGrammarValidationService
{
    private record ErrorPattern(
        Regex Pattern,
        string MessageTemplate,
        string[] TopicKeywords);

    private static readonly IReadOnlyList<ErrorPattern> Patterns = BuildPatterns();

    private static IReadOnlyList<ErrorPattern> BuildPatterns()
    {
        const RegexOptions Opts = RegexOptions.IgnoreCase | RegexOptions.Compiled;

        return
        [
            // --- Group 1: Ser/estar confusions ---
            new(
                new Regex(@"\beres de acuerdo\b", Opts),
                "Ser/estar error: 'eres de acuerdo' — should be 'estás de acuerdo' (estar, not ser)",
                ["ser", "estar"]),

            new(
                new Regex(@"\bera deprimid[ao]\b", Opts),
                "Ser/estar error: 'era deprimida/o' — modern Spanish prefers 'estaba deprimida/o' for temporary states",
                ["ser", "estar"]),

            new(
                new Regex(@"\b(soy|eres|es|somos|sois|son) (bien|mal|cansad[ao]|content[ao]|enferm[ao]|triste|ocupad[ao])\b", Opts),
                "Ser/estar error: temporary states and conditions use 'estar', not 'ser'",
                ["ser", "estar"]),

            new(
                new Regex(@"\bera (bien|mal|cansad[ao]|content[ao]|enferm[ao]|triste)\b", Opts),
                "Ser/estar error: 'era [state]' — temporary states use 'estaba', not 'era'",
                ["ser", "estar"]),

            new(
                new Regex(@"\b(son|están) casad[ao]s? con ser\b", Opts),
                "Ser/estar error: marital states use 'estar casado', not 'ser casado'",
                ["ser", "estar"]),

            // --- Group 2: Indicative after WEIRDO triggers (should be subjunctive) ---
            new(
                new Regex(@"\b(espero|quiero|necesito|deseo|ojalá|dudo|temo|sugiero|recomiendo) que (tiene|es|está|puede|hace|va|viene|sabe|habla|vive)\b", Opts),
                "Possible subjunctive error: after wish/doubt/emotion verbs + 'que', the subjunctive is required",
                ["subjunctive", "subjuntivo", "mood", "modo verbal"]),

            new(
                new Regex(@"\b(es importante|es necesario|es posible|es probable|es bueno|es malo|es mejor|es urgente) que (tiene|es|está|puede|hace|va|viene|sabe)\b", Opts),
                "Possible subjunctive error: after impersonal expressions + 'que', the subjunctive is required",
                ["subjunctive", "subjuntivo", "mood"]),

            // --- Group 3: Gender agreement (high-confidence nouns) ---
            new(
                new Regex(@"\bla (problema|mapa|día|tema|drama|poema|sistema|programa|idioma|clima)\b", Opts),
                "Gender error: 'la [word]' — these nouns ending in -a are masculine, use 'el'",
                ["gender", "género", "agreement", "concordancia", "articles"]),

            new(
                new Regex(@"\bel (mano|gente|clase|ciudad|noche|tarde|mañana|leche|flor|sal|paz|vez|voz|luz)\b", Opts),
                "Gender error: 'el [word]' — this noun is feminine, use 'la'",
                ["gender", "género", "agreement", "concordancia", "articles"]),

            // --- Group 4: Por/para misuse ---
            new(
                new Regex(@"\bpor (el propósito|la intención|la meta|el objetivo) de\b", Opts),
                "Por/para error: purpose and goals use 'para', not 'por'",
                ["por", "para", "prepositions", "preposiciones"]),

            new(
                new Regex(@"\bpara (la razón|el motivo|la causa) de\b", Opts),
                "Por/para error: cause and reason use 'por', not 'para'",
                ["por", "para", "prepositions", "preposiciones"]),

            new(
                new Regex(@"\bgracias para\b", Opts),
                "Por/para error: 'gracias por' (not 'gracias para') — gratitude uses 'por'",
                ["por", "para", "prepositions"]),

            // --- Group 5: Common false cognates ---
            new(
                new Regex(@"\beventualmente\b", Opts),
                "False cognate note: 'eventualmente' means 'possibly/at some point', not 'eventually' (= 'finalmente' or 'al final')",
                ["vocabulary", "vocabulary", "false cognates", "falsos amigos"]),

            new(
                new Regex(@"\bactualmente (significa|quiere decir|it means|means)\b", Opts),
                "False cognate note: 'actualmente' means 'currently/nowadays', not 'actually' (= 'en realidad' or 'de hecho')",
                ["vocabulary", "false cognates", "falsos amigos"]),

            new(
                new Regex(@"\breali[zs]\w*\s+que\b", Opts),
                "False cognate note: 'realizar' means 'to carry out/achieve'. To realize (become aware) = 'darse cuenta de'",
                ["vocabulary", "false cognates", "falsos amigos"]),
        ];
    }

    public IReadOnlyList<string> Validate(string content, string grammarTopic)
    {
        if (string.IsNullOrWhiteSpace(content))
            return [];

        var warnings = new List<string>();
        foreach (var pattern in Patterns)
        {
            if (!pattern.Pattern.IsMatch(content))
                continue;

            var msg = pattern.MessageTemplate;
            if (IsTopicRelevant(grammarTopic, pattern.TopicKeywords))
                msg += " (critical — this is the grammar focus of this lesson)";

            warnings.Add(msg);
        }

        return warnings;
    }

    private static bool IsTopicRelevant(string grammarTopic, string[] keywords)
    {
        if (string.IsNullOrWhiteSpace(grammarTopic))
            return false;

        foreach (var kw in keywords)
        {
            if (grammarTopic.Contains(kw, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }
}
