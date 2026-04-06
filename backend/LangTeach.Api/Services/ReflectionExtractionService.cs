using System.Text.Json;
using LangTeach.Api.AI;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public class ReflectionExtractionService : IReflectionExtractionService
{
    private readonly IClaudeClient _claude;
    private readonly ILogger<ReflectionExtractionService> _logger;

    private static readonly HashSet<string> ValidCompetencies =
        new(StringComparer.OrdinalIgnoreCase) { "Grammar", "Vocabulary", "Pronunciation", "Fluency", "Discourse" };

    private static readonly HashSet<string> ValidSeverities =
        new(StringComparer.OrdinalIgnoreCase) { "low", "medium", "high" };

    private const string SystemPrompt = """
        You are a tool that helps language teachers structure their post-class notes.
        Extract structured information from a teacher's free-form reflection text.
        Respond ONLY with a valid JSON object using these exact keys:
        - whatWasCovered: string or null
        - areasToImprove: string or null (student difficulties, mistakes, or struggles)
        - emotionalSignals: string or null (student attitude, mood, motivation, engagement signals)
        - homeworkAssigned: string or null
        - nextLessonIdeas: string or null
        - suggestedDifficulties: array of objects (can be empty [])

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
            SystemPrompt: SystemPrompt,
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
            return new ExtractedReflectionDto(null, null, null, null, null, []);
        }

        return ParseResponse(response.Content);
    }

    internal ExtractedReflectionDto ParseResponse(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json.Trim());
            var root = doc.RootElement;

            return new ExtractedReflectionDto(
                WhatWasCovered: GetStringOrNull(root, "whatWasCovered"),
                AreasToImprove: GetStringOrNull(root, "areasToImprove"),
                EmotionalSignals: GetStringOrNull(root, "emotionalSignals"),
                HomeworkAssigned: GetStringOrNull(root, "homeworkAssigned"),
                NextLessonIdeas: GetStringOrNull(root, "nextLessonIdeas"),
                SuggestedDifficulties: ParseSuggestedDifficulties(root)
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse reflection extraction JSON (length: {Length})", json?.Length ?? 0);
            return new ExtractedReflectionDto(null, null, null, null, null, []);
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

            var description = GetStringOrNull(item, "description");
            var competency = GetStringOrNull(item, "competency");
            var subcategory = GetStringOrNull(item, "subcategory") ?? string.Empty;
            var severity = GetStringOrNull(item, "severity");

            if (description is null || competency is null || severity is null) continue;
            if (!ValidCompetencies.Contains(competency) || !ValidSeverities.Contains(severity))
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
}
