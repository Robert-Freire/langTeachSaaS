using System.Text.Json;
using LangTeach.Api.AI;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public class CurriculumValidationService : ICurriculumValidationService
{
    private readonly IClaudeClient _claude;
    private readonly ILogger<CurriculumValidationService> _logger;

    public CurriculumValidationService(IClaudeClient claude, ILogger<CurriculumValidationService> logger)
    {
        _claude = claude;
        _logger = logger;
    }

    public async Task<List<CurriculumWarning>> ValidateAsync(
        List<CurriculumEntry> entries,
        string targetLevel,
        IReadOnlyList<string> allowedGrammar,
        CancellationToken ct = default)
    {
        var entriesWithGrammar = entries
            .Where(e => !string.IsNullOrWhiteSpace(e.GrammarFocus))
            .ToList();

        if (entriesWithGrammar.Count == 0 || allowedGrammar.Count == 0)
            return [];

        var grammarList = string.Join("\n", allowedGrammar.Select(g => $"- {g}"));
        var entriesList = string.Join("\n", entriesWithGrammar.Select(e => $"Session {e.OrderIndex}: {e.GrammarFocus}"));

        const string system = "You are a CEFR-level grammar expert. Evaluate whether grammar structures in a generated curriculum match the target level.";
        var jsonExample = """[ { "sessionIndex": <number>, "grammarFocus": "<exact string>", "flagReason": "<one sentence>", "suggestedLevel": "<CEFR level or null>" } ]""";
        var user = $"Target level: {targetLevel}\n" +
                   $"Grammar structures expected at this level (or below):\n{grammarList}\n\n" +
                   $"Generated curriculum entries:\n{entriesList}\n\n" +
                   $"Respond ONLY with a raw JSON array (no markdown, no code fences). " +
                   $"For each entry where the grammar focus EXCEEDS the target level, include one object with this shape: {jsonExample}\n" +
                   $"If all entries are level-appropriate, respond with [].";

        var request = new ClaudeRequest(system, user, ClaudeModel.Sonnet, MaxTokens: 1000);

        try
        {
            var response = await _claude.CompleteAsync(request, ct);
            var content = response.Content.Trim();

            if (content.StartsWith("```"))
            {
                var start = content.IndexOf('\n') + 1;
                var end = content.LastIndexOf("```");
                if (end > start)
                    content = content[start..end].Trim();
            }

            var warnings = JsonSerializer.Deserialize<List<ValidationWarningDto>>(
                content,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return warnings?
                .Select(w => new CurriculumWarning(w.SessionIndex, w.GrammarFocus, w.FlagReason, w.SuggestedLevel))
                .ToList() ?? [];
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException)
        {
            _logger.LogWarning(ex, "Failed to parse curriculum validation response; skipping validation for level={Level}.", targetLevel);
            return [];
        }
    }

    private record ValidationWarningDto(
        int SessionIndex,
        string GrammarFocus,
        string FlagReason,
        string? SuggestedLevel
    );
}
