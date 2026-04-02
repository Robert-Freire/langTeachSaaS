using LangTeach.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Data;

public static class DemoSeeder
{
    private const string DemoTag = "[demo]";
    private const string VisualTag = "[visual-seed]";

    public static async Task<bool> SeedAsync(AppDbContext db, string teacherLookup, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(teacherLookup))
        {
            logger.LogError("Seed target is required. Pass an Auth0 user ID or email.");
            return false;
        }
        teacherLookup = teacherLookup.Trim();

        var teacher = teacherLookup.StartsWith("auth0|", StringComparison.OrdinalIgnoreCase)
            ? await db.Teachers.FirstOrDefaultAsync(t => t.Auth0UserId == teacherLookup)
            : await db.Teachers.FirstOrDefaultAsync(t => t.Email == teacherLookup);

        if (teacher is null)
        {
            logger.LogError("No teacher found for '{Lookup}'. Log in at least once before seeding.", teacherLookup);
            return false;
        }

        if (!teacher.IsApproved)
        {
            teacher.IsApproved = true;
            logger.LogInformation("Approved teacher {Email}.", teacher.Email);
        }

        var alreadySeeded = await db.Students.AnyAsync(s => s.TeacherId == teacher.Id && s.Notes == DemoTag);
        if (alreadySeeded)
        {
            logger.LogInformation("Demo data already exists for teacher {Email} — skipping.", teacher.Email);
            return true;
        }

        logger.LogInformation("Seeding demo data for teacher {Email}...", teacher.Email);

        var now = DateTime.UtcNow;

        var students = new List<Student>
        {
            new() { Id = Guid.NewGuid(), TeacherId = teacher.Id, Name = "Ana Souza",        LearningLanguage = "English", CefrLevel = "B2", Interests = """["travel","cooking"]""",    Notes = DemoTag, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacher.Id, Name = "Marco Rossi",      LearningLanguage = "English", CefrLevel = "A2", Interests = """["football","music"]""",    Notes = DemoTag, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacher.Id, Name = "Yuki Tanaka",      LearningLanguage = "English", CefrLevel = "B1", Interests = """["technology","anime"]""",  Notes = DemoTag, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacher.Id, Name = "Fatima Al-Hassan", LearningLanguage = "English", CefrLevel = "C1", Interests = """["literature","history"]""", Notes = DemoTag, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacher.Id, Name = "Carlos Mendez",    LearningLanguage = "English", CefrLevel = "A1", Interests = """["business","travel"]""",   Notes = DemoTag, CreatedAt = now, UpdatedAt = now },
        };

        db.Students.AddRange(students);

        var lessons = new List<Lesson>
        {
            CreateLesson(teacher.Id, students[0].Id, "Describing Past Experiences",      "English", "B2", "Travel stories",           45, "Draft", now,
                ("WarmUp",       0, "Show a photo of a famous landmark; ask what they know about it."),
                ("Practice",     1, "Past simple and past continuous: guided speaking prompts about a trip."),
                ("Production",   2, "Student recounts a personal travel story; teacher notes errors for feedback."),
                ("WrapUp",       3, "Error correction slot and key vocabulary review.")),

            CreateLesson(teacher.Id, students[1].Id, "Present Simple vs Continuous",     "English", "A2", "Daily routines",            45, "Draft", now,
                ("WarmUp",       0, "Quick picture description: what is the person doing right now?"),
                ("Presentation", 1, "Contrast present simple (habits) with present continuous (now); elicit examples."),
                ("Practice",     2, "Gap-fill exercise alternating between both tenses."),
                ("Production",   3, "Student describes their daily routine and what they are doing at this moment."),
                ("WrapUp",       4, "Review the two rules; student writes two example sentences of each.")),

            CreateLesson(teacher.Id, students[2].Id, "Technology Vocabulary in Context", "English", "B1", "Social media and devices",  40, "Draft", now,
                ("WarmUp",       0, "Brainstorm: list all tech words you know in 60 seconds."),
                ("Presentation", 1, "Pre-teach 10 vocabulary items from the reading text."),
                ("Practice",     2, "Read an article about smartphone habits; answer comprehension questions."),
                ("WrapUp",       3, "Summarise the article in two sentences using new vocabulary.")),

            CreateLesson(teacher.Id, students[3].Id, "Writing Opinion Essays",           "English", "C1", "Media and society",         60, "Draft", now,
                ("WarmUp",       0, "Discuss: do social media companies have a responsibility to control misinformation?"),
                ("Presentation", 1, "Analyse a model C1 opinion essay: structure, cohesive devices, and hedging language."),
                ("Practice",     2, "Reorder jumbled paragraphs; identify discourse markers and replace weak phrases."),
                ("Production",   3, "Student writes a full essay independently in 35 minutes."),
                ("WrapUp",       4, "Peer review: highlight two strengths and one area to improve.")),

            CreateLesson(teacher.Id, students[4].Id, "Greetings and Introductions",      "English", "A1", "Meeting people",            30, "Draft", now,
                ("WarmUp",       0, "Play a short video of two people meeting for the first time."),
                ("Presentation", 1, "Introduce key phrases: Hello, My name is, Nice to meet you, Where are you from?"),
                ("Practice",     2, "Roleplay: student greets the teacher using the target phrases."),
                ("WrapUp",       3, "Student writes three sentences introducing themselves.")),
        };

