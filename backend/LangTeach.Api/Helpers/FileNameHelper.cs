using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace LangTeach.Api.Helpers;

public static class FileNameHelper
{
    public static string SlugifyName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "student";
        var folded = name.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var ch in folded)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark) continue;
            sb.Append(ch);
        }
        var ascii = sb.ToString().ToLowerInvariant();
        var slug = Regex.Replace(ascii, "[^a-z0-9]+", "-").Trim('-');
        return string.IsNullOrEmpty(slug) ? "student" : slug;
    }

    public static string SanitizeTitle(string? title)
    {
        if (string.IsNullOrWhiteSpace(title)) return "_";
        var safe = string.Concat(title.Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c));
        return safe.Replace(" ", "_");
    }
}
