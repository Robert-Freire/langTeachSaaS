using System.Globalization;
using System.Text.Json;
using LangTeach.Api.AI;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;

namespace LangTeach.Api.Services;

public class ReflectionExtractionService : IReflectionExtractionService
{
    private readonly IClaudeClient _claude;
    private readonly ILogger<ReflectionExtractionService> _logger;

    internal static string BuildSystemPrompt(DateOnly today) => $"""
        You are a tool that helps language teachers structure their post-class notes.
        Extract structured information from a teacher's free-form reflection text.

        IMPORTANT: Preserve the original language of the teacher's text. Do not translate any field value into another language.

        Today's date is {today:yyyy-MM-dd}.

        Respond ONLY with a valid JSON object using these exact keys:
        - whatWasCovered: string or null
        - areasToImprove: string or null (narrative summary of student difficulties and struggles — prose, not a list)
        - emotionalSignals: string or null (student attitude, mood, motivation, engagement signals)
        - homeworkAssigned: string or null
        - nextLessonIdeas: string or null
        - sessionDate: string or null — ISO 8601 date (YYYY-MM-DD) resolved from today's date and any date reference the teacher mentions ("hoy"/"today" = today, "ayer"/"yesterday" = yesterday, "el martes pasado" = last Tuesday, etc.); null if no date is mentioned
        - suggestedDifficulties: array of objects (can be empty []) — structured breakdown of the same difficulties mentioned in areasToImprove

        For suggestedDifficulties, each object must have:
        - description: full sentence describing the difficulty, extracted verbatim from the teacher's language
        - competency: one of Grammar, Vocabulary, Pronunciation, Fluency, Discourse
        - subcategory: specific item (e.g. "ser/estar", "subjunctive", "past tense"), free text
        - severity: low | medium | high (infer from language: "mucho"/"siempre"/"constantemente" -> high, "a veces"/"sometimes" -> medium, "un poco"/"slightly" -> low; default medium)

        Only include difficulties explicitly mentioned. Do not invent. Use null for scalar fields that cannot be inferred.
        Keep each value concise (under 200 words).
        Respond with JSON only, no markdown, no explanation.
        """;

    public ReflectionExtractionService(IClaudeClient claude, ILogger<ReflectionExtractionService> logger)
    {
        _claude = claude;
        _logger = logger;
    }

    public async Task<ExtractedReflectionDto> ExtractAsync(string text, CancellationToken ct = default)
    {
        var request = new ClaudeRequest(
            SystemPrompt: BuildSystemPrompt(DateOnly.FromDateTime(DateTime.UtcNow)),
            UserPrompt: text,
            Model: ClaudeModel.Haiku,
            MaxTokens: 1024
        );

        ClaudeResponse response;
        try
        {
            response = await _claude.CompleteAsync(request, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Claude API call failed during reflection extraction");
            return new ExtractedReflectionDto(null, null, null, null, null, null, []);
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
                SuggestedDifficulties: ParseSuggestedDifficulties(root)
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse reflection extraction JSON (length: {Length})", json?.Length ?? 0);
        _logger.LogDebug("Unparseable Claude response: {Json}", json);
            return new ExtractedReflectionDto(null, null, null, null, null, null, []);
        }
    }

    private List<SuggestedDifficultyDto> ParseSuggestedDifficulties(JsonElement root)
    {
        var result = new List<SuggestedDifficultyDto>();

        if (!root.TryGetProperty("suggestedDifficulties", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return result;

        foreach (var item in arr.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object) continue;

            var description = GetStringOrNull(item, "description")?.Trim();
            var competency = GetStringOrNull(item, "competency")?.Trim();
            var subcategory = GetStringOrNull(item, "subcategory")?.Trim() ?? string.Empty;
            var severity = GetStringOrNull(item, "severity")?.Trim();

            if (description is null || competency is null || severity is null) continue;
            if (!DifficultyConstants.ValidCompetencies.Contains(competency) || !DifficultyConstants.ValidSeverities.Contains(severity))
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