        db.Lessons.AddRange(lessons);

        await db.SaveChangesAsync();

        var sectionCount = lessons.Sum(l => l.Sections.Count);
        logger.LogInformation("Demo data seeded: {Students} students, {Lessons} lessons, {Sections} sections.",
            students.Count, lessons.Count, sectionCount);
        return true;
    }

    public static async Task<bool> SeedVisualAsync(AppDbContext db, string teacherLookup, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(teacherLookup))
        {
            logger.LogError("Seed target is required. Pass an Auth0 user ID or email.");
            return false;
        }
        teacherLookup = teacherLookup.Trim();

        var teacher = teacherLookup.StartsWith("auth0|", StringComparison.OrdinalIgnoreCase)
            ? await db.Teachers.FirstOrDefaultAsync(t => t.Auth0UserId == teacherLookup)
            : await db.Teachers.FirstOrDefaultAsync(t => t.Email == teacherLookup);

        if (teacher is null)
        {
            logger.LogError("No teacher found for '{Lookup}'. Log in at least once before seeding.", teacherLookup);
            return false;
        }

        if (!teacher.IsApproved || !teacher.HasCompletedOnboarding)
        {
            teacher.IsApproved = true;
            teacher.HasCompletedOnboarding = true;
            logger.LogInformation("Approved teacher {Email}.", teacher.Email);
        }

        var studentsSeeded = await db.Students.AnyAsync(s => s.TeacherId == teacher.Id && s.Notes == VisualTag);
        var coursesSeeded  = await db.Courses.AnyAsync(c => c.TeacherId == teacher.Id && c.Description == VisualTag);

        if (studentsSeeded && coursesSeeded)
        {
            logger.LogInformation("Visual seed data already exists for teacher {Email}, skipping.", teacher.Email);
            return true;
        }

        // Remove any partial seed state before re-seeding
        if (studentsSeeded || coursesSeeded)
        {
            logger.LogInformation("Partial visual seed detected for teacher {Email}, cleaning up.", teacher.Email);
            var partialStudents = await db.Students.Where(s => s.TeacherId == teacher.Id && s.Notes == VisualTag).ToListAsync();
            db.Students.RemoveRange(partialStudents);
            var partialCourses = await db.Courses.Where(c => c.TeacherId == teacher.Id && c.Description == VisualTag).ToListAsync();
            db.Courses.RemoveRange(partialCourses);
            var partialLessons = await db.Lessons.Where(l => l.TeacherId == teacher.Id && l.Topic == VisualTag).ToListAsync();
            db.Lessons.RemoveRange(partialLessons);
            await db.SaveChangesAsync();
        }

        logger.LogInformation("Seeding visual data for teacher {Email}...", teacher.Email);

        var now = DateTime.UtcNow;

        var students = new List<Student>
        {
            new() { Id = Guid.NewGuid(), TeacherId = teacher.Id, Name = "Ana Visual",   LearningLanguage = "English", CefrLevel = "B2", Notes = VisualTag, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacher.Id, Name = "Marco Visual", LearningLanguage = "English", CefrLevel = "A2", Notes = VisualTag, CreatedAt = now, UpdatedAt = now },
        };
        db.Students.AddRange(students);

        // Lesson with generated content (for StudyView /lessons/:id/study)
        var lessonWithContent = CreateLesson(teacher.Id, students[0].Id,
            "Travel Vocabulary", "English", "B2", VisualTag, 45, "Draft", now,
            ("WarmUp",       0, "Discuss a memorable trip."),
            ("Presentation", 1, "Pre-teach travel vocabulary."),
            ("Practice",     2, "Gap-fill with target words."),
            ("Production",   3, "Student describes a trip using new vocabulary."),
            ("WrapUp",       4, "Review and self-correction."));

        // Plain lesson without content (for lesson editor /lessons/:id)
        var plainLesson = CreateLesson(teacher.Id, students[1].Id,
            "Daily Routines", "English", "A2", VisualTag, 40, "Draft", now,
            ("WarmUp",       0, "Describe your morning routine."),
            ("Presentation", 1, "Present simple for habits."),
            ("Practice",     2, "Fill-in exercises."),
            ("WrapUp",       3, "Review."));

        db.Lessons.AddRange(lessonWithContent, plainLesson);

        // Vocabulary content block for StudyView
        const string vocabularyJson = """{"items":[{"word":"travel","definition":"to go from one place to another","exampleSentence":"I love to travel."},{"word":"passport","definition":"an official document for international travel","exampleSentence":"Don't forget your passport."},{"word":"luggage","definition":"bags and cases used when travelling","exampleSentence":"She packed her luggage the night before."}]}""";
        var contentBlock = new LessonContentBlock
        {
            Id               = Guid.NewGuid(),
            LessonId         = lessonWithContent.Id,
            LessonSectionId  = null,
            BlockType        = ContentBlockType.Vocabulary,
            GeneratedContent = vocabularyJson,
            CreatedAt        = now,
            UpdatedAt        = now,
        };
        db.LessonContentBlocks.Add(contentBlock);

        // Course with curriculum entries
        var course = new Course
        {
            Id               = Guid.NewGuid(),
            TeacherId        = teacher.Id,
            StudentId        = students[0].Id,
            Name             = "B2 English General Course",
            Description      = VisualTag,
            Language         = "English",
            Mode             = "general",
            TargetCefrLevel  = "B2",
            SessionCount     = 3,
            IsDeleted        = false,
            CreatedAt        = now,
            UpdatedAt        = now,
        };
        db.Courses.Add(course);

        var entries = new List<CurriculumEntry>
        {
            new() { Id = Guid.NewGuid(), CourseId = course.Id, OrderIndex = 1, Topic = "Travel Vocabulary",  GrammarFocus = "Past simple",    Competencies = "speaking,listening", LessonType = "Communicative", LessonId = lessonWithContent.Id, Status = "created",  IsDeleted = false },
            new() { Id = Guid.NewGuid(), CourseId = course.Id, OrderIndex = 2, Topic = "Daily Routines",     GrammarFocus = "Present simple", Competencies = "reading,writing",    LessonType = "Grammar-focused", LessonId = null,                  Status = "planned", IsDeleted = false },
            new() { Id = Guid.NewGuid(), CourseId = course.Id, OrderIndex = 3, Topic = "Future Plans",       GrammarFocus = "Going to / will", Competencies = "writing",           LessonType = "Mixed",           LessonId = null,                  Status = "planned", IsDeleted = false },
        };
        db.CurriculumEntries.AddRange(entries);

        await db.SaveChangesAsync();

        logger.LogInformation("Visual seed complete: {Students} students, 2 lessons, 1 content block, 1 course, {Entries} entries.",
            students.Count, entries.Count);
        return true;
    }

    private static Lesson CreateLesson(
        Guid teacherId, Guid studentId,
        string title, string language, string cefrLevel, string topic,
        int durationMinutes, string status, DateTime now,
        params (string SectionType, int OrderIndex, string Notes)[] sectionDefs)
    {
        var lesson = new Lesson
        {
            Id              = Guid.NewGuid(),
            TeacherId       = teacherId,
            StudentId       = studentId,
            Title           = title,
            Language        = language,
            CefrLevel       = cefrLevel,
            Topic           = topic,
            DurationMinutes = durationMinutes,
            Status          = status,
            CreatedAt       = now,
            UpdatedAt       = now,
        };

        lesson.Sections = sectionDefs.Select(s => new LessonSection
        {
            Id          = Guid.NewGuid(),
            LessonId    = lesson.Id,
            SectionType = s.SectionType,
            OrderIndex  = s.OrderIndex,
            Notes       = s.Notes,
            CreatedAt   = now,
            UpdatedAt   = now,
        }).ToList();

        return lesson;
    }
}
