namespace LangTeach.Api.Services;

public class CorrectionWorkerOptions
{
    public const string SectionName = "Correction";
    public int WorkerConcurrency { get; set; } = 1;
}
