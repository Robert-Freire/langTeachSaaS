namespace LangTeach.Api.Data.Models;

public static class CorrectionStatus
{
    public const string Pendiente = "Pendiente";
    public const string Entregada = "Entregada";
    public const string Corregida = "Corregida";

    public static bool IsValid(string value) =>
        value == Pendiente || value == Entregada || value == Corregida;
}
