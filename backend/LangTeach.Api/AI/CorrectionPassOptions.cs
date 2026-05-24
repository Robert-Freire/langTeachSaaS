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
    public float Temperature { get; set; } = 0;
}
