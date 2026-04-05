using System.Text.Json;
using LangTeach.Api.AI;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public class ReflectionExtractionService : IReflectionExtractionService
{
    private readonly IClaudeClient _claude;
    private readonly ILogger<ReflectionExtractionService> _logger;

    private const string SystemPrompt = """
        You are a tool that helps language teachers structure their post-class notes.
        Extract structured information from a teacher's free-form reflection text.
        Respond ONLY with a valid JSON object using these exact keys:
        - whatWasCovered: string or null
        - areasToImprove: string or null (student difficulties, mistakes, or struggles)
        - emotionalSignals: string or null (student attitude, mood, motivation, engagement signals)
        - homeworkAssigned: string or null
        - nextLessonIdeas: string or null

        Use null for any field that cannot be inferred from the text.
        Do not invent information. Keep each value concise (under 200 words).
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
            return new ExtractedReflectionDto(null, null, null, null, null);
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
                NextLessonIdeas: GetStringOrNull(root, "nextLessonIdeas")
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse reflection extraction JSON: {Json}", json);
            return new ExtractedReflectionDto(null, null, null, null, null);
        }
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
