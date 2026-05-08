namespace LangTeach.Api.Data.Models;

public static class CorrectionTagCategory
{
    public const string Cohesion = "C";
    public const string Gramatica = "G";
    public const string Lexico = "L";
    public const string Ortografia = "O";
    public const string MuyBien = "MuyBien";

    public static bool IsValid(string value) =>
        value == Cohesion || value == Gramatica || value == Lexico
        || value == Ortografia || value == MuyBien;
}
