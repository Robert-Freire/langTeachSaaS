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

    public async Task<ExtractedReflectionDto> ExtractAsync(string text, IReadOnlyList<string>? knownDifficulties = null, bool hasOpenSession = false, CancellationToken ct = default)
    {
        var request = _prompts.BuildReflectionExtractionPrompt(new ReflectionExtractionContext(DateOnly.FromDateTime(DateTime.UtcNow), text, knownDifficulties, hasOpenSession)) with { CallSite = "reflection.extraction" };

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
                HomeworkAssigned: null, NextSessionTopics: null, SessionDate: null,
                SuggestedDifficulties: [], RawExtractionJson: null, SessionTitle: null,
                TopicTags: [], PreviousHomeworkStatus: null, TeachingTodos: [],
                TeacherFollowups: [], LevelReassessment: null, DurationMinutes: null,
                IsCancelled: null, DifficultiesWorkedOn: [], SessionStartTime: null,
                ProposedNewSession: null);
        }

        var dto = ParseResponse(response.Content);

        var isRetrospectiveNewSession = !hasOpenSession && dto.ProposedNewSession is not null;

        if (!isRetrospectiveNewSession && NeedsWhatWasCoveredFallback(dto))
        {
            var synthesised = await SynthesiseWhatWasCoveredAsync(text, dto, ct);
            if (!string.IsNullOrWhiteSpace(synthesised))
            {
                dto = dto with { WhatWasCovered = new ExtractedTextFieldDto(synthesised, ExtractionMode.Replace) };
            }
        }

        if (dto.TopicTags.Count > 0
            && (dto.WhatWasCovered is null
                || string.IsNullOrWhiteSpace(dto.WhatWasCovered.Value)))
        {
            _logger.LogWarning(
                "Extraction invariant: topicTags non-empty but whatWasCovered null after extraction and fallback (TagCount={Count})",
                dto.TopicTags.Count);
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
            var resp = await _claude.CompleteAsync(_prompts.BuildWhatWasCoveredFallbackPrompt(ctx) with { CallSite = "reflection.covered" }, ct);
            var sentence = resp.Content?.Trim().Trim('"').Trim();
            if (!string.IsNullOrWhiteSpace(sentence)) return sentence;
            _logger.LogInformation("Fallback whatWasCovered synthesis returned empty content; using deterministic join");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Warning, not Error: the primary extraction already succeeded; this fallback
            // is best-effort and we have a deterministic backup.
            _logger.LogWarning(ex, "Fallback whatWasCovered synthesis call failed; using deterministic join");
        }

        return DeterministicWhatWasCoveredFromSignals(dto.TopicTags, areas);
    }

    internal static string? DeterministicWhatWasCoveredFromSignals(IReadOnlyList<TopicTagDto> tags, string? areasToImprove)
    {
        var joinedTags = string.Join(", ", tags.Select(t => t.Tag).Where(t => !string.IsNullOrWhiteSpace(t)));
        if (!string.IsNullOrWhiteSpace(joinedTags))
            return $"Trabajamos: {joinedTags}.";

        var areas = areasToImprove?.Trim();
        if (!string.IsNullOrWhiteSpace(areas))
            return $"Trabajamos: {areas.TrimEnd('.')}.";

        return null;
    }

    internal ExtractedReflectionDto ParseResponse(string json)
    {
        try
        {
            var cleaned = ContentJsonHelper.StripFencesAndPreamble(json) ?? string.Empty;
            using var doc = JsonDocument.Parse(cleaned);
            var root = doc.RootElement;

            return new ExtractedReflectionDto(
                WhatWasCovered: ParseTextFieldOrNull(root, "whatWasCovered"),
                AreasToImprove: ParseTextFieldOrNull(root, "areasToImprove"),
                EmotionalSignals: GetStringOrNull(root, "emotionalSignals"),
                HomeworkAssigned: ParseTextFieldOrNull(root, "homeworkAssigned"),
                NextSessionTopics: ParseTextFieldOrNull(root, "nextLessonIdeas"),
                SessionDate: GetIsoDateOrNull(root, "sessionDate"),
                SuggestedDifficulties: ParseSuggestedDifficulties(root),
                RawExtractionJson: cleaned,
                SessionTitle: GetStringOrNull(root, "sessionTitle"),
                TopicTags: ParseTopicTags(root),
                PreviousHomeworkStatus: ParseHomeworkStatus(root),
                TeachingTodos: ParseTeachingTodos(root),
                TeacherFollowups: ParseStringArray(root, "teacherFollowups"),
                LevelReassessment: ParseCefrLevel(root, "levelReassessment"),
                DurationMinutes: GetIntOrNull(root, "durationMinutes"),
                IsCancelled: GetBoolOrNull(root, "isCancelled"),
                DifficultiesWorkedOn: ParseStringArray(root, "difficultiesWorkedOn"),
                SessionStartTime: GetHhMmOrNull(root, "sessionStartTime"),
                ProposedNewSession: BuildProposedNewSession(root)
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse reflection extraction JSON (length: {Length})", json?.Length ?? 0);
            _logger.LogDebug("Unparseable Claude response: {Preview}...", json is null ? null : json[..Math.Min(200, json.Length)]);
            return new ExtractedReflectionDto(
                WhatWasCovered: null, AreasToImprove: null, EmotionalSignals: null,
                HomeworkAssigned: null, NextSessionTopics: null, SessionDate: null,
                SuggestedDifficulties: [], RawExtractionJson: null, SessionTitle: null,
                TopicTags: [], PreviousHomeworkStatus: null, TeachingTodos: [],
                TeacherFollowups: [], LevelReassessment: null, DurationMinutes: null,
                IsCancelled: null, DifficultiesWorkedOn: [], SessionStartTime: null,
                ProposedNewSession: null);
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

    private static ProposedNewSession? BuildProposedNewSession(JsonElement root)
    {
        var title = GetStringOrNull(root, "newSessionTitle");
        if (string.IsNullOrWhiteSpace(title)) return null;
        var date = GetIsoDateOnlyOrNull(root, "newSessionDate");
        return new ProposedNewSession(title, date);
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

        if (DateOnly.TryParseExact(raw, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            return raw;

        if (DateTime.TryParseExact(raw, "yyyy-MM-ddTHH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            return raw;

        return null;
    }

    private static string? GetIsoDateOnlyOrNull(JsonElement root, string key)
    {
        var raw = GetStringOrNull(root, key);
        if (raw is null) return null;

        return DateOnly.TryParseExact(raw, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _)
            ? raw
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

    private static List<ExtractedTeachingTodoDto> ParseTeachingTodos(JsonElement root)
    {
        var result = new List<ExtractedTeachingTodoDto>();
        if (!root.TryGetProperty("teachingTodos", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return result;
        foreach (var item in arr.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                var s = item.GetString();
                if (!string.IsNullOrWhiteSpace(s)) result.Add(new ExtractedTeachingTodoDto(s));
            }
            else if (item.ValueKind == JsonValueKind.Object)
            {
                var text = GetStringOrNull(item, "text");
                if (string.IsNullOrWhiteSpace(text)) continue;
                result.Add(new ExtractedTeachingTodoDto(text));
            }
        }
        return result;
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

    private static readonly Regex CefrLevelRegex = new(@"^[ABC][12]$", RegexOptions.Compiled);

    private static string? ParseCefrLevel(JsonElement root, string key)
    {
        var raw = GetStringOrNull(root, key);
        return raw is not null && CefrLevelRegex.IsMatch(raw) ? raw : null;
    }
}
