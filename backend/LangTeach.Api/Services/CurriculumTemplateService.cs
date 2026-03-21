using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public interface ICurriculumTemplateService
{
    IReadOnlyList<CurriculumTemplateSummary> GetAll();
    CurriculumTemplateData? GetByLevel(string level);
    IReadOnlyList<string> GetGrammarForCefrPrefix(string cefrPrefix);
}

public class CurriculumTemplateService : ICurriculumTemplateService
{
    private readonly Dictionary<string, CurriculumTemplateData> _byLevel;
    private readonly Dictionary<string, IReadOnlyList<string>> _grammarByPrefix;
    private readonly IReadOnlyList<CurriculumTemplateSummary> _summaries;

    private readonly ILogger<CurriculumTemplateService> _log;

    public CurriculumTemplateService(ILogger<CurriculumTemplateService> logger)
    {
        _log = logger;
        var assembly = Assembly.GetExecutingAssembly();
        const string prefix = "LangTeach.Api.Curricula.";

        var resourceNames = assembly.GetManifestResourceNames()
            .Where(n => n.StartsWith(prefix, StringComparison.Ordinal) && n.EndsWith(".json", StringComparison.Ordinal))
            .ToList();

        if (resourceNames.Count == 0)
            _log.LogWarning("CurriculumTemplateService: no embedded curriculum JSON files found under prefix '{Prefix}'", prefix);

        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            PropertyNameCaseInsensitive = true,
        };

        var loaded = new List<(string Level, RawTemplate Template)>();

        foreach (var name in resourceNames)
        {
            // e.g. "LangTeach.Api.Curricula.A1.1.json" -> level = "A1.1"
            var withoutPrefix = name[prefix.Length..];
            var level = withoutPrefix[..^".json".Length];

            using var stream = assembly.GetManifestResourceStream(name);
            if (stream is null)
            {
                _log.LogWarning("CurriculumTemplateService: could not open embedded resource stream '{Name}'; skipping", name);
                continue;
            }

            RawTemplate? raw;
            try
            {
                raw = JsonSerializer.Deserialize<RawTemplate>(stream, options);
            }
            catch (Exception ex) when (ex is JsonException or NotSupportedException)
            {
                _log.LogWarning(ex, "CurriculumTemplateService: failed to deserialize embedded resource '{Name}'; skipping", name);
                continue;
            }

            if (raw is null)
            {
                _log.LogWarning("CurriculumTemplateService: deserialized null from embedded resource '{Name}'; skipping", name);
                continue;
            }

            loaded.Add((level, raw));
        }

        _byLevel = new Dictionary<string, CurriculumTemplateData>(StringComparer.OrdinalIgnoreCase);
        var summaries = new List<CurriculumTemplateSummary>();
        var grammarAccumulator = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var (level, raw) in loaded.OrderBy(x => x.Level, StringComparer.Ordinal))
        {
            var units = (raw.Units ?? []).Select(u => new CurriculumTemplateUnit(
                UnitNumber: u.UnitNumber,
                Title: u.Title ?? string.Empty,
                OverallGoal: u.OverallGoal ?? string.Empty,
                Grammar: u.Grammar ?? [],
                VocabularyThemes: u.VocabularyThemes ?? [],
                CommunicativeFunctions: u.CommunicativeFunctions ?? []
            )).ToList();

            // Normalize CefrLevel to the 2-char CEFR prefix ("B1", not "B1.2")
            // so GetGrammarForCefrPrefix lookups always work regardless of what
            // individual JSON files store in the cefr_level field.
            var rawCefr = raw.CefrLevel?.Trim();
            var normalizedCefr = !string.IsNullOrEmpty(rawCefr)
                ? (rawCefr.Length >= 2 ? rawCefr[..2] : rawCefr)
                : (level.Length >= 2 ? level[..2] : level);

            var data = new CurriculumTemplateData(
                Level: level,
                CefrLevel: normalizedCefr,
                Units: units
            );

            _byLevel[level] = data;

            var sampleGrammar = units
                .SelectMany(u => u.Grammar)
                .Take(3)
                .ToList();

            summaries.Add(new CurriculumTemplateSummary(
                Level: level,
                CefrLevel: data.CefrLevel,
                UnitCount: units.Count,
                SampleGrammar: sampleGrammar
            ));

            // Accumulate grammar by CEFR prefix (e.g., "B1" from "B1.2")
            var cefrPrefix = data.CefrLevel.Length >= 2 ? data.CefrLevel[..2] : data.CefrLevel;
            if (!grammarAccumulator.TryGetValue(cefrPrefix, out var set))
            {
                set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                grammarAccumulator[cefrPrefix] = set;
            }
            foreach (var g in units.SelectMany(u => u.Grammar))
                set.Add(g);
        }

        _summaries = summaries;
        _grammarByPrefix = grammarAccumulator.ToDictionary(
            kvp => kvp.Key,
            kvp => (IReadOnlyList<string>)kvp.Value.Order().ToList(),
            StringComparer.OrdinalIgnoreCase
        );
    }

    public IReadOnlyList<CurriculumTemplateSummary> GetAll() => _summaries;

    public CurriculumTemplateData? GetByLevel(string level) =>
        _byLevel.TryGetValue(level, out var data) ? data : null;

    public IReadOnlyList<string> GetGrammarForCefrPrefix(string cefrPrefix)
    {
        if (string.IsNullOrWhiteSpace(cefrPrefix))
            return [];

        var normalized = cefrPrefix.Trim();
        normalized = normalized.Length >= 2 ? normalized[..2] : normalized;

        return _grammarByPrefix.TryGetValue(normalized, out var list) ? list : [];
    }

    // Internal deserialization models (snake_case JSON)
    private sealed class RawTemplate
    {
        public string? Level { get; set; }
        public string? CefrLevel { get; set; }
        public List<RawUnit>? Units { get; set; }
    }

    private sealed class RawUnit
    {
        public int UnitNumber { get; set; }
        public string? Title { get; set; }
        public string? OverallGoal { get; set; }
        public List<string>? Grammar { get; set; }
        public List<string>? VocabularyThemes { get; set; }
        public List<string>? CommunicativeFunctions { get; set; }
    }
}
