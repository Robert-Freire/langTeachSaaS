namespace LangTeach.Api.AI;

public class CorrectionPassOptions
{
    public const string SectionName = "CorrectionPasses";
    public PassConfig Pass1 { get; set; } = new();
    public PassConfig Filter { get; set; } = new();
    public PassConfig ScopeAffirmer { get; set; } = new();
}

public class PassConfig
{
    public string Model { get; set; } = "sonnet";
    public int MaxTokens { get; set; } = 32768;
    // Temperature should remain 0 for all correction passes (deterministic output required).
    // Exposed in config only for emergency override; do not change in normal operation.
    public float Temperature { get; set; } = 0;
}
