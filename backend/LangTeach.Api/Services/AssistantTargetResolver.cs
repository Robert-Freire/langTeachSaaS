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

    public async Task<ResolvedTarget?> ResolveByIdAsync(Guid groupId, Guid teacherId, CancellationToken ct = default)
    {
        var group = await _groupService.GetByIdAsync(teacherId, groupId, ct);
        if (group is null) return null;
        return Confident(new GroupForResolutionDto(group.Id, group.Name, group.Aliases ?? [], group.CefrLevel), group.Name, []);
    }

    public async Task<ResolvedTarget> ResolveAsync(string rawMention, Guid teacherId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(rawMention))
            return new ResolvedTarget(IsConfident: false,
                Target: new ProposedTarget("group", rawMention ?? "", null, [], false));

        var groups = await _groupService.GetAllActiveAsync(teacherId, ct);
        var mention = rawMention.Trim();

        // Layer 1: exact name match
        var exactMatches = FindExactMatches(groups, mention);
        if (exactMatches.Count == 1) return Confident(exactMatches[0], rawMention, groups);
        if (exactMatches.Count > 1) return Ambiguous(exactMatches, rawMention);

        // Layer 2: alias match
        var aliasMatches = FindAliasMatches(groups, mention);
        if (aliasMatches.Count == 1) return Confident(aliasMatches[0], rawMention, groups);
        if (aliasMatches.Count > 1) return Ambiguous(aliasMatches, rawMention);

        // Layer 3: spoken-number normalization then exact/alias match
        var normalized = TryNormalizeSpoken(mention);
        if (normalized is not null)
        {
            var normExact = FindExactMatches(groups, normalized);
            if (normExact.Count == 1) return Confident(normExact[0], rawMention, groups);
            if (normExact.Count > 1) return Ambiguous(normExact, rawMention);
            var normAlias = FindAliasMatches(groups, normalized);
            if (normAlias.Count == 1) return Confident(normAlias[0], rawMention, groups);
            if (normAlias.Count > 1) return Ambiguous(normAlias, rawMention);
        }

        // Layer 4: fuzzy match — never auto-resolves, always returns candidates
        var fuzzyMatches = TryFuzzyMatch(groups, mention);
        return new ResolvedTarget(
            IsConfident: false,
            Target: new ProposedTarget(
                Kind: "group",
                RawMention: rawMention,
                ResolvedId: null,
                Candidates: fuzzyMatches.Select(g => new GroupSummaryDto(g.Id, g.Name, g.CefrLevel)).ToList(),
                IsConfident: false));
    }

    private static List<GroupForResolutionDto> FindExactMatches(List<GroupForResolutionDto> groups, string mention) =>
        groups.Where(g => string.Equals(g.Name.Trim(), mention, StringComparison.OrdinalIgnoreCase)).ToList();

    private static List<GroupForResolutionDto> FindAliasMatches(List<GroupForResolutionDto> groups, string mention) =>
        groups.Where(g => g.Aliases.Any(a => string.Equals(a.Trim(), mention, StringComparison.OrdinalIgnoreCase))).ToList();

    private static ResolvedTarget Ambiguous(List<GroupForResolutionDto> candidates, string rawMention) =>
        new(IsConfident: false,
            Target: new ProposedTarget(
                Kind: "group",
                RawMention: rawMention,
                ResolvedId: null,
                Candidates: candidates.Select(g => new GroupSummaryDto(g.Id, g.Name, g.CefrLevel)).ToList(),
                IsConfident: false));

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
        // Skip fuzzy matching for very short tokens to avoid noisy spurious matches.
        if (mention.Length < 3) return [];

        var lower = mention.ToLowerInvariant();
        return groups
            .Where(g =>
                (g.Name.Length >= 3 && (
                    g.Name.ToLowerInvariant().Contains(lower) ||
                    lower.Contains(g.Name.ToLowerInvariant()) ||
                    LevenshteinDistance(g.Name.ToLowerInvariant(), lower) <= 2)) ||
                g.Aliases.Any(a => a.Length >= 3 && (
                    a.ToLowerInvariant().Contains(lower) ||
                    lower.Contains(a.ToLowerInvariant()) ||
                    LevenshteinDistance(a.ToLowerInvariant(), lower) <= 2)))
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
                IsConfident: true),
            ResolvedGroupName: group.Name,
            ResolvedCefrLevel: group.CefrLevel);
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
