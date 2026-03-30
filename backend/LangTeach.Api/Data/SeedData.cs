using System.Text.Json;
using LangTeach.Api.AI;
using LangTeach.Api.Data.Models;
using LangTeach.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Data;

public static class SeedData
{
    // Use the single authoritative section order from SectionKeys.CanonicalOrder.
    private static readonly string[] SectionOrder = SectionKeys.CanonicalOrder;

    // Template definitions: Name + Description are DB-level concerns.
    // Section structure is derived from pedagogy config at runtime.
    private static readonly (string Name, string Description)[] TemplateDefinitions =
    [
        ("Conversation",
            "Open-ended speaking practice focused on fluency and natural communication."),
        ("Grammar Focus",
            "Structured presentation and practice of a specific grammar point."),
        ("Reading & Comprehension",
            "Skills-based lesson built around a reading text with comprehension and vocabulary work."),
        ("Writing Skills",
            "Process-writing lesson guiding students from model analysis to a final written product."),
        ("Exam Prep",
            "Test-focused lesson covering exam task types, strategies, and timed practice."),
    ];

    public static async Task SeedAsync(AppDbContext db, IPedagogyConfigService pedagogy, ILogger logger)
    {
        logger.LogInformation("Seeding lesson templates...");

        foreach (var (name, description) in TemplateDefinitions)
        {
            var templateOverride = pedagogy.GetTemplateOverrideByName(name);
            if (templateOverride is null)
            {
                logger.LogWarning("SeedData: no template override found for '{Name}', skipping.", name);
                continue;
            }

            var defaultSections = BuildSections(templateOverride.Sections);

            var existing = await db.LessonTemplates
                .FirstOrDefaultAsync(t => t.Name == name);

            if (existing is null)
            {
                db.LessonTemplates.Add(new LessonTemplate
                {
                    Id = Guid.NewGuid(),
                    Name = name,
                    Description = description,
                    DefaultSections = defaultSections,
                });
                logger.LogInformation("SeedData: inserted template '{Name}'.", name);
            }
            else if (existing.DefaultSections != defaultSections)
            {
                existing.DefaultSections = defaultSections;
                logger.LogInformation("SeedData: updated sections for template '{Name}'.", name);
            }
        }

        await db.SaveChangesAsync();
        logger.LogInformation("SeedData: template seeding complete.");
    }

    private static string BuildSections(IDictionary<string, SectionOverride> sections)
    {
        var dtos = SectionOrder
            .Where(sections.ContainsKey)
            .Select((key, idx) => new
            {
                SectionType = ToTitleCase(key),
                OrderIndex = idx,
                NotesPlaceholder = sections[key].OverrideGuidance ?? key,
            });
        return JsonSerializer.Serialize(dtos);
    }

    private static string ToTitleCase(string sectionKey) => sectionKey switch
    {
        "warmUp"       => "WarmUp",
        "presentation" => "Presentation",
        "practice"     => "Practice",
        "production"   => "Production",
        "wrapUp"       => "WrapUp",
        _              => char.ToUpperInvariant(sectionKey[0]) + sectionKey[1..],
    };
}
