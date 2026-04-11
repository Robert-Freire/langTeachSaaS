using System.Text.Json;
using LangTeach.Api.AI;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;

namespace LangTeach.Api.Services;

public class CurriculumValidationService : ICurriculumValidationService
{
    private static readonly JsonSerializerOptions CaseInsensitiveOptions =
        new() { PropertyNameCaseInsensitive = true };

    private readonly IClaudeClient _claude;
    private readonly IPromptService _prompts;
    private readonly ILogger<CurriculumValidationService> _logger;

    public CurriculumValidationService(IClaudeClient claude, IPromptService prompts, ILogger<CurriculumValidationService> logger)
    {
        _claude = claude;
        _prompts = prompts;
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

        var ctx = new CurriculumValidationContext(
            targetLevel,
            allowedGrammar,
            entriesWithGrammar.Select(e => (e.OrderIndex, e.GrammarFocus!)).ToList());

        var request = _prompts.BuildCurriculumValidationPrompt(ctx);

        try
        {
            var response = await _claude.CompleteAsync(request, ct);
            var content = ContentJsonHelper.StripFences(response.Content) ?? string.Empty;

            var warnings = JsonSerializer.Deserialize<List<ValidationWarningDto>>(
                content,
                CaseInsensitiveOptions);

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
