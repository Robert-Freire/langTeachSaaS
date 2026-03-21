namespace LangTeach.Api.Services;

public class GenerationLimitsOptions
{
    public const string SectionName = "GenerationLimits";
    public int FreeTierMonthlyLimit { get; set; } = 50;
    public int ProTierMonthlyLimit { get; set; } = -1;
}
