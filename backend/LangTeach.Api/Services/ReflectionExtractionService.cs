using System.Globalization;
using System.Text.Json;
using LangTeach.Api.AI;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;

namespace LangTeach.Api.Services;

public class ReflectionExtractionService : IReflectionExtractionService
{
    private readonly IClaudeClient _claude;
    private readonly IPromptService _prompts;
    private readonly IPedagogyConfigService _pedagogy;
    private readonly ILogger<ReflectionExtractionService> _logger;

    public ReflectionExtractionService(
        IClaudeClient claude,
        IPromptService prompts,
        IPedagogyConfigService pedagogy,
        ILogger<ReflectionExtractionService> logger)
    {
        _claude = claude;
        _prompts = prompts;
        _pedagogy = pedagogy;
        _logger = logger;
    }

    public async Task<ExtractedReflectionDto> ExtractAsync(string text, CancellationToken ct = default)
    {
        var request = _prompts.BuildReflectionExtractionPrompt(new ReflectionExtractionContext(DateOnly.FromDateTime(DateTime.UtcNow), text));

        ClaudeResponse response;
        try
        {
            response = await _claude.CompleteAsync(request, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Claude API call failed during reflection extraction");
            return new ExtractedReflectionDto(null, null, null, null, null, null, [], null);
        }

        return ParseResponse(response.Content);
    }

    internal ExtractedReflectionDto ParseResponse(string json)
    {
        try
        {
            var cleaned = ContentJsonHelper.StripFences(json) ?? string.Empty;
            using var doc = JsonDocument.Parse(cleaned);
            var root = doc.RootElement;

            return new ExtractedReflectionDto(
                WhatWasCovered: GetStringOrNull(root, "whatWasCovered"),
                AreasToImprove: GetStringOrNull(root, "areasToImprove"),
                EmotionalSignals: GetStringOrNull(root, "emotionalSignals"),
                HomeworkAssigned: GetStringOrNull(root, "homeworkAssigned"),
                NextLessonIdeas: GetStringOrNull(root, "nextLessonIdeas"),
                SessionDate: GetIsoDateOrNull(root, "sessionDate"),
                SuggestedDifficulties: ParseSuggestedDifficulties(root),
                RawExtractionJson: cleaned
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse reflection extraction JSON (length: {Length})", json?.Length ?? 0);
        _logger.LogDebug("Unparseable Claude response: {Json}", json);
            return new ExtractedReflectionDto(null, null, null, null, null, null, [], null);
        }
    }

    private List<SuggestedDifficultyDto> ParseSuggestedDifficulties(JsonElement root)
    {
        var result = new List<SuggestedDifficultyDto>();

        if (!root.TryGetProperty("suggestedDifficulties", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return result;

        var validCompetencies = _pedagogy.GetValidDifficultyCompetencies();
        var validSeverities = _pedagogy.GetValidDifficultySeverities();

        foreach (var item in arr.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object) continue;

            var description = GetStringOrNull(item, "description")?.Trim();
            var competency = GetStringOrNull(item, "competency")?.Trim();
            var subcategory = GetStringOrNull(item, "subcategory")?.Trim() ?? string.Empty;
            var severity = GetStringOrNull(item, "severity")?.Trim();

            if (description is null || competency is null || severity is null) continue;
            if (!validCompetencies.Contains(competency) || !validSeverities.Contains(severity))
            {
                _logger.LogWarning("Skipping suggested difficulty with invalid fields: Competency={Competency}, Severity={Severity}", competency, severity);
                continue;
            }

            result.Add(new SuggestedDifficultyDto(description, competency, subcategory, severity));
        }

        return result;
    }

    private static string? GetStringOrNull(JsonElement root, string key)
    {
        if (root.TryGetProperty(key, out var prop) &&
            prop.ValueKind == JsonValueKind.String)
        {
            var value = prop.GetString();
            return string.IsNullOrWhiteSpace(value) ? null : value;
        }
        return null;
    }

    private static string? GetIsoDateOrNull(JsonElement root, string key)
    {
        var raw = GetStringOrNull(root, key);
        if (raw is null) return null;

        return DateOnly.TryParseExact(
            raw,
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out var parsed)
            ? parsed.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            : null;
    }
}
