using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services;

public class AssistantTargetResolver : IAssistantTargetResolver
{
    private readonly IGroupService _groupService;

    // Spoken-number Spanish pronunciations for CEFR letter components.
    // Keys are lowercase spoken forms; values are canonical CEFR characters.
    private static readonly Dictionary<string, string> SpokenLetterMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["a"] = "A",
        ["be"] = "B",
        ["b"] = "B",
        ["ce"] = "C",
        ["c"] = "C",
    };

    public AssistantTargetResolver(IGroupService groupService)
    {
        _groupService = groupService;
    }

    public async Task<ResolvedTarget> ResolveAsync(string rawMention, Guid teacherId, CancellationToken ct = default)
    {
        var groups = await _groupService.GetAllActiveAsync(teacherId, ct);
        var mention = rawMention.Trim();

        // Layer 1: exact name match
        var exactMatch = TryExactMatch(groups, mention);
        if (exactMatch is not null)
            return Confident(exactMatch, rawMention, groups);

        // Layer 2: alias match
        var aliasMatch = TryAliasMatch(groups, mention);
        if (aliasMatch is not null)
            return Confident(aliasMatch, rawMention, groups);

        // Layer 3: spoken-number normalization then exact match
        var normalized = TryNormalizeSpoken(mention);
        if (normalized is not null)
        {
            var normalizedMatch = TryExactMatch(groups, normalized)
                ?? TryAliasMatch(groups, normalized);
            if (normalizedMatch is not null)
                return Confident(normalizedMatch, rawMention, groups);
        }

        // Layer 4: fuzzy match — never auto-resolves, always returns candidates
        var fuzzyMatches = TryFuzzyMatch(groups, mention);
        return new ResolvedTarget(
            IsConfident: false,
            Target: new ProposedTarget(
                Kind: "group",
                RawMention: rawMention,
                ResolvedId: fuzzyMatches.Count == 1 ? fuzzyMatches[0].Id : null,
                Candidates: fuzzyMatches.Select(g => new GroupSummaryDto(g.Id, g.Name, g.CefrLevel)).ToList(),
                IsConfident: false));
    }

    private static GroupForResolutionDto? TryExactMatch(List<GroupForResolutionDto> groups, string mention)
    {
        var matches = groups
            .Where(g => string.Equals(g.Name.Trim(), mention, StringComparison.OrdinalIgnoreCase))
            .ToList();
        return matches.Count == 1 ? matches[0] : null;
    }

    private static GroupForResolutionDto? TryAliasMatch(List<GroupForResolutionDto> groups, string mention)
    {
        var matches = groups
            .Where(g => g.Aliases.Any(a =>
                string.Equals(a.Trim(), mention, StringComparison.OrdinalIgnoreCase)))
            .ToList();
        return matches.Count == 1 ? matches[0] : null;
    }

    // Converts spoken CEFR-like strings to their canonical form.
    // Examples: "be uno punto uno" -> "B1" + ".1" suffix, "a dos" -> "A2", "be uno" -> "B1"
    internal static string? TryNormalizeSpoken(string mention)
    {
        var tokens = mention.Trim().ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (tokens.Length < 2) return null;

        if (!SpokenLetterMap.TryGetValue(tokens[0], out var letter)) return null;

        // Expect digit or word digit at index 1
        if (!TryParseDigitToken(tokens[1], out var major)) return null;
        if (major < 1 || major > 2) return null;

        // Optional ".1" or "punto uno/dos" suffix
        if (tokens.Length >= 3)
        {
            var sub = tokens[2] is "punto" && tokens.Length >= 4
                ? tokens[3]
                : tokens[2];

            if (TryParseDigitToken(sub, out var minor))
                return $"{letter}{major}.{minor}";
        }

        return $"{letter}{major}";
    }

    private static bool TryParseDigitToken(string token, out int value)
    {
        if (int.TryParse(token, out value)) return true;

        var wordDigits = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["uno"] = 1, ["dos"] = 2, ["tres"] = 3,
        };
        return wordDigits.TryGetValue(token, out value);
    }

    private static List<GroupForResolutionDto> TryFuzzyMatch(List<GroupForResolutionDto> groups, string mention)
    {
        var lower = mention.ToLowerInvariant();
        return groups
            .Where(g =>
                g.Name.ToLowerInvariant().Contains(lower) ||
                lower.Contains(g.Name.ToLowerInvariant()) ||
                LevenshteinDistance(g.Name.ToLowerInvariant(), lower) <= 2 ||
                g.Aliases.Any(a =>
                    a.ToLowerInvariant().Contains(lower) ||
                    lower.Contains(a.ToLowerInvariant()) ||
                    LevenshteinDistance(a.ToLowerInvariant(), lower) <= 2))
            .ToList();
    }

    private static ResolvedTarget Confident(GroupForResolutionDto group, string rawMention, List<GroupForResolutionDto> groups)
    {
        return new ResolvedTarget(
            IsConfident: true,
            Target: new ProposedTarget(
                Kind: "group",
                RawMention: rawMention,
                ResolvedId: group.Id,
                Candidates: [],
                IsConfident: true));
    }

    // Wagner-Fischer dynamic programming Levenshtein distance.
    private static int LevenshteinDistance(string s, string t)
    {
        var n = s.Length;
        var m = t.Length;
        if (n == 0) return m;
        if (m == 0) return n;

        var d = new int[n + 1, m + 1];
        for (var i = 0; i <= n; i++) d[i, 0] = i;
        for (var j = 0; j <= m; j++) d[0, j] = j;

        for (var i = 1; i <= n; i++)
        for (var j = 1; j <= m; j++)
        {
            var cost = s[i - 1] == t[j - 1] ? 0 : 1;
            d[i, j] = Math.Min(
                Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                d[i - 1, j - 1] + cost);
        }

        return d[n, m];
    }
}
