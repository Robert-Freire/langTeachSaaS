using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using LangTeach.Api.Data.Models;
using LangTeach.Api.DTOs;

namespace LangTeach.Api.Services.CorrectionDocxExport;

public class CorrectionDocxExportService : ICorrectionDocxExportService
{
    // Category underline colors (no '#'), matching the canonical palette in
    // design-system.md §11.16 and frontend/src/lib/correction-colors.ts.
    // Keep both in sync: update correction-colors.ts and this map together.
    private static readonly IReadOnlyDictionary<string, string> CategoryColors = new Dictionary<string, string>
    {
        [CorrectionTagCategory.Cohesion]   = "6366F1", // indigo-500
        [CorrectionTagCategory.Gramatica]  = "F97316", // orange-500
        [CorrectionTagCategory.Lexico]     = "F59E0B", // amber-500
        [CorrectionTagCategory.Ortografia] = "10B981", // emerald-500
    };

    private const string MetadataGray = "6B7280"; // gray-500

    public byte[] Generate(CorrectionDetailDto correction, string studentName)
    {
        using var stream = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(stream, WordprocessingDocumentType.Document))
        {
            var mainPart = doc.AddMainDocumentPart();
            mainPart.Document = new Document(new Body());
            var body = mainPart.Document.Body!;

            AppendHeader(body, correction, studentName);
            AppendCorrectedBody(body, correction);
            AppendFooter(body);

            mainPart.Document.Save();
        }
        return stream.ToArray();
    }

    private static void AppendHeader(Body body, CorrectionDetailDto c, string studentName)
    {
        body.AppendChild(BuildParagraph(runs: new[] { BoldRun(c.AssignmentTitle, sizeHalfPoints: 36) }));

        var dateStr = (c.CorrectedAt ?? c.UpdatedAt).ToString("yyyy-MM-dd");
        body.AppendChild(BuildParagraph(runs: new[]
        {
            ColoredRun($"Estudiante: {studentName}    Fecha: {dateStr}", MetadataGray, sizeHalfPoints: 22),
        }));

        if (!string.IsNullOrWhiteSpace(c.AssignmentPrompt))
        {
            body.AppendChild(BuildParagraph(runs: new[]
            {
                ItalicRun($"Consigna: {c.AssignmentPrompt}", sizeHalfPoints: 22),
            }));
        }

        body.AppendChild(new Paragraph()); // spacer
    }

    private static void AppendCorrectedBody(Body body, CorrectionDetailDto c)
    {
        var text = c.StudentText ?? string.Empty;
        var tags = c.Tags
            .Where(t => t.StartIndex >= 0
                        && t.EndIndex > t.StartIndex
                        && t.EndIndex <= text.Length)
            .OrderBy(t => t.StartIndex)
            .ToList();

        var currentParagraph = new Paragraph();
        body.AppendChild(currentParagraph);

        var cursor = 0;
        foreach (var tag in tags)
        {
            // Schema (#1153) forbids overlapping tags; this guard is defensive against
            // a future regression and keeps the linear walk well-defined.
            if (tag.StartIndex < cursor) continue;

            if (tag.StartIndex > cursor)
            {
                AppendTextWithLineBreaks(body, ref currentParagraph, text.Substring(cursor, tag.StartIndex - cursor), runFactory: PlainRun);
            }
            AppendTaggedSpan(currentParagraph, tag);
            cursor = tag.EndIndex;
        }

        if (cursor < text.Length)
        {
            AppendTextWithLineBreaks(body, ref currentParagraph, text.Substring(cursor), runFactory: PlainRun);
        }
    }

    private static void AppendTaggedSpan(Paragraph paragraph, CorrectionTagDto tag)
    {
        if (tag.Category == CorrectionTagCategory.MuyBien)
        {
            paragraph.AppendChild(BoldRun(tag.SpannedText));
            return;
        }

        var color = CategoryColors.TryGetValue(tag.Category, out var hex) ? hex : "000000";
        paragraph.AppendChild(BoldColoredRun(tag.SpannedText, color));
        paragraph.AppendChild(ItalicGrayRun(BuildParenthetical(tag)));
    }

    internal static string BuildParenthetical(CorrectionTagDto tag) =>
        $" ({tag.Category}) corrección: \"{tag.CorrectedForm}\" — {tag.Explanation}.";

    private static void AppendTextWithLineBreaks(Body body, ref Paragraph current, string text, Func<string, Run> runFactory)
    {
        var segments = text.Split('\n');
        for (var i = 0; i < segments.Length; i++)
        {
            if (i > 0)
            {
                current = new Paragraph();
                body.AppendChild(current);
            }
            if (segments[i].Length > 0)
            {
                current.AppendChild(runFactory(segments[i]));
            }
        }
    }

    private static void AppendFooter(Body body)
    {
        body.AppendChild(new Paragraph()); // spacer
        var p = new Paragraph(
            new ParagraphProperties(new Justification { Val = JustificationValues.Center }));
        p.AppendChild(ColoredItalicRun("Generado con Atelier.", MetadataGray, sizeHalfPoints: 18));
        body.AppendChild(p);
    }

    // --- run factories ---

    private static Run PlainRun(string text) => BuildRun(text, props: null);

    private static Run BoldRun(string text, int? sizeHalfPoints = null)
    {
        var props = new RunProperties(new Bold());
        if (sizeHalfPoints is int sz) props.AppendChild(new FontSize { Val = sz.ToString() });
        return BuildRun(text, props);
    }

    private static Run BoldColoredRun(string text, string colorHex)
    {
        var props = new RunProperties(new Bold(), new Color { Val = colorHex });
        return BuildRun(text, props);
    }

    private static Run ItalicRun(string text, int? sizeHalfPoints = null)
    {
        var props = new RunProperties(new Italic());
        if (sizeHalfPoints is int sz) props.AppendChild(new FontSize { Val = sz.ToString() });
        return BuildRun(text, props);
    }

    private static Run ItalicGrayRun(string text)
    {
        var props = new RunProperties(new Italic(), new Color { Val = MetadataGray });
        return BuildRun(text, props);
    }

    private static Run ColoredRun(string text, string colorHex, int? sizeHalfPoints = null)
    {
        var props = new RunProperties(new Color { Val = colorHex });
        if (sizeHalfPoints is int sz) props.AppendChild(new FontSize { Val = sz.ToString() });
        return BuildRun(text, props);
    }

    private static Run ColoredItalicRun(string text, string colorHex, int? sizeHalfPoints = null)
    {
        var props = new RunProperties(new Italic(), new Color { Val = colorHex });
        if (sizeHalfPoints is int sz) props.AppendChild(new FontSize { Val = sz.ToString() });
        return BuildRun(text, props);
    }

    private static Run BuildRun(string text, RunProperties? props)
    {
        var run = new Run();
        if (props is not null) run.AppendChild(props);
        run.AppendChild(new Text(text) { Space = SpaceProcessingModeValues.Preserve });
        return run;
    }

    private static Paragraph BuildParagraph(IEnumerable<Run> runs)
    {
        var p = new Paragraph();
        foreach (var r in runs) p.AppendChild(r);
        return p;
    }
}
