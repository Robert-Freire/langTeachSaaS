using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
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

    public async Task<ExtractedReflectionDto> ExtractAsync(string text, IReadOnlyList<string>? knownDifficulties = null, CancellationToken ct = default)
    {
        var request = _prompts.BuildReflectionExtractionPrompt(new ReflectionExtractionContext(DateOnly.FromDateTime(DateTime.UtcNow), text, knownDifficulties));

        ClaudeResponse response;
        try
        {
            response = await _claude.CompleteAsync(request, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Claude API call failed during reflection extraction");
            return new ExtractedReflectionDto(
                WhatWasCovered: null, AreasToImprove: null, EmotionalSignals: null,
                HomeworkAssigned: null, NextLessonIdeas: null, SessionDate: null,
                SuggestedDifficulties: [], RawExtractionJson: null, SessionTitle: null,
                TopicTags: [], PreviousHomeworkStatus: null, TeachingTodos: [],
                TeacherFollowups: [], LevelReassessment: null, DurationMinutes: null,
                IsCancelled: null, DifficultiesWorkedOn: [], SessionStartTime: null);
        }

        var dto = ParseResponse(response.Content);

        if (NeedsWhatWasCoveredFallback(dto))
        {
            var synthesised = await SynthesiseWhatWasCoveredAsync(text, dto, ct);
            if (!string.IsNullOrWhiteSpace(synthesised))
            {
                dto = dto with { WhatWasCovered = new ExtractedTextFieldDto(synthesised, ExtractionMode.Replace) };
            }
        }

        return dto;
    }

    internal static bool NeedsWhatWasCoveredFallback(ExtractedReflectionDto dto)
    {
        if (dto.IsCancelled == true) return false;

        var hasTopics = dto.TopicTags.Count > 0;
        var hasAreas = dto.AreasToImprove is { Mode: not ExtractionMode.Skip } areas
            && !string.IsNullOrWhiteSpace(areas.Value);
        if (!hasTopics && !hasAreas) return false;

        var current = dto.WhatWasCovered;
        return current is null
            || current.Mode == ExtractionMode.Skip
            || string.IsNullOrWhiteSpace(current.Value);
    }

    private async Task<string?> SynthesiseWhatWasCoveredAsync(string originalText, ExtractedReflectionDto dto, CancellationToken ct)
    {
        var areas = dto.AreasToImprove is { Mode: not ExtractionMode.Skip } a ? a.Value : null;
        var ctx = new WhatWasCoveredFallbackContext(originalText, dto.TopicTags, areas);

        _logger.LogInformation(
            "whatWasCovered fallback synthesis triggered (topicTags={TopicCount}, hasAreas={HasAreas})",
            dto.TopicTags.Count, areas is not null);

        try
        {
            var resp = await _claude.CompleteAsync(_prompts.BuildWhatWasCoveredFallbackPrompt(ctx), ct);
            var sentence = resp.Content?.Trim().Trim('"').Trim();
            if (!string.IsNullOrWhiteSpace(sentence)) return sentence;
            _logger.LogInformation("Fallback whatWasCovered synthesis returned empty content; using deterministic join");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Fallback whatWasCovered synthesis call failed; using deterministic join");
        }

        return DeterministicWhatWasCoveredFromTopics(dto.TopicTags);
    }

    internal static string? DeterministicWhatWasCoveredFromTopics(IReadOnlyList<TopicTagDto> tags)
    {
        if (tags.Count == 0) return null;
        var joined = string.Join(", ", tags.Select(t => t.Tag));
        return $"Trabajamos: {joined}.";
    }

    internal ExtractedReflectionDto ParseResponse(string json)
    {
        try
        {
            var cleaned = ContentJsonHelper.StripFences(json) ?? string.Empty;
            using var doc = JsonDocument.Parse(cleaned);
            var root = doc.RootElement;

            return new ExtractedReflectionDto(
                WhatWasCovered: ParseTextFieldOrNull(root, "whatWasCovered"),
                AreasToImprove: ParseTextFieldOrNull(root, "areasToImprove"),
                EmotionalSignals: GetStringOrNull(root, "emotionalSignals"),
                HomeworkAssigned: ParseTextFieldOrNull(root, "homeworkAssigned"),
                NextLessonIdeas: ParseTextFieldOrNull(root, "nextLessonIdeas"),
                SessionDate: GetIsoDateOrNull(root, "sessionDate"),
                SuggestedDifficulties: ParseSuggestedDifficulties(root),
                RawExtractionJson: cleaned,
                SessionTitle: GetStringOrNull(root, "sessionTitle"),
                TopicTags: ParseTopicTags(root),
                PreviousHomeworkStatus: ParseHomeworkStatus(root),
                TeachingTodos: ParseStringArray(root, "teachingTodos"),
                TeacherFollowups: ParseStringArray(root, "teacherFollowups"),
                LevelReassessment: ParseCefrLevel(root, "levelReassessment"),
                DurationMinutes: GetIntOrNull(root, "durationMinutes"),
                IsCancelled: GetBoolOrNull(root, "isCancelled"),
                DifficultiesWorkedOn: ParseStringArray(root, "difficultiesWorkedOn"),
                SessionStartTime: GetHhMmOrNull(root, "sessionStartTime")
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse reflection extraction JSON (length: {Length})", json?.Length ?? 0);
            _logger.LogDebug("Unparseable Claude response: {Preview}...", json is null ? null : json[..Math.Min(200, json.Length)]);
            return new ExtractedReflectionDto(
                WhatWasCovered: null, AreasToImprove: null, EmotionalSignals: null,
                HomeworkAssigned: null, NextLessonIdeas: null, SessionDate: null,
                SuggestedDifficulties: [], RawExtractionJson: null, SessionTitle: null,
                TopicTags: [], PreviousHomeworkStatus: null, TeachingTodos: [],
                TeacherFollowups: [], LevelReassessment: null, DurationMinutes: null,
                IsCancelled: null, DifficultiesWorkedOn: [], SessionStartTime: null);
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

    private ExtractedTextFieldDto? ParseTextFieldOrNull(JsonElement root, string key)
    {
        if (!root.TryGetProperty(key, out var prop)) return null;
        if (prop.ValueKind == JsonValueKind.Null) return null;
        if (prop.ValueKind == JsonValueKind.Object)
        {
            var value = GetStringOrNull(prop, "value");
            var modeStr = GetStringOrNull(prop, "mode") ?? "skip";
            if (!Enum.TryParse<ExtractionMode>(modeStr, ignoreCase: true, out var mode))
            {
                _logger.LogWarning("Unrecognized extraction mode '{Mode}' for key '{Key}', defaulting to skip", modeStr, key);
                mode = ExtractionMode.Skip;
            }
            return value is null ? null : new ExtractedTextFieldDto(value, mode);
        }
        // Legacy fallback: plain string response from AI (treat as replace)
        if (prop.ValueKind == JsonValueKind.String)
        {
            var value = prop.GetString();
            return string.IsNullOrWhiteSpace(value) ? null : new ExtractedTextFieldDto(value, ExtractionMode.Replace);
        }
        return null;
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

    private static int? GetIntOrNull(JsonElement root, string key)
    {
        if (!root.TryGetProperty(key, out var prop)) return null;
        return prop.ValueKind == JsonValueKind.Number && prop.TryGetInt32(out var v) ? v : null;
    }

    private static bool? GetBoolOrNull(JsonElement root, string key)
    {
        if (!root.TryGetProperty(key, out var prop)) return null;
        return prop.ValueKind is JsonValueKind.True or JsonValueKind.False ? prop.GetBoolean() : null;
    }

    private static string? GetHhMmOrNull(JsonElement root, string key)
    {
        var raw = GetStringOrNull(root, key);
        if (raw is null) return null;
        return TimeOnly.TryParseExact(raw, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _)
            ? raw
            : null;
    }

    private static List<string> ParseStringArray(JsonElement root, string key)
    {
        var result = new List<string>();
        if (!root.TryGetProperty(key, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return result;

        foreach (var item in arr.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                var s = item.GetString();
                if (!string.IsNullOrWhiteSpace(s))
                    result.Add(s);
            }
        }
        return result;
    }

    private static List<TopicTagDto> ParseTopicTags(JsonElement root)
    {
        var result = new List<TopicTagDto>();
        if (!root.TryGetProperty("topicTags", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return result;

        foreach (var item in arr.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object) continue;
            var tag = GetStringOrNull(item, "tag")?.Trim();
            if (string.IsNullOrWhiteSpace(tag)) continue;
            var category = GetStringOrNull(item, "category")?.Trim();
            result.Add(new TopicTagDto(tag, category));
        }
        return result;
    }

    private static ExtractedHomeworkStatus? ParseHomeworkStatus(JsonElement root)
    {
        var raw = GetStringOrNull(root, "previousHomeworkStatus");
        if (raw is null) return null;
        return Enum.TryParse<ExtractedHomeworkStatus>(raw, ignoreCase: true, out var parsed)
            ? parsed
            : null;
    }

    private static readonly Regex CefrLevelRegex = new(@"^[ABC][12]\+?$", RegexOptions.Compiled);

    private static string? ParseCefrLevel(JsonElement root, string key)
    {
        var raw = GetStringOrNull(root, key);
        return raw is not null && CefrLevelRegex.IsMatch(raw) ? raw : null;
    }
}
