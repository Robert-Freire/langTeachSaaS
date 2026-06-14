namespace LangTeach.Api.Services;

public class CorrectionWorkerOptions
{
    public const string SectionName = "Correction";
    public int WorkerConcurrency { get; set; } = 1;
    public int ScopeAffirmerWordCountCap { get; set; } = 800;
    public string MuyBienExplanationTemplate { get; set; } =
        "¡Bien hecho! Usaste {structureLabel} correctamente: esta estructura le da un nivel superior a tu escritura. Sigue así.";
}
