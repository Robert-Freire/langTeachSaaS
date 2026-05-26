namespace LangTeach.Api.Data.Models;

// Status values are deliberately Title-case Spanish, not lowercase English like
// TeacherFollowupStatuses. They surface verbatim in the teacher-facing UI as the
// pill labels (Pendiente / Entregada / Corregida) per the sprint story; treating
// them as user-facing strings avoids a translation layer between DB and frontend.
public static class CorrectionStatus
{
    public const string Pendiente = "Pendiente";
    public const string Entregada = "Entregada";
    // Student text submitted, awaiting worker pickup. Transitions only to Corrigiendo (worker claim) or Entregada (sweeper on aged timeout).
    public const string Encolada = "Encolada";
    public const string Corrigiendo = "Corrigiendo";
    public const string Corregida = "Corregida";
    public const string CorreccionFallida = "CorreccionFallida";

    public static bool IsValid(string value) =>
        value == Pendiente || value == Entregada || value == Encolada
        || value == Corrigiendo || value == Corregida || value == CorreccionFallida;
}
