namespace LangTeach.Api.Data.Models;

// C / G / L / O are the teacher-facing single-letter chips that render in the marked-up
// text. MuyBien is the asymmetric fifth: it has no chip (bold-only, per sprint story
// design-system §11.13), so a single letter is gratuitous. Kept as a word for clarity
// in queries and JSON payloads.
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
