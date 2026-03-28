using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using LangTeach.Api.AI;

namespace LangTeach.Api.Services;

public class SectionProfileService : ISectionProfileService
{
    // Key: lowercase section type (e.g. "warmup")
    private readonly Dictionary<string, SectionProfile> _profiles;
    private readonly ILogger<SectionProfileService> _log;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
    };

    public SectionProfileService(ILogger<SectionProfileService> logger)
    {
        _log = logger;
        var assembly = Assembly.GetExecutingAssembly();
        const string prefix = "LangTeach.Api.SectionProfiles.";

        var resourceNames = assembly.GetManifestResourceNames()
            .Where(n => n.StartsWith(prefix, StringComparison.Ordinal) && n.EndsWith(".json", StringComparison.Ordinal))
            .ToList();

        if (resourceNames.Count == 0)
            _log.LogWarning("SectionProfileService: no embedded section profile JSON files found under prefix '{Prefix}'", prefix);

        var loaded = new Dictionary<string, SectionProfile>(StringComparer.OrdinalIgnoreCase);

        foreach (var name in resourceNames)
        {
            using var stream = assembly.GetManifestResourceStream(name);
            if (stream is null)
            {
                _log.LogWarning("SectionProfileService: could not open resource stream for '{Name}'", name);
                continue;
            }

            try
            {
                var profile = JsonSerializer.Deserialize<SectionProfile>(stream, JsonOpts);
                if (profile is null)
                {
                    _log.LogWarning("SectionProfileService: deserialized null profile from '{Name}'", name);
                    continue;
                }

                var key = profile.SectionType.Replace(" ", "", StringComparison.Ordinal).ToLowerInvariant();
                loaded[key] = profile;
                _log.LogInformation("SectionProfileService: loaded profile '{SectionType}' with {LevelCount} levels", profile.SectionType, profile.Levels.Count);
            }
            catch (JsonException ex)
            {
                _log.LogError(ex, "SectionProfileService: failed to parse JSON for resource '{Name}'", name);
            }
        }

        _profiles = loaded;
    }

    public string GetGuidance(string sectionType, string cefrLevel)
    {
        var profile = GetProfile(sectionType);
        if (profile is null) return string.Empty;

        var level = NormalizeLevel(cefrLevel);
        if (profile.Levels.TryGetValue(level, out var levelProfile))
            return levelProfile.Guidance;

        _log.LogDebug("SectionProfileService: no guidance found for section '{Section}' level '{Level}'", sectionType, cefrLevel);
        return string.Empty;
    }

    public bool IsAllowed(string sectionType, string contentType, string cefrLevel)
    {
        if (string.IsNullOrEmpty(sectionType)) return true;

        var profile = GetProfile(sectionType);
        if (profile is null) return true; // Unknown section: permissive

        var allowedTypes = GetAllowedContentTypes(sectionType, cefrLevel);
        return allowedTypes.Any(ct => string.Equals(ct, contentType, StringComparison.OrdinalIgnoreCase));
    }

    public string[] GetAllowedContentTypes(string sectionType, string cefrLevel)
    {
        var profile = GetProfile(sectionType);
        if (profile is null) return [];

        var level = NormalizeLevel(cefrLevel);
        if (profile.Levels.TryGetValue(level, out var levelProfile))
            return levelProfile.ContentTypes;

        return [];
    }

    public string[]? GetRawValidExerciseTypes(string sectionType, string cefrLevel)
    {
        var profile = GetProfile(sectionType);
        if (profile is null) return null;
        var level = NormalizeLevel(cefrLevel);
        if (profile.Levels.TryGetValue(level, out var lp))
            return lp.ValidExerciseTypes;
        return null;
    }

    public ForbiddenExerciseType[] GetRawForbiddenExerciseTypes(string sectionType, string cefrLevel)
    {
        var profile = GetProfile(sectionType);
        if (profile is null) return [];
        var level = NormalizeLevel(cefrLevel);
        if (profile.Levels.TryGetValue(level, out var lp))
            return lp.ForbiddenExerciseTypes ?? [];
        return [];
    }

    public DurationRange? GetDuration(string sectionType, string cefrLevel)
    {
        var profile = GetProfile(sectionType);
        if (profile is null) return null;
        var level = NormalizeLevel(cefrLevel);
        if (profile.Levels.TryGetValue(level, out var lp))
            return lp.Duration;
        return null;
    }

    public string? GetScope(string sectionType, string cefrLevel)
    {
        var profile = GetProfile(sectionType);
        if (profile is null) return null;
        var level = NormalizeLevel(cefrLevel);
        if (profile.Levels.TryGetValue(level, out var lp))
            return lp.Scope;
        return null;
    }

    public string[] GetAllScopeValues() =>
        _profiles.Values
            .SelectMany(p => p.Levels.Values)
            .Select(lp => lp.Scope)
            .Where(s => s is not null)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray()!;

    private SectionProfile? GetProfile(string sectionType)
    {
        var key = sectionType.Replace(" ", "", StringComparison.Ordinal).ToLowerInvariant();
        return _profiles.TryGetValue(key, out var profile) ? profile : null;
    }

    private static string NormalizeLevel(string cefrLevel) =>
        CefrLevelNormalizer.Normalize(cefrLevel);
}
