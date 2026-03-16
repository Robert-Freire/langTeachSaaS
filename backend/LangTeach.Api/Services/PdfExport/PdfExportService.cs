using System.Text.Json;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Helpers;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace LangTeach.Api.Services.PdfExport;

public class PdfExportService : IPdfExportService
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public byte[] GeneratePdf(PdfLessonData lesson, PdfExportMode mode)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginHorizontal(40);
                page.MarginVertical(30);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Element(c => ComposeHeader(c, lesson, mode));
                page.Content().Element(c => ComposeContent(c, lesson, mode));
                page.Footer().Element(ComposeFooter);
            });
        });

        return document.GeneratePdf();
    }

    private static void ComposeHeader(IContainer container, PdfLessonData lesson, PdfExportMode mode)
    {
        container.Column(col =>
        {
            col.Item().Text(lesson.Title).FontSize(18).Bold().FontColor(Colors.Indigo.Darken2);
            col.Item().PaddingTop(4).Row(row =>
            {
                row.AutoItem().Text($"{lesson.Language} | {lesson.CefrLevel}").FontSize(9).FontColor(Colors.Grey.Darken1);
                row.AutoItem().PaddingHorizontal(8).Text($"Topic: {lesson.Topic}").FontSize(9).FontColor(Colors.Grey.Darken1);
                row.AutoItem().Text(lesson.CreatedAt.ToString("yyyy-MM-dd")).FontSize(9).FontColor(Colors.Grey.Darken1);
                if (mode == PdfExportMode.Teacher && !string.IsNullOrWhiteSpace(lesson.StudentName))
                    row.AutoItem().PaddingLeft(8).Text($"Student: {lesson.StudentName}").FontSize(9).FontColor(Colors.Grey.Darken1);
            });
            col.Item().PaddingTop(6).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
            col.Item().PaddingBottom(8);
        });
    }

    private static void ComposeContent(IContainer container, PdfLessonData lesson, PdfExportMode mode)
    {
        container.Column(col =>
        {
            foreach (var section in lesson.Sections.OrderBy(s => s.OrderIndex))
            {
                col.Item().Element(c => ComposeSection(c, section, mode));
            }
        });
    }

    private static void ComposeSection(IContainer container, PdfSectionData section, PdfExportMode mode)
    {
        container.Column(col =>
        {
            col.Item().PaddingTop(10).Text(section.SectionType).FontSize(13).Bold().FontColor(Colors.Indigo.Medium);

            if (mode == PdfExportMode.Teacher && !string.IsNullOrWhiteSpace(section.Notes))
            {
                col.Item().PaddingTop(4).PaddingLeft(8)
                    .Background(Colors.Amber.Lighten5)
                    .Padding(6)
                    .Text($"Notes: {section.Notes}").FontSize(9).Italic().FontColor(Colors.Grey.Darken2);
            }

            foreach (var block in section.Blocks)
            {
                col.Item().PaddingTop(6).Element(c => ComposeBlock(c, block, mode));
            }
        });
    }

    private static void ComposeBlock(IContainer container, PdfBlockData block, PdfExportMode mode)
    {
        var stripped = ContentJsonHelper.StripFences(block.RawContent);
        if (stripped is null) return;

        try
        {
            switch (block.BlockType)
            {
                case ContentBlockType.Vocabulary:
                    RenderVocabulary(container, JsonSerializer.Deserialize<VocabularyContent>(stripped, JsonOpts)!, mode);
                    break;
                case ContentBlockType.Grammar:
                    RenderGrammar(container, JsonSerializer.Deserialize<GrammarContent>(stripped, JsonOpts)!, mode);
                    break;
                case ContentBlockType.Exercises:
                    RenderExercises(container, JsonSerializer.Deserialize<ExercisesContent>(stripped, JsonOpts)!, mode);
                    break;
                case ContentBlockType.Conversation:
                    RenderConversation(container, JsonSerializer.Deserialize<ConversationContent>(stripped, JsonOpts)!);
                    break;
                case ContentBlockType.Reading:
                    RenderReading(container, JsonSerializer.Deserialize<ReadingContent>(stripped, JsonOpts)!, mode);
                    break;
                case ContentBlockType.Homework:
                    RenderHomework(container, JsonSerializer.Deserialize<HomeworkContent>(stripped, JsonOpts)!);
                    break;
                case ContentBlockType.LessonPlan:
                    if (mode == PdfExportMode.Teacher)
                        RenderLessonPlan(container, JsonSerializer.Deserialize<LessonPlanContent>(stripped, JsonOpts)!);
                    break;
            }
        }
        catch (JsonException)
        {
            // If content can't be deserialized, skip the block
        }
    }

    private static void RenderVocabulary(IContainer container, VocabularyContent content, PdfExportMode mode)
    {
        container.Column(col =>
        {
            col.Item().Text("Vocabulary").FontSize(11).SemiBold();
            col.Item().PaddingTop(4).Table(table =>
            {
                if (mode == PdfExportMode.Teacher)
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(2);
                        c.RelativeColumn(3);
                        c.RelativeColumn(3);
                        c.RelativeColumn(2);
                    });
                    table.Header(h =>
                    {
                        h.Cell().Background(Colors.Indigo.Lighten5).Padding(4).Text("Word").FontSize(9).SemiBold();
                        h.Cell().Background(Colors.Indigo.Lighten5).Padding(4).Text("Definition").FontSize(9).SemiBold();
                        h.Cell().Background(Colors.Indigo.Lighten5).Padding(4).Text("Example").FontSize(9).SemiBold();
                        h.Cell().Background(Colors.Indigo.Lighten5).Padding(4).Text("Translation").FontSize(9).SemiBold();
                    });
                    foreach (var item in content.Items)
                    {
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(item.Word).FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(item.Definition).FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(item.ExampleSentence ?? "").FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(item.Translation ?? "").FontSize(9);
                    }
                }
                else
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(2);
                        c.RelativeColumn(3);
                        c.RelativeColumn(3);
                    });
                    table.Header(h =>
                    {
                        h.Cell().Background(Colors.Indigo.Lighten5).Padding(4).Text("Word").FontSize(9).SemiBold();
                        h.Cell().Background(Colors.Indigo.Lighten5).Padding(4).Text("Definition").FontSize(9).SemiBold();
                        h.Cell().Background(Colors.Indigo.Lighten5).Padding(4).Text("Example").FontSize(9).SemiBold();
                    });
                    foreach (var item in content.Items)
                    {
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(item.Word).FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(item.Definition).FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(item.ExampleSentence ?? "").FontSize(9);
                    }
                }
            });
        });
    }

    private static void RenderGrammar(IContainer container, GrammarContent content, PdfExportMode mode)
    {
        container.Column(col =>
        {
            col.Item().Text(content.Title).FontSize(11).SemiBold();
            col.Item().PaddingTop(4).Text(content.Explanation).FontSize(10);

            if (content.Examples.Length > 0)
            {
                col.Item().PaddingTop(4).Text("Examples:").FontSize(10).SemiBold();
                foreach (var ex in content.Examples)
                {
                    col.Item().PaddingLeft(12).Text(text =>
                    {
                        text.Span($"- {ex.Sentence}").FontSize(10);
                        if (!string.IsNullOrWhiteSpace(ex.Note))
                            text.Span($"  ({ex.Note})").FontSize(9).Italic().FontColor(Colors.Grey.Darken1);
                    });
                }
            }

            if (mode == PdfExportMode.Teacher && content.CommonMistakes.Length > 0)
            {
                col.Item().PaddingTop(4).Text("Common Mistakes:").FontSize(10).SemiBold().FontColor(Colors.Red.Darken1);
                foreach (var mistake in content.CommonMistakes)
                {
                    col.Item().PaddingLeft(12).Text($"- {mistake}").FontSize(10).FontColor(Colors.Red.Darken1);
                }
            }
        });
    }

    private static void RenderExercises(IContainer container, ExercisesContent content, PdfExportMode mode)
    {
        container.Column(col =>
        {
            col.Item().Text("Exercises").FontSize(11).SemiBold();

            if (content.FillInBlank.Length > 0)
            {
                col.Item().PaddingTop(4).Text("Fill in the Blank:").FontSize(10).SemiBold();
                for (var i = 0; i < content.FillInBlank.Length; i++)
                {
                    var fb = content.FillInBlank[i];
                    col.Item().PaddingLeft(12).Text(text =>
                    {
                        text.Span($"{i + 1}. {fb.Sentence}").FontSize(10);
                        if (mode == PdfExportMode.Teacher)
                            text.Span($"  [{fb.Answer}]").FontSize(10).Bold().FontColor(Colors.Green.Darken2);
                    });
                }
            }

            if (content.MultipleChoice.Length > 0)
            {
                col.Item().PaddingTop(4).Text("Multiple Choice:").FontSize(10).SemiBold();
                for (var i = 0; i < content.MultipleChoice.Length; i++)
                {
                    var mc = content.MultipleChoice[i];
                    col.Item().PaddingLeft(12).Text($"{i + 1}. {mc.Question}").FontSize(10);
                    foreach (var opt in mc.Options)
                    {
                        var isAnswer = mode == PdfExportMode.Teacher && opt == mc.Answer;
                        col.Item().PaddingLeft(24).Text(text =>
                        {
                            if (isAnswer)
                                text.Span($"[x] {opt}").FontSize(10).Bold().FontColor(Colors.Green.Darken2);
                            else
                                text.Span($"[ ] {opt}").FontSize(10);
                        });
                    }
                }
            }

            if (content.Matching.Length > 0)
            {
                col.Item().PaddingTop(4).Text("Matching:").FontSize(10).SemiBold();
                col.Item().PaddingTop(2).Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn();
                        c.RelativeColumn();
                    });
                    table.Header(h =>
                    {
                        h.Cell().Background(Colors.Indigo.Lighten5).Padding(4).Text("Column A").FontSize(9).SemiBold();
                        h.Cell().Background(Colors.Indigo.Lighten5).Padding(4).Text("Column B").FontSize(9).SemiBold();
                    });
                    foreach (var m in content.Matching)
                    {
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(m.Left).FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(m.Right).FontSize(9);
                    }
                });
            }
        });
    }

    private static void RenderConversation(IContainer container, ConversationContent content)
    {
        container.Column(col =>
        {
            col.Item().Text("Conversation").FontSize(11).SemiBold();
            foreach (var scenario in content.Scenarios)
            {
                col.Item().PaddingTop(4).PaddingLeft(8).Column(sc =>
                {
                    sc.Item().Text($"Setup: {scenario.Setup}").FontSize(10).Italic();
                    sc.Item().PaddingTop(2).Text($"{scenario.RoleA}:").FontSize(10).SemiBold();
                    foreach (var p in scenario.RoleAPhrases)
                        sc.Item().PaddingLeft(12).Text($"- {p}").FontSize(10);
                    sc.Item().PaddingTop(2).Text($"{scenario.RoleB}:").FontSize(10).SemiBold();
                    foreach (var p in scenario.RoleBPhrases)
                        sc.Item().PaddingLeft(12).Text($"- {p}").FontSize(10);
                    if (scenario.KeyPhrases is { Length: > 0 })
                    {
                        sc.Item().PaddingTop(2).Text("Key Phrases:").FontSize(10).SemiBold();
                        foreach (var kp in scenario.KeyPhrases)
                            sc.Item().PaddingLeft(12).Text($"- {kp}").FontSize(10);
                    }
                });
            }
        });
    }

    private static void RenderReading(IContainer container, ReadingContent content, PdfExportMode mode)
    {
        container.Column(col =>
        {
            col.Item().Text("Reading").FontSize(11).SemiBold();
            col.Item().PaddingTop(4).Text(content.Passage).FontSize(10);

            if (content.ComprehensionQuestions.Length > 0)
            {
                col.Item().PaddingTop(4).Text("Comprehension Questions:").FontSize(10).SemiBold();
                for (var i = 0; i < content.ComprehensionQuestions.Length; i++)
                {
                    var q = content.ComprehensionQuestions[i];
                    col.Item().PaddingLeft(12).Text(text =>
                    {
                        text.Span($"{i + 1}. {q.Question}").FontSize(10);
                        if (mode == PdfExportMode.Teacher)
                            text.Span($"  Answer: {q.Answer}").FontSize(10).Bold().FontColor(Colors.Green.Darken2);
                    });
                }
            }

            if (content.VocabularyHighlights.Length > 0)
            {
                col.Item().PaddingTop(4).Text("Vocabulary Highlights:").FontSize(10).SemiBold();
                foreach (var vh in content.VocabularyHighlights)
                    col.Item().PaddingLeft(12).Text($"- {vh.Word}: {vh.Definition}").FontSize(10);
            }
        });
    }

    private static void RenderHomework(IContainer container, HomeworkContent content)
    {
        container.Column(col =>
        {
            col.Item().Text("Homework").FontSize(11).SemiBold();
            foreach (var task in content.Tasks)
            {
                col.Item().PaddingTop(4).PaddingLeft(8).Column(tc =>
                {
                    tc.Item().Text($"[{task.Type}] {task.Instructions}").FontSize(10);
                    if (task.Examples.Length > 0)
                    {
                        tc.Item().PaddingTop(2).Text("Examples:").FontSize(9).Italic();
                        foreach (var ex in task.Examples)
                            tc.Item().PaddingLeft(12).Text($"- {ex}").FontSize(9);
                    }
                });
            }
        });
    }

    private static void RenderLessonPlan(IContainer container, LessonPlanContent content)
    {
        container.Column(col =>
        {
            col.Item().Text($"Lesson Plan: {content.Title}").FontSize(11).SemiBold();

            if (content.Objectives.Length > 0)
            {
                col.Item().PaddingTop(4).Text("Objectives:").FontSize(10).SemiBold();
                foreach (var obj in content.Objectives)
                    col.Item().PaddingLeft(12).Text($"- {obj}").FontSize(10);
            }

            var phases = new (string Label, string Text)[]
            {
                ("Warm-Up", content.Sections.WarmUp),
                ("Presentation", content.Sections.Presentation),
                ("Practice", content.Sections.Practice),
                ("Production", content.Sections.Production),
                ("Wrap-Up", content.Sections.WrapUp),
            };

            foreach (var (label, text) in phases)
            {
                if (string.IsNullOrWhiteSpace(text)) continue;
                col.Item().PaddingTop(4).Text($"{label}:").FontSize(10).SemiBold();
                col.Item().PaddingLeft(12).Text(text).FontSize(10);
            }
        });
    }

    private static void ComposeFooter(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Text("Created with LangTeach").FontSize(8).FontColor(Colors.Grey.Medium);
            row.RelativeItem().AlignRight().Text(text =>
            {
                text.Span("Page ").FontSize(8).FontColor(Colors.Grey.Medium);
                text.CurrentPageNumber().FontSize(8).FontColor(Colors.Grey.Medium);
            });
        });
    }
}
