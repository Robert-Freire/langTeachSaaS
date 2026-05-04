namespace LangTeach.Api.Services;

/// <summary>
/// LangTeach accepts only A1, A2, B1, B2, C1, C2. No sublevel (B2.1) or plus (B2+) notation.
/// If a future product decision adds sublevels, update this class first; do not introduce sublevel strings ad hoc.
/// </summary>
public static class CefrConstants
{
    // Must be a compile-time constant so it can be used in [RegularExpression] attributes.
    public const string ValidationPattern = @"^(A1|A2|B1|B2|C1|C2)$";

    public static readonly string[] AllLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
}
