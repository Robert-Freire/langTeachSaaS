using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using LangTeach.Api.AI;
using LangTeach.Api.DTOs;
using LangTeach.Api.Helpers;

namespace LangTeach.Api.Services;

public class StudentProfileExtractionService : IStudentProfileExtractionService
{
    private static readonly Regex CefrLevelRegex =
        new(@"^[ABC][12]\+?$", RegexOptions.Compiled);

    // Skill level values from AI extraction are accepted here with sublevel tolerance.
    // StudentService.NormalizeSkillLevelOverrides collapses them to base levels before storage.
    private static readonly Regex SkillLevelRegex =
        new(@"^[ABC][12](\.\d+)?[+]?$", RegexOptions.Compiled);

    private readonly IClaudeClient _claude;
    private readonly IPromptService _prompts;
    private readonly ILogger<StudentProfileExtractionService> _logger;

    public StudentProfileExtractionService(
        IClaudeClient claude,
        IPromptService prompts,
        ILogger<StudentProfileExtractionService> logger)
    {
        _claude = claude;
        _prompts = prompts;
        _logger = logger;
    }

    public async Task<ExtractedStudentProfileDto> ExtractAsync(string text, CancellationToken ct = default)
    {
        var request = _prompts.BuildStudentProfileExtractionPrompt(text) with { CallSite = "student.extraction" };

        ClaudeResponse response;
        try
        {
            response = await _claude.CompleteAsync(request, ct);
        }
        catch (ClaudeRateLimitException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Claude API call failed during student profile extraction");
            return Empty();
        }

        return ParseResponse(response.Content);
    }

    internal ExtractedStudentProfileDto ParseResponse(string json)
    {
        try
        {
            var cleaned = ContentJsonHelper.StripFencesAndPreamble(json) ?? string.Empty;
            using var doc = JsonDocument.Parse(cleaned);
            var root = doc.RootElement;

            return new ExtractedStudentProfileDto(
                Name: GetStringOrNull(root, "name"),
                BirthYear: GetIntOrNull(root, "birthYear"),
                Profession: GetStringOrNull(root, "profession"),
                CountryOfResidence: GetStringOrNull(root, "countryOfResidence"),
                CityOfResidence: GetStringOrNull(root, "cityOfResidence"),
                ReasonForStudying: GetStringOrNull(root, "reasonForStudying"),
                NativeLanguages: ParseStringArray(root, "nativeLanguages"),
                SpokenLanguages: ParseStringArray(root, "spokenLanguages"),
                LearningLanguage: GetStringOrNull(root, "learningLanguage"),
                CefrLevel: ParseCefrLevel(root, "cefrLevel"),
                OfficialCefrLevel: ParseCefrLevel(root, "officialCefrLevel"),
                ShortTermObjectives: ParseObjectives(root),
                Difficulties: ParseDifficulties(root),
                TeachingTodoTexts: ParseStringArray(root, "teachingTodoTexts"),
                Interests: ParseStringArray(root, "interests"),
                NewStudentIntent: GetBoolOrDefault(root, "newStudentIntent"),
                TeachingNotes: GetStringOrNull(root, "teachingNotes"),
                SkillLevelReading: ParseSkillLevelField(root, "reading"),
                SkillLevelWriting: ParseSkillLevelField(root, "writing"),
                SkillLevelSpeaking: ParseSkillLevelField(root, "speaking"),
                SkillLevelListening: ParseSkillLevelField(root, "listening")
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse student profile extraction JSON (length: {Length})", json?.Length ?? 0);
            _logger.LogDebug("Unparseable Claude response: {Preview}...", json is null ? null : json[..Math.Min(200, json.Length)]);
            return Empty();
        }
    }

    private static ExtractedStudentProfileDto Empty() =>
        new(null, null, null, null, null, null, [], [], null, null, null, [], [], [], [], false, null, null, null, null, null);

    private static string? GetStringOrNull(JsonElement root, string key)
    {
        if (root.TryGetProperty(key, out var prop) && prop.ValueKind == JsonValueKind.String)
        {
            var value = prop.GetString();
            return string.IsNullOrWhiteSpace(value) ? null : value;
        }
        return null;
    }

    private static bool GetBoolOrDefault(JsonElement root, string key)
    {
        if (!root.TryGetProperty(key, out var prop)) return false;
        return prop.ValueKind == JsonValueKind.True;
    }

    private static int? GetIntOrNull(JsonElement root, string key)
    {
        if (!root.TryGetProperty(key, out var prop)) return null;
        return prop.ValueKind == JsonValueKind.Number && prop.TryGetInt32(out var v) ? v : null;
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

    private static string? ParseCefrLevel(JsonElement root, string key)
    {
        var raw = GetStringOrNull(root, key);
        return raw is not null && CefrLevelRegex.IsMatch(raw) ? raw : null;
    }

    private static List<ExtractedObjectiveDto> ParseObjectives(JsonElement root)
    {
        var result = new List<ExtractedObjectiveDto>();
        if (!root.TryGetProperty("shortTermObjectives", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return result;

        foreach (var item in arr.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object) continue;
            var text = GetStringOrNull(item, "text");
            if (string.IsNullOrWhiteSpace(text)) continue;
            var targetDate = GetIsoDateOrNull(item, "targetDate");
            result.Add(new ExtractedObjectiveDto(text, targetDate));
        }
        return result;
    }

    private static List<ExtractedDifficultyDto> ParseDifficulties(JsonElement root)
    {
        var result = new List<ExtractedDifficultyDto>();
        if (!root.TryGetProperty("difficulties", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return result;

        foreach (var item in arr.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object) continue;
            var description = GetStringOrNull(item, "description")?.Trim();
            var competency = GetStringOrNull(item, "competency")?.Trim();
            var subcategory = GetStringOrNull(item, "subcategory")?.Trim() ?? string.Empty;
            if (description is null || competency is null) continue;
            result.Add(new ExtractedDifficultyDto(description, competency, subcategory));
        }
        return result;
    }

    private string? ParseSkillLevelField(JsonElement root, string key)
    {
        if (!root.TryGetProperty("skillLevel", out var skillLevel) || skillLevel.ValueKind != JsonValueKind.Object)
            return null;
        var raw = GetStringOrNull(skillLevel, key);
        if (raw is null) return null;
        if (!SkillLevelRegex.IsMatch(raw))
        {
            _logger.LogWarning("Extracted skillLevel.{Key} value '{Value}' does not match expected CEFR pattern; discarding", key, raw);
            return null;
        }
        return raw;
    }

    private static string? GetIsoDateOrNull(JsonElement root, string key)
    {
        var raw = GetStringOrNull(root, key);
        if (raw is null) return null;
        return DateOnly.TryParseExact(raw, "yyyy-MM-dd", CultureInfo.InvariantCulture,
            DateTimeStyles.None, out var parsed)
            ? parsed.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            : null;
    }
}
