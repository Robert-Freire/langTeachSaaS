using System.Text.Json;
using LangTeach.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Data;

public static class SeedData
{
    public static async Task SeedAsync(AppDbContext db, ILogger logger)
    {
        if (await db.LessonTemplates.AnyAsync())
        {
            logger.LogInformation("Lesson templates already seeded, skipping.");
            return;
        }

        logger.LogInformation("Seeding lesson templates...");

        var templates = new List<LessonTemplate>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Conversation",
                Description = "Open-ended speaking practice focused on fluency and natural communication.",
                DefaultSections = Sections(
                    ("WarmUp",      0, "Introduce the topic with a question or short video to activate prior knowledge."),
                    ("Practice",    1, "Guided speaking activity — roleplay, discussion questions, or structured dialogue."),
                    ("Production",  2, "Free conversation on the topic; teacher monitors and notes errors for feedback."),
                    ("WrapUp",      3, "Recap key vocabulary and expressions used; brief error correction slot."))
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Grammar Focus",
                Description = "Structured presentation and practice of a specific grammar point.",
                DefaultSections = Sections(
                    ("WarmUp",      0, "Context-setting activity to elicit the target grammar from students."),
                    ("Presentation",1, "Explain the grammar rule with clear examples at the target CEFR level."),
                    ("Practice",    2, "Controlled exercises: gap-fill, multiple choice, or sentence transformation."),
                    ("Production",  3, "Freer practice — students use the grammar in a meaningful speaking or writing task."),
                    ("WrapUp",      4, "Review rules and common errors; ask students to write two example sentences."))
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Reading & Comprehension",
                Description = "Skills-based lesson built around a reading text with comprehension and vocabulary work.",
                DefaultSections = Sections(
                    ("WarmUp",      0, "Pre-reading task: predict content from title/images or discuss the topic."),
                    ("Presentation",1, "First read for gist, then second read for detail; pre-teach blocking vocabulary."),
                    ("Practice",    2, "Comprehension questions, vocabulary in context, and text analysis tasks."),
                    ("WrapUp",      3, "Summarise the text in two sentences; discuss the author's purpose or your opinion."))
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Writing Skills",
                Description = "Process-writing lesson guiding students from model analysis to a final written product.",
                DefaultSections = Sections(
                    ("WarmUp",      0, "Discuss the writing genre and its real-world purpose (email, essay, report, etc.)."),
                    ("Presentation",1, "Analyse a model text: structure, language features, and register."),
                    ("Practice",    2, "Guided writing tasks: sentence starters, paragraph ordering, or language matching."),
                    ("Production",  3, "Students write their own text using the model as a guide; peer review encouraged."),
                    ("WrapUp",      4, "Share a sentence or paragraph; teacher highlights two strengths and one improvement."))
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Exam Prep",
                Description = "Test-focused lesson covering exam task types, strategies, and timed practice.",
                DefaultSections = Sections(
                    ("WarmUp",      0, "Review the exam format and discuss the target task type and scoring criteria."),
                    ("Presentation",1, "Teach the strategy for the task (e.g. skimming, elimination, paraphrasing)."),
                    ("Practice",    2, "Timed practice under exam conditions; debrief answers with explanations."),
                    ("Production",  3, "Student attempts a full task independently; self-assess against the mark scheme."),
                    ("WrapUp",      4, "Identify one strength and one area to improve before the next session."))
            }
        };

        db.LessonTemplates.AddRange(templates);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} lesson templates.", templates.Count);
    }

    private static string Sections(params (string SectionType, int OrderIndex, string NotesPlaceholder)[] sections)
    {
        var dtos = sections.Select(s => new
        {
            s.SectionType,
            s.OrderIndex,
            s.NotesPlaceholder
        });
        return JsonSerializer.Serialize(dtos);
    }
}
