namespace LangTeach.Api.Helpers;

public static class SkillLevelHelper
{
    public static bool OverrideDiffersFromNominal(string overrideValue, string nominalLevel) =>
        !string.Equals(overrideValue, nominalLevel, StringComparison.OrdinalIgnoreCase);

    public static bool IsReassessmentPending(IReadOnlyDictionary<string, string> overrides, string nominalLevel) =>
        overrides.Any(kv => OverrideDiffersFromNominal(kv.Value, nominalLevel));
}
