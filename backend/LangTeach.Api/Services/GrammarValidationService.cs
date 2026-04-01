using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using LangTeach.Api.AI;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public class GrammarValidationService : IGrammarValidationService
{
    private readonly ILogger<GrammarValidationService> _log;
    private readonly (GrammarValidationRule Rule, Regex CompiledRegex)[] _rules;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public GrammarValidationService(ILogger<GrammarValidationService> logger)
    {
        _log = logger;

        var assembly = Assembly.GetExecutingAssembly();
        using var stream = assembly.GetManifestResourceStream("LangTeach.Api.Pedagogy.grammar-validation-rules.json")
            ?? throw new InvalidOperationException("GrammarValidationService: could not open grammar-validation-rules.json embedded resource");

        var file = JsonSerializer.Deserialize<GrammarValidationRulesFile>(stream, JsonOpts)
            ?? throw new InvalidOperationException("GrammarValidationService: grammar-validation-rules.json deserialized to null");

        var compiled = new List<(GrammarValidationRule, Regex)>();
        for (var i = 0; i < file.Rules.Length; i++)
        {
            var rule = file.Rules[i];

            // Startup validation: fail fast on missing required fields
            if (string.IsNullOrWhiteSpace(rule.Id))
                throw new InvalidOperationException($"GrammarValidationService: rule[{i}] has missing or empty 'id'");
            if (string.IsNullOrWhiteSpace(rule.TargetLanguage))
                throw new InvalidOperationException($"GrammarValidationService: rule '{rule.Id}' has missing or empty 'targetLanguage'");
            if (string.IsNullOrWhiteSpace(rule.Pattern))
                throw new InvalidOperationException($"GrammarValidationService: rule '{rule.Id}' has missing or empty 'pattern'");
            if (string.IsNullOrWhiteSpace(rule.Correction))
                throw new InvalidOperationException($"GrammarValidationService: rule '{rule.Id}' has missing or empty 'correction'");
            if (string.IsNullOrWhiteSpace(rule.Severity))
                throw new InvalidOperationException($"GrammarValidationService: rule '{rule.Id}' has missing or empty 'severity'");

            try
            {
                var regex = new Regex(rule.Pattern, RegexOptions.IgnoreCase | RegexOptions.Compiled, TimeSpan.FromMilliseconds(100));
                compiled.Add((rule, regex));
            }
            catch (ArgumentException ex)
            {
                throw new InvalidOperationException($"GrammarValidationService: rule '{rule.Id}' has invalid regex pattern '{rule.Pattern}': {ex.Message}", ex);
            }
        }

        _rules = compiled.ToArray();
        _log.LogInformation("GrammarValidationService: loaded {Count} grammar validation rules", _rules.Length);
    }

    public GrammarWarning[] Validate(string content, string targetLanguage, string? grammarFocus)
    {
        var normalizedLang = targetLanguage.Trim().ToLowerInvariant();
        var results = new List<GrammarWarning>();

        foreach (var (rule, regex) in _rules)
        {
            if (!string.Equals(rule.TargetLanguage, normalizedLang, StringComparison.OrdinalIgnoreCase))
                continue;

            MatchCollection matches;
            try
            {
                matches = regex.Matches(content);
            }
            catch (RegexMatchTimeoutException)
            {
                _log.LogWarning("GrammarValidationService: regex timeout for rule '{RuleId}'", rule.Id);
                continue;
            }

            if (matches.Count == 0)
                continue;

            var severity = ElevateSeverity(rule.Severity, rule.ContextRelevance, grammarFocus);
            // Report one warning per rule; matchedText shows the first occurrence found
            results.Add(new GrammarWarning(rule.Id, rule.Correction, severity, matches[0].Value));
        }

        return results.ToArray();
    }

    private static string ElevateSeverity(string baseSeverity, GrammarValidationContextRelevance? contextRelevance, string? grammarFocus)
    {
        if (contextRelevance is null || grammarFocus is null)
            return baseSeverity;

        var grammarFocusLower = grammarFocus.ToLowerInvariant();
        var isRelevant = contextRelevance.GrammarFocusPatterns.Any(
            p => grammarFocusLower.Contains(p.ToLowerInvariant()));

        if (!isRelevant)
            return baseSeverity;

        return baseSeverity.ToLowerInvariant() switch
        {
            "low" => "medium",
            "medium" => "high",
            _ => baseSeverity, // "high" stays "high"
        };
    }
}
