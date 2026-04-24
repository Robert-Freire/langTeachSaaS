using LangTeach.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Data;

public static class DemoSeeder
{
    private const string DemoTag = "[demo]";
    private const string VisualTag = "[visual-seed]";
    private const string RosterTag = "[roster-seed]";

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

        var alreadySeeded = await db.Students.AnyAsync(s => s.TeacherId == teacher.Id && s.PersonalNotes == DemoTag);
        if (alreadySeeded)
        {
            await SeedLargeRosterAsync(db, teacher.Id, logger);
            logger.LogInformation("Demo data already exists for teacher {Email} — skipping.", teacher.Email);
            return true;
        }

        logger.LogInformation("Seeding demo data for teacher {Email}...", teacher.Email);

        var now = DateTime.UtcNow;

        var students = new List<Student>
        {
            new() { Id = Guid.NewGuid(), TeacherId = teacher.Id, Name = "Ana Souza",        LearningLanguage = "English", CefrLevel = "B2", NativeLanguages = """["Portuguese"]""", Interests = """["travel","cooking"]""",    PersonalNotes = DemoTag, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacher.Id, Name = "Marco Rossi",      LearningLanguage = "English", CefrLevel = "A2", NativeLanguages = """["Italian"]""",   Interests = """["football","music"]""",    PersonalNotes = DemoTag, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacher.Id, Name = "Yuki Tanaka",      LearningLanguage = "English", CefrLevel = "B1", NativeLanguages = """["Japanese"]""",  Interests = """["technology","anime"]""",  PersonalNotes = DemoTag, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacher.Id, Name = "Fatima Al-Hassan", LearningLanguage = "English", CefrLevel = "C1", NativeLanguages = """["Arabic"]""",    Interests = """["literature","history"]""", PersonalNotes = DemoTag, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacher.Id, Name = "Carlos Mendez",    LearningLanguage = "English", CefrLevel = "A1", NativeLanguages = """["Spanish"]""",   Interests = """["business","travel"]""",   PersonalNotes = DemoTag, CreatedAt = now, UpdatedAt = now },
        };

        db.Students.AddRange(students);

        db.TeacherFollowups.AddRange(
            new TeacherFollowup { Id = Guid.Parse("a1b2c3d4-0000-0000-0000-000000000001"), TeacherId = teacher.Id, StudentId = students[0].Id, Text = "Trabajar la diferencia entre artículo determinado e indeterminado", Status = "pending", Kind = TeacherFollowupKinds.Pedagogical, CreatedAt = new DateTime(2026, 4, 9, 10, 0, 0, DateTimeKind.Utc) },
            new TeacherFollowup { Id = Guid.Parse("a1b2c3d4-0000-0000-0000-000000000002"), TeacherId = teacher.Id, StudentId = students[0].Id, Text = "Repasar pretérito en narraciones personales", Status = "pending", Kind = TeacherFollowupKinds.Pedagogical, CreatedAt = new DateTime(2026, 4, 9, 10, 5, 0, DateTimeKind.Utc) });

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
        await SeedLargeRosterAsync(db, teacher.Id, logger);
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

        var studentsSeeded = await db.Students.AnyAsync(s => s.TeacherId == teacher.Id && s.PersonalNotes == VisualTag);
        var coursesSeeded  = await db.Courses.AnyAsync(c => c.TeacherId == teacher.Id && c.Description == VisualTag);

        var now = DateTime.UtcNow;

        if (studentsSeeded && coursesSeeded)
        {
            await db.SaveChangesAsync(); // persist any approval/onboarding updates
            await EnsureAnaVisualNameAsync(db, teacher.Id, logger);
            await EnsureAnaVisualDifficultiesAsync(db, teacher.Id, logger);
            await EnsureAnaVisualExtrasAsync(db, teacher.Id, logger);
            await SeedScenarioStudentsAsync(db, teacher.Id, logger);
            await SeedAnaVisualSessionLogAsync(db, teacher.Id, logger);
            await SeedLargeRosterAsync(db, teacher.Id, logger);
            logger.LogInformation("Visual seed data already exists for teacher {Email}; scenario students refreshed.", teacher.Email);
            return true;
        }

        // Remove any partial seed state before re-seeding
        if (studentsSeeded || coursesSeeded)
        {
            logger.LogInformation("Partial visual seed detected for teacher {Email}, cleaning up.", teacher.Email);
            var partialStudents = await db.Students.Where(s => s.TeacherId == teacher.Id && s.PersonalNotes == VisualTag).ToListAsync();
            db.Students.RemoveRange(partialStudents);
            var partialCourses = await db.Courses.Where(c => c.TeacherId == teacher.Id && c.Description == VisualTag).ToListAsync();
            db.Courses.RemoveRange(partialCourses);
            var partialLessons = await db.Lessons.Where(l => l.TeacherId == teacher.Id && l.Topic == VisualTag).ToListAsync();
            db.Lessons.RemoveRange(partialLessons);
            await db.SaveChangesAsync();
        }

        logger.LogInformation("Seeding visual data for teacher {Email}...", teacher.Email);

        var students = new List<Student>
        {
            new() { Id = Guid.NewGuid(), TeacherId = teacher.Id, Name = "Ana Visual",   LearningLanguage = "English", CefrLevel = "B2", NativeLanguages = """["Portuguese","Ukrainian"]""", SpokenLanguages = AnaVisualSpokenLanguages, PersonalNotes = VisualTag, LearningGoals = AnaVisualLearningGoals, ShortTermObjectives = AnaVisualShortTermObjectives, SkillLevelOverrides = AnaVisualSkillLevelOverrides, Weaknesses = """[{"description":"Phrasal verbs","weaknessType":"grammatical"},{"description":"Travel vocabulary gaps","weaknessType":"lexical"}]""", Difficulties = AnaVisualDifficulties, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacher.Id, Name = "Marco Visual", LearningLanguage = "English", CefrLevel = "A2", NativeLanguages = """["Italian"]""", PersonalNotes = VisualTag, CreatedAt = now, UpdatedAt = now },
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

        await SeedScenarioStudentsAsync(db, teacher.Id, logger);
        await SeedAnaVisualSessionLogAsync(db, teacher.Id, logger);
        await SeedLargeRosterAsync(db, teacher.Id, logger);

        return true;
    }

    private static async Task SeedScenarioStudentsAsync(AppDbContext db, Guid teacherId, ILogger logger)
    {
        var now = DateTime.UtcNow;

        // Ana Seed — rich-profile scenario
        var anaSeed = await UpsertStudentAsync(db, teacherId, new Student
        {
            TeacherId          = teacherId,
            Name               = "Ana Seed",
            LearningLanguage   = "English",
            CefrLevel          = "B1",
            NativeLanguages    = """["Portuguese"]""",
            LearningGoals      = """["Improve conversational fluency","Prepare for job interviews in English"]""",
            Interests          = """["literature","travel","photography"]""",
            Difficulties       = """["False friends with Portuguese","Subjunctive mood"]""",
            Weaknesses         = """["Listening to fast native speech","Idiomatic expressions"]""",
            PersonalNotes      = "Sensitive about speaking in front of her manager at work — avoids complex sentences in meetings. Some test anxiety before formal assessments. Prefers positive reinforcement over error-focused feedback.",
            TeachingNotes      = "Responds well to visual aids. Prefers structured grammar drills over free conversation. Review subjunctive triggers next session.",
            SkillLevelOverrides = """{"Reading":"B2","Speaking":"B1","Writing":"A2","Listening":"B1"}""",
            BirthYear          = 1992,
            Profession         = "Marketing Manager",
            CountryOfOrigin    = "Brazil",
            CityOfOrigin       = "São Paulo",
            CountryOfResidence = "Spain",
            CityOfResidence    = "Barcelona",
            ReasonForStudying  = "Career advancement and relocation to an English-speaking country",
            IsActive           = true,
            SpokenLanguages    = """["Portuguese","Spanish"]""",
            ShortTermObjectives = """[{"id":"o1","text":"Pass B2 Cambridge exam","targetDate":"2026-06-30"},{"id":"o2","text":"Prepare for job interview in English","targetDate":null}]""",
        }, now);

        var anaSeedTodoId = Guid.Parse("a1b2c3d4-0000-0000-0000-000000000010");
        if (!await db.TeacherFollowups.AnyAsync(f => f.Id == anaSeedTodoId))
            db.TeacherFollowups.Add(new TeacherFollowup { Id = anaSeedTodoId, TeacherId = teacherId, StudentId = anaSeed.Id, Text = "Review subjunctive trigger verbs — she confuses querer vs desear contexts", Status = "pending", Kind = TeacherFollowupKinds.Pedagogical, CreatedAt = new DateTime(2026, 4, 10, 10, 0, 0, DateTimeKind.Utc) });

        // Marco Seed — excel-imported scenario; one old session, no upcoming → "Inactive Xd" badge
        var marcoSeed = await UpsertStudentAsync(db, teacherId, new Student
        {
            TeacherId        = teacherId,
            Name             = "Marco Seed",
            LearningLanguage = "English",
            CefrLevel        = "A2",
            NativeLanguages  = """["Italian"]""",
            LearningGoals    = "[]",
            Interests        = "[]",
            Difficulties     = "[]",
            Weaknesses       = "[]",
            PersonalNotes    = "[Excel import 2026-01-15]\nCurrent level: A2\nObjectives: Business English, travel vocabulary\nDifficulties: Pronunciation, articles",
            IsActive         = true,
        }, now);

        // Clara Seed — minimal scenario
        var clara = await UpsertStudentAsync(db, teacherId, new Student
        {
            TeacherId        = teacherId,
            Name             = "Clara Seed",
            LearningLanguage = "Spanish",
            CefrLevel        = "A1",
            NativeLanguages  = """["German"]""",
            LearningGoals    = "[]",
            Interests        = "[]",
            Difficulties     = "[]",
            Weaknesses       = "[]",
            PersonalNotes    = null,
        }, now);

        // Diego Seed — with-history scenario
        var diego = await UpsertStudentAsync(db, teacherId, new Student
        {
            TeacherId           = teacherId,
            Name                = "Diego Seed",
            LearningLanguage    = "English",
            CefrLevel           = "B2",
            NativeLanguages     = """["Spanish"]""",
            LearningGoals       = """["Achieve C1 certification","Improve academic writing"]""",
            Interests           = """["history","cinema","chess"]""",
            Difficulties        = """[{"id":"d1","description":"Third conditional structures","competency":"Grammar","subcategory":"Conditionals","severity":"medium","status":"Active","trend":"stable"},{"id":"d2","description":"Academic vocabulary range","competency":"Vocabulary","subcategory":"Academic","severity":"high","status":"Active","trend":"worsening"},{"id":"d3","description":"Reading speed","competency":"Discourse","subcategory":"Comprehension","severity":"low","status":"Covered","trend":"improving"}]""",
            Weaknesses          = "[]",
            PersonalNotes       = "[scenario-seed]",
            BirthYear           = 1988,
            Profession          = "University Professor",
            CountryOfOrigin     = "Argentina",
            CountryOfResidence  = "Spain",
            IsActive            = true,
            IsCorporate         = true,
            Rate                = "30 euros",
            SpokenLanguages       = """["French"]""",
            ShortTermObjectives  = """[{"id":"o1","text":"Complete C1 exam preparation course","targetDate":"2026-09-01"}]""",
            SkillLevelOverrides  = DiegoSkillLevelOverrides,
        }, now);

        // Flush all upserted student updates before checking session logs
        await db.SaveChangesAsync();

        // Add course with curriculum entries for Diego (progress dashboard) — separate guard for idempotency
        var diegoCourseExists = await db.Courses.AnyAsync(c => c.StudentId == diego.Id && !c.IsDeleted);
        Guid diegoLessonId;
        if (!diegoCourseExists)
        {
            var diegoCourse = new Course
            {
                Id              = Guid.NewGuid(),
                TeacherId       = teacherId,
                StudentId       = diego.Id,
                Name            = "B2 English — C1 Preparation",
                Language        = "English",
                Mode            = "general",
                TargetCefrLevel = "C1",
                SessionCount    = 8,
                IsDeleted       = false,
                CreatedAt       = now.AddDays(-30),
                UpdatedAt       = now.AddDays(-30),
            };
            db.Courses.Add(diegoCourse);

            var diegoLesson = new Lesson
            {
                Id               = Guid.NewGuid(),
                TeacherId        = teacherId,
                StudentId        = diego.Id,
                Title            = "Conditionals: Zero and First",
                Topic            = "Conditionals",
                Language         = "English",
                CefrLevel        = "B2",
                DurationMinutes  = 60,
                Status           = "Draft",
                IsDeleted        = false,
                CreatedAt        = now.AddDays(-14),
                UpdatedAt        = now.AddDays(-14),
            };
            db.Lessons.Add(diegoLesson);
            diegoLessonId = diegoLesson.Id;

            db.CurriculumEntries.AddRange(
                new CurriculumEntry { Id = Guid.NewGuid(), CourseId = diegoCourse.Id, OrderIndex = 1, Topic = "Conditionals: Zero and First",       GrammarFocus = "Conditional clauses", Competencies = "grammar,speaking", LessonType = "Grammar-focused", LessonId = diegoLesson.Id, Status = "taught",  IsDeleted = false },
                new CurriculumEntry { Id = Guid.NewGuid(), CourseId = diegoCourse.Id, OrderIndex = 2, Topic = "Conditionals: Second and Third",      GrammarFocus = "Conditional clauses", Competencies = "grammar,writing",  LessonType = "Grammar-focused", LessonId = null,            Status = "planned", IsDeleted = false },
                new CurriculumEntry { Id = Guid.NewGuid(), CourseId = diegoCourse.Id, OrderIndex = 3, Topic = "Academic Writing: Argument Structure", GrammarFocus = "Cohesion devices",   Competencies = "writing",          LessonType = "Writing",         LessonId = null,            Status = "planned", IsDeleted = false },
                new CurriculumEntry { Id = Guid.NewGuid(), CourseId = diegoCourse.Id, OrderIndex = 4, Topic = "Passive Voice and Nominalisation",     GrammarFocus = "Passive voice",       Competencies = "grammar,writing",  LessonType = "Grammar-focused", LessonId = null,            Status = "planned", IsDeleted = false }
            );
            await db.SaveChangesAsync();
        }
        else
        {
            var existingLesson = await db.Lessons
                .Where(l => l.StudentId == diego.Id && !l.IsDeleted)
                .OrderBy(l => l.CreatedAt)
                .Select(l => l.Id)
                .FirstOrDefaultAsync();
            diegoLessonId = existingLesson;
        }

        // Add session logs for Diego if not already present
        var logsExist = await db.SessionLogs.AnyAsync(s => s.StudentId == diego.Id && !s.IsDeleted);
        if (!logsExist)
        {
            db.SessionLogs.AddRange(
                new SessionLog
                {
                    Id                      = Guid.NewGuid(),
                    StudentId               = diego.Id,
                    TeacherId               = teacherId,
                    SessionDate             = now.AddDays(-3),
                    PlannedContent          = "Conditional sentences: zero and first conditional.",
                    ActualContent           = "Covered zero conditional fully. Introduced first conditional with examples.",
                    HomeworkAssigned        = "Write 5 sentences using first conditional.",
                    PreviousHomeworkStatus  = HomeworkStatus.NotApplicable,
                    NextSessionTopics       = "Second and third conditional",
                    GeneralNotes            = "Student is strong on reading, needs more speaking practice.",
                    TopicTags               = """["grammar","conditionals"]""",
                    Duration                = 60,
                    LinkedLessonId          = diegoLessonId != Guid.Empty ? diegoLessonId : null,
                    IsDeleted               = false,
                    CreatedAt               = now.AddDays(-3),
                    UpdatedAt               = now.AddDays(-3),
                },
                new SessionLog
                {
                    Id                      = Guid.NewGuid(),
                    StudentId               = diego.Id,
                    TeacherId               = teacherId,
                    SessionDate             = now.AddDays(-1),
                    PlannedContent          = "Second and third conditional.",
                    ActualContent           = "Reviewed first conditional homework. Taught second conditional with drill.",
                    HomeworkAssigned        = "Translate 5 sentences using second conditional.",
                    PreviousHomeworkStatus  = HomeworkStatus.Done,
                    NextSessionTopics       = "Third conditional and mixed conditionals",
                    GeneralNotes            = "Homework was excellent — all correct. Speed of production is improving.",
                    TopicTags               = """["grammar","conditionals"]""",
                    Duration                = 60,
                    IsDeleted               = false,
                    CreatedAt               = now.AddDays(-1),
                    UpdatedAt               = now.AddDays(-1),
                }
            );
            await db.SaveChangesAsync();
        }

        // Marco Seed — one session 20 days ago, no upcoming → "Inactive 20d" badge (amber) in students list
        var marcoSeedSessionsExist = await db.SessionLogs.AnyAsync(s => s.StudentId == marcoSeed.Id && !s.IsDeleted);
        if (!marcoSeedSessionsExist)
        {
            db.SessionLogs.Add(new SessionLog
            {
                Id                     = Guid.NewGuid(),
                StudentId              = marcoSeed.Id,
                TeacherId              = teacherId,
                SessionDate            = now.AddDays(-20),
                PlannedContent         = "Present simple for daily routines.",
                PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                Duration               = 60,
                IsDeleted              = false,
                IsCancelled            = false,
                CreatedAt              = now.AddDays(-20),
                UpdatedAt              = now.AddDays(-20),
            });
            await db.SaveChangesAsync();
        }

        // Eva Seed — EXAM signal (deadline within 6 weeks)
        var eva = await UpsertStudentAsync(db, teacherId, new Student
        {
            TeacherId           = teacherId,
            Name                = "Eva Seed",
            LearningLanguage    = "English",
            CefrLevel           = "A2",
            NativeLanguages     = """["French"]""",
            LearningGoals       = "[]",
            Interests           = "[]",
            Difficulties        = "[]",
            Weaknesses          = "[]",
            PersonalNotes       = "[scenario-seed]",
            IsActive            = true,
            ShortTermObjectives = $"[{{\"id\":\"o1\",\"text\":\"Pass A2 DELE exam\",\"targetDate\":\"{now.AddDays(28):yyyy-MM-dd}\"}}]",
        }, now);

        // Petra Seed — Returning signal (gap > 21 days, next session booked)
        var petra = await UpsertStudentAsync(db, teacherId, new Student
        {
            TeacherId        = teacherId,
            Name             = "Petra Seed",
            LearningLanguage = "English",
            CefrLevel        = "B1",
            NativeLanguages  = """["Czech"]""",
            LearningGoals    = "[]",
            Interests        = "[]",
            Difficulties     = "[]",
            Weaknesses       = "[]",
            PersonalNotes    = "[scenario-seed]",
            IsActive         = true,
        }, now);

        var petraSessionsExist = await db.SessionLogs.AnyAsync(s => s.StudentId == petra.Id && !s.IsDeleted);
        if (!petraSessionsExist)
        {
            db.SessionLogs.AddRange(
                new SessionLog
                {
                    Id                     = Guid.NewGuid(),
                    StudentId              = petra.Id,
                    TeacherId              = teacherId,
                    SessionDate            = now.AddDays(-25),
                    PlannedContent         = "Present perfect vs past simple.",
                    ActualContent          = "Covered key contrasts: finished time vs unspecified time. Practised with personal timeline stories.",
                    HomeworkAssigned       = "Write 5 sentences about recent life events using present perfect.",
                    NextSessionTopics      = "Review homework; introduce present perfect continuous",
                    GeneralNotes           = "Student returned after a long break — motivation is high. Retained the basics well but needs practice with irregular verbs.",
                    TopicTags              = """[{"tag":"Present perfect"},{"tag":"Past simple"}]""",
                    PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                    Duration               = 60,
                    IsDeleted              = false,
                    CreatedAt              = now.AddDays(-25),
                    UpdatedAt              = now.AddDays(-25),
                },
                new SessionLog
                {
                    Id                     = Guid.NewGuid(),
                    StudentId              = petra.Id,
                    TeacherId              = teacherId,
                    SessionDate            = now.AddDays(4),
                    PlannedContent         = "Review and catch-up session.",
                    PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                    IsDeleted              = false,
                    IsCancelled            = false,
                    CreatedAt              = now,
                    UpdatedAt              = now,
                }
            );
            await db.SaveChangesAsync();
        }

        // Hugo Seed — HMWK NOT DONE signal + Review pending badge
        var hugo = await UpsertStudentAsync(db, teacherId, new Student
        {
            TeacherId        = teacherId,
            Name             = "Hugo Seed",
            LearningLanguage = "English",
            CefrLevel        = "A1",
            NativeLanguages  = """["Dutch"]""",
            LearningGoals    = "[]",
            Interests        = "[]",
            Difficulties     = "[]",
            Weaknesses       = "[]",
            PersonalNotes    = "[scenario-seed]",
            IsActive         = true,
        }, now);

        var hugoTodoId = Guid.Parse("a1b2c3d4-0000-0000-0000-000000000011");
        if (!await db.TeacherFollowups.AnyAsync(f => f.Id == hugoTodoId))
            db.TeacherFollowups.Add(new TeacherFollowup { Id = hugoTodoId, TeacherId = teacherId, StudentId = hugo.Id, Text = "Check if introduction homework sentences were completed before next session", Status = "pending", Kind = TeacherFollowupKinds.Pedagogical, CreatedAt = new DateTime(2026, 4, 10, 10, 0, 0, DateTimeKind.Utc) });

        var hugoSessionsExist = await db.SessionLogs.AnyAsync(s => s.StudentId == hugo.Id && !s.IsDeleted);
        if (!hugoSessionsExist)
        {
            db.SessionLogs.AddRange(
                new SessionLog
                {
                    Id                     = Guid.NewGuid(),
                    StudentId              = hugo.Id,
                    TeacherId              = teacherId,
                    SessionDate            = now.AddDays(-3),
                    PlannedContent         = "Basic greetings and introductions.",
                    HomeworkAssigned       = "Write 5 sentences introducing yourself.",
                    PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                    Duration               = 60,
                    IsDeleted              = false,
                    CreatedAt              = now.AddDays(-3),
                    UpdatedAt              = now.AddDays(-3),
                },
                new SessionLog
                {
                    Id                     = Guid.NewGuid(),
                    StudentId              = hugo.Id,
                    TeacherId              = teacherId,
                    SessionDate            = now.AddDays(-5),
                    PlannedContent         = "Numbers and days of the week.",
                    PreviousHomeworkStatus = HomeworkStatus.NotDone,
                    Duration               = 60,
                    IsDeleted              = false,
                    CreatedAt              = now.AddDays(-5),
                    UpdatedAt              = now.AddDays(-5),
                }
            );
            await db.SaveChangesAsync();
        }
        // Ensure an upcoming draft session exists (fixed GUID allows idempotent upsert on persistent DBs)
        var hugoDraftSessionId = Guid.Parse("c1d2e3f4-0000-0003-0000-000000000001");
        if (!await db.SessionLogs.AnyAsync(sl => sl.Id == hugoDraftSessionId))
        {
            db.SessionLogs.Add(new SessionLog
            {
                Id                     = hugoDraftSessionId,
                StudentId              = hugo.Id,
                TeacherId              = teacherId,
                SessionDate            = now.AddDays(6),
                PlannedContent         = "Colors and clothing vocabulary.",
                PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                Status                 = SessionLogStatus.Draft,
                Duration               = 60,
                IsDeleted              = false,
                CreatedAt              = now,
                UpdatedAt              = now,
            });
            await db.SaveChangesAsync();
        }

        // Nataliya Seed — Cancelled 2x signal; clean data (no test artifacts)
        var nataliya = await UpsertStudentAsync(db, teacherId, new Student
        {
            TeacherId          = teacherId,
            Name               = "Nataliya Seed",
            LearningLanguage   = "Spanish",
            CefrLevel          = "A2",
            NativeLanguages    = """["Ukrainian"]""",
            LearningGoals      = """["Travel to Spain", "Improve everyday Spanish vocabulary"]""",
            Interests          = """["travel","cooking","cinema"]""",
            Difficulties       = "[]",
            Weaknesses         = "[]",
            PersonalNotes      = "[scenario-seed]",
            ReasonForStudying  = "Planning a trip to Spain and wants to communicate confidently.",
            IsActive           = true,
        }, now);

        var nataliyaSessionsExist = await db.SessionLogs.AnyAsync(s => s.StudentId == nataliya.Id && !s.IsDeleted);
        if (!nataliyaSessionsExist)
        {
            db.SessionLogs.Add(new SessionLog
            {
                Id                     = Guid.NewGuid(),
                StudentId              = nataliya.Id,
                TeacherId              = teacherId,
                SessionDate            = now.AddDays(-20),
                PlannedContent         = "Greetings and asking for directions in Spanish.",
                PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                Duration               = 60,
                IsCancelled            = true,
                IsDeleted              = false,
                CreatedAt              = now.AddDays(-20),
                UpdatedAt              = now.AddDays(-20),
            });
            await db.SaveChangesAsync();
        }
        // Ensure a recent cancelled session exists (fixed GUID allows idempotent upsert on persistent DBs)
        var nataliyaRecentCancelledId = Guid.Parse("c1d2e3f4-0000-0001-0000-000000000001");
        if (!await db.SessionLogs.AnyAsync(sl => sl.Id == nataliyaRecentCancelledId))
        {
            db.SessionLogs.Add(new SessionLog
            {
                Id                     = nataliyaRecentCancelledId,
                StudentId              = nataliya.Id,
                TeacherId              = teacherId,
                SessionDate            = now.AddDays(-4),
                PlannedContent         = "Numbers, dates, and telling the time.",
                PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                Duration               = 60,
                IsCancelled            = true,
                IsDeleted              = false,
                CreatedAt              = now.AddDays(-4),
                UpdatedAt              = now.AddDays(-4),
            });
            await db.SaveChangesAsync();
        }

        // Clara Seed — second Cancelled 2x student
        var claraSessionsExist = await db.SessionLogs.AnyAsync(s => s.StudentId == clara.Id && !s.IsDeleted);
        if (!claraSessionsExist)
        {
            db.SessionLogs.Add(new SessionLog
            {
                Id                     = Guid.NewGuid(),
                StudentId              = clara.Id,
                TeacherId              = teacherId,
                SessionDate            = now.AddDays(-18),
                PlannedContent         = "Basic Spanish greetings and alphabet.",
                PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                Duration               = 60,
                IsCancelled            = true,
                IsDeleted              = false,
                CreatedAt              = now.AddDays(-18),
                UpdatedAt              = now.AddDays(-18),
            });
            await db.SaveChangesAsync();
        }
        // Ensure a recent cancelled session exists (fixed GUID allows idempotent upsert on persistent DBs)
        var claraRecentCancelledId = Guid.Parse("c1d2e3f4-0000-0002-0000-000000000001");
        if (!await db.SessionLogs.AnyAsync(sl => sl.Id == claraRecentCancelledId))
        {
            db.SessionLogs.Add(new SessionLog
            {
                Id                     = claraRecentCancelledId,
                StudentId              = clara.Id,
                TeacherId              = teacherId,
                SessionDate            = now.AddDays(-3),
                PlannedContent         = "Numbers and simple questions in Spanish.",
                PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                Duration               = 60,
                IsCancelled            = true,
                IsDeleted              = false,
                CreatedAt              = now.AddDays(-3),
                UpdatedAt              = now.AddDays(-3),
            });
            await db.SaveChangesAsync();
        }

        // Diego Seed — add upcoming session to achieve clean state (last session 7 days ago + next session)
        var diegoUpcomingExists = await db.SessionLogs.AnyAsync(
            s => s.StudentId == diego.Id && !s.IsDeleted && !s.IsCancelled && s.SessionDate > now);
        if (!diegoUpcomingExists)
        {
            db.SessionLogs.Add(new SessionLog
            {
                Id                     = Guid.NewGuid(),
                StudentId              = diego.Id,
                TeacherId              = teacherId,
                SessionDate            = now.AddDays(5),
                PlannedContent         = "Third conditional and mixed conditionals.",
                PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                IsDeleted              = false,
                IsCancelled            = false,
                CreatedAt              = now,
                UpdatedAt              = now,
            });
            await db.SaveChangesAsync();
        }

        // Eva Seed — add recent + upcoming sessions for second clean state student
        var evaSessionsExist = await db.SessionLogs.AnyAsync(s => s.StudentId == eva.Id && !s.IsDeleted);
        if (!evaSessionsExist)
        {
            db.SessionLogs.AddRange(
                new SessionLog
                {
                    Id                     = Guid.NewGuid(),
                    StudentId              = eva.Id,
                    TeacherId              = teacherId,
                    SessionDate            = now.AddDays(-3),
                    PlannedContent         = "A2 vocabulary for everyday situations.",
                    PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                    Duration               = 60,
                    IsDeleted              = false,
                    IsCancelled            = false,
                    CreatedAt              = now.AddDays(-3),
                    UpdatedAt              = now.AddDays(-3),
                },
                new SessionLog
                {
                    Id                     = Guid.NewGuid(),
                    StudentId              = eva.Id,
                    TeacherId              = teacherId,
                    SessionDate            = now.AddDays(5),
                    PlannedContent         = "Exam practice: listening and reading exercises.",
                    PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                    IsDeleted              = false,
                    IsCancelled            = false,
                    CreatedAt              = now,
                    UpdatedAt              = now,
                }
            );
            await db.SaveChangesAsync();
        }

        await SeedTeacherFollowupsAsync(db, teacherId, logger);

        logger.LogInformation("Scenario students seeded (Ana Seed, Marco Seed, Clara Seed, Diego Seed, Eva Seed, Petra Seed, Hugo Seed, Nataliya Seed).");
    }

    private const string AnaVisualDifficulties =
        """[{"id":"av1","description":"Separable vs inseparable phrasal verbs","competency":"Grammar","subcategory":"Phrasal verbs","severity":"medium","status":"Active","trend":"stable"},{"id":"av2","description":"Travel collocations","competency":"Vocabulary","subcategory":"Travel","severity":"low","status":"Active","trend":"improving"},{"id":"av3","description":"Word stress in multi-syllable words","competency":"Pronunciation","subcategory":"Word stress","severity":"medium","status":"Active","trend":"stable"}]""";

    private static async Task EnsureAnaVisualDifficultiesAsync(AppDbContext db, Guid teacherId, ILogger logger)
    {
        var anaVisual = await db.Students.FirstOrDefaultAsync(
            s => s.TeacherId == teacherId && s.Name == "Ana Visual" && !s.IsDeleted);
        if (anaVisual is null || anaVisual.Difficulties == AnaVisualDifficulties) return;

        anaVisual.Difficulties = AnaVisualDifficulties;
        anaVisual.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        logger.LogInformation("Ana Visual difficulties backfilled.");
    }

    private const string AnaVisualLearningGoals      = """["Pass DELE B1 exam","Improve conversational fluency for travel"]""";
    private const string AnaVisualShortTermObjectives = """[{"id":"o1","text":"Complete B1 grammar review by June 2026","targetDate":"2026-06-01"}]""";
    private const string AnaVisualSkillLevelOverrides = """{"Reading":"B2","Speaking":"B1","Writing":"A2","Listening":"B1"}""";
    private const string AnaVisualSpokenLanguages     = """["English"]""";
    private const string DiegoSkillLevelOverrides     = """{"Reading":"B2","Speaking":"B1","Writing":"A2","Listening":"B1"}""";

    private static async Task EnsureAnaVisualExtrasAsync(AppDbContext db, Guid teacherId, ILogger logger)
    {
        var anaVisual = await db.Students.FirstOrDefaultAsync(
            s => s.TeacherId == teacherId && s.Name == "Ana Visual" && !s.IsDeleted);
        if (anaVisual is null) return;

        const string AnaVisualNativeLanguages = """["Portuguese","Ukrainian"]""";

        if (anaVisual.LearningGoals      == AnaVisualLearningGoals &&
            anaVisual.ShortTermObjectives == AnaVisualShortTermObjectives &&
            anaVisual.SkillLevelOverrides == AnaVisualSkillLevelOverrides &&
            anaVisual.NativeLanguages     == AnaVisualNativeLanguages &&
            anaVisual.SpokenLanguages     == AnaVisualSpokenLanguages) return;

        anaVisual.LearningGoals      = AnaVisualLearningGoals;
        anaVisual.ShortTermObjectives = AnaVisualShortTermObjectives;
        anaVisual.SkillLevelOverrides = AnaVisualSkillLevelOverrides;
        anaVisual.NativeLanguages     = AnaVisualNativeLanguages;
        anaVisual.SpokenLanguages     = AnaVisualSpokenLanguages;
        anaVisual.UpdatedAt           = DateTime.UtcNow;
        await db.SaveChangesAsync();
        logger.LogInformation("Ana Visual goals, skill overrides, native languages, and spoken languages backfilled.");
    }

    private static async Task EnsureAnaVisualNameAsync(AppDbContext db, Guid teacherId, ILogger logger)
    {
        var corrupted = await db.Students
            .Where(s => s.TeacherId == teacherId && s.Name.StartsWith("Ana Visual") && s.Name != "Ana Visual" && !s.IsDeleted)
            .ToListAsync();
        if (corrupted.Count == 0) return;

        foreach (var s in corrupted)
        {
            s.Name = "Ana Visual";
            s.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        logger.LogInformation("Corrected {Count} corrupted 'Ana Visual*' name(s) to 'Ana Visual'.", corrupted.Count);
    }

    private static async Task SeedAnaVisualSessionLogAsync(AppDbContext db, Guid teacherId, ILogger logger)
    {
        var anaVisual = await db.Students.FirstOrDefaultAsync(
            s => s.TeacherId == teacherId && s.Name == "Ana Visual" && !s.IsDeleted);
        if (anaVisual is null) return;

        var logExists = await db.SessionLogs.AnyAsync(s => s.StudentId == anaVisual.Id && !s.IsDeleted);
        if (logExists) return;

        var now = DateTime.UtcNow;
        db.SessionLogs.Add(new SessionLog
        {
            Id                       = Guid.NewGuid(),
            StudentId                = anaVisual.Id,
            TeacherId                = teacherId,
            SessionDate              = now.AddDays(-1),
            PlannedContent           = "Phrasal verbs in travel contexts and reading comprehension.",
            ActualContent            = "Practised 12 travel phrasal verbs; read a passage about airport experiences.",
            HomeworkAssigned         = "Write a short paragraph using at least 5 phrasal verbs from today.",
            PreviousHomeworkStatus   = HomeworkStatus.Done,
            NextSessionTopics        = "Collocations with travel vocabulary",
            GeneralNotes             = "Student struggles with separable vs inseparable phrasal verbs. Good effort overall.",
            TopicTags                = """["vocabulary","phrasal verbs"]""",
            MentionedDifficultyPairs = """[{"competency":"Grammar","subcategory":"Phrasal verbs"},{"competency":"Vocabulary","subcategory":"Travel"}]""",
            SuggestedDifficulties    = """[{"description":"Confuses separable and inseparable phrasal verbs","competency":"Grammar","subcategory":"Phrasal verbs","severity":"medium"}]""",
            IsDeleted                = false,
            CreatedAt                = now.AddDays(-1),
            UpdatedAt                = now.AddDays(-1),
        });
        await db.SaveChangesAsync();
        logger.LogInformation("Ana Visual session log seeded.");
    }

    private const string FollowupSeedAnaText = "Follow up on Ana's job interview preparation";

    private static async Task SeedTeacherFollowupsAsync(AppDbContext db, Guid teacherId, ILogger logger)
    {
        var alreadySeeded = await db.TeacherFollowups.AnyAsync(
            f => f.TeacherId == teacherId && f.Text == FollowupSeedAnaText);
        if (alreadySeeded) return;

        var now = DateTime.UtcNow;
        db.TeacherFollowups.AddRange(
            new TeacherFollowup
            {
                Id        = Guid.NewGuid(),
                TeacherId = teacherId,
                Text      = FollowupSeedAnaText,
                Status    = "pending",
                CreatedAt = now,
            },
            new TeacherFollowup
            {
                Id        = Guid.NewGuid(),
                TeacherId = teacherId,
                Text      = "Check Diego's essay draft and give written feedback",
                Status    = "pending",
                CreatedAt = now.AddDays(-1),
            },
            new TeacherFollowup
            {
                Id        = Guid.NewGuid(),
                TeacherId = teacherId,
                Text      = "Send Marco extra vocabulary exercises for daily routines",
                Status    = "pending",
                CreatedAt = now.AddDays(-2),
            },
            new TeacherFollowup
            {
                Id        = Guid.NewGuid(),
                TeacherId = teacherId,
                Text      = "Review Clara's progress and plan next unit",
                Status    = "pending",
                CreatedAt = now.AddDays(-7),
            }
        );
        await db.SaveChangesAsync();
        logger.LogInformation("Teacher followups seeded: 4 entries across four age bands (today, -1d, -2d, -7d).");
    }

    // -------------------------------------------------------------------------
    // Large roster — 30 realistic students (Eastern European, learning Spanish)
    // Tagged [roster-seed]; idempotent via tag guard.
    // -------------------------------------------------------------------------

    private static async Task SeedLargeRosterAsync(AppDbContext db, Guid teacherId, ILogger logger)
    {
        var rosterSeeded = await db.Students.AnyAsync(s => s.TeacherId == teacherId && s.PersonalNotes == RosterTag);
        if (rosterSeeded)
        {
            logger.LogInformation("Large roster already seeded for teacher — skipping.");
            return;
        }

        var now = DateTime.UtcNow;

        var roster = new List<Student>
        {
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Nataliya",  LearningLanguage = "Spanish", CefrLevel = "A2", NativeLanguages = """["Ukrainian"]""",   PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Kateryna",  LearningLanguage = "Spanish", CefrLevel = "B1", NativeLanguages = """["Ukrainian"]""",   PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Oksana",    LearningLanguage = "Spanish", CefrLevel = "A1", NativeLanguages = """["Ukrainian"]""",   PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Olha",      LearningLanguage = "Spanish", CefrLevel = "B2", NativeLanguages = """["Ukrainian"]""",   PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Iryna",     LearningLanguage = "Spanish", CefrLevel = "A2", NativeLanguages = """["Ukrainian"]""",   PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Svitlana",  LearningLanguage = "Spanish", CefrLevel = "B1", NativeLanguages = """["Ukrainian"]""",   PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Yana",      LearningLanguage = "Spanish", CefrLevel = "B1", NativeLanguages = """["Bulgarian"]""",   PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Gergana",   LearningLanguage = "Spanish", CefrLevel = "A2", NativeLanguages = """["Bulgarian"]""",   PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Milena",    LearningLanguage = "Spanish", CefrLevel = "B2", NativeLanguages = """["Bulgarian"]""",   PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Ralitsa",   LearningLanguage = "Spanish", CefrLevel = "A2", NativeLanguages = """["Bulgarian"]""",   PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Kristina",  LearningLanguage = "Spanish", CefrLevel = "B1", NativeLanguages = """["Bulgarian"]""",   PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Natasha",   LearningLanguage = "Spanish", CefrLevel = "A2", NativeLanguages = """["Russian"]""",     PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Alina",     LearningLanguage = "Spanish", CefrLevel = "B1", NativeLanguages = """["Russian"]""",     PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Darya",     LearningLanguage = "Spanish", CefrLevel = "A2", NativeLanguages = """["Russian"]""",     PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Irina",     LearningLanguage = "Spanish", CefrLevel = "B2", NativeLanguages = """["Russian"]""",     PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Anna",      LearningLanguage = "Spanish", CefrLevel = "B1", NativeLanguages = """["Polish"]""",      PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Marta",     LearningLanguage = "Spanish", CefrLevel = "A2", NativeLanguages = """["Polish"]""",      PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Monika",    LearningLanguage = "Spanish", CefrLevel = "B2", NativeLanguages = """["Polish"]""",      PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Joanna",    LearningLanguage = "Spanish", CefrLevel = "A2", NativeLanguages = """["Polish"]""",      PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Agnieszka", LearningLanguage = "Spanish", CefrLevel = "B1", NativeLanguages = """["Polish"]""",      PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Zuzana",    LearningLanguage = "Spanish", CefrLevel = "A2", NativeLanguages = """["Slovak"]""",      PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Jana",      LearningLanguage = "Spanish", CefrLevel = "B1", NativeLanguages = """["Czech"]""",       PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Elena",     LearningLanguage = "Spanish", CefrLevel = "A2", NativeLanguages = """["Romanian"]""",    PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Noemi",     LearningLanguage = "Spanish", CefrLevel = "B1", NativeLanguages = """["Romanian"]""",    PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Karolina",  LearningLanguage = "Spanish", CefrLevel = "A2", NativeLanguages = """["Hungarian"]""",   PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Maria",     LearningLanguage = "Spanish", CefrLevel = "B1", NativeLanguages = """["Greek"]""",       PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Jelena",    LearningLanguage = "Spanish", CefrLevel = "B2", NativeLanguages = """["Serbian"]""",     PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Inga",      LearningLanguage = "Spanish", CefrLevel = "A2", NativeLanguages = """["Lithuanian"]""",  PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Kristine",  LearningLanguage = "Spanish", CefrLevel = "B1", NativeLanguages = """["Latvian"]""",     PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
            new() { Id = Guid.NewGuid(), TeacherId = teacherId, Name = "Aino",      LearningLanguage = "Spanish", CefrLevel = "A2", NativeLanguages = """["Estonian"]""",    PersonalNotes = RosterTag, IsActive = true, CreatedAt = now, UpdatedAt = now },
        };

        db.Students.AddRange(roster);
        await db.SaveChangesAsync();
        logger.LogInformation("Large roster seeded: {Count} students with L1 data.", roster.Count);
    }

    private static async Task<Student> UpsertStudentAsync(AppDbContext db, Guid teacherId, Student incoming, DateTime now)
    {
        var existing = await db.Students.FirstOrDefaultAsync(
            s => s.TeacherId == teacherId && s.Name == incoming.Name && !s.IsDeleted);

        if (existing is not null)
        {
            existing.LearningLanguage      = incoming.LearningLanguage;
            existing.CefrLevel             = incoming.CefrLevel;
            existing.NativeLanguages       = incoming.NativeLanguages;
            existing.LearningGoals         = incoming.LearningGoals;
            existing.Interests             = incoming.Interests;
            existing.Difficulties          = incoming.Difficulties;
            existing.Weaknesses            = incoming.Weaknesses;
            existing.PersonalNotes         = incoming.PersonalNotes;
            existing.TeachingNotes         = incoming.TeachingNotes;
            existing.SkillLevelOverrides   = incoming.SkillLevelOverrides;
            existing.BirthYear             = incoming.BirthYear;
            existing.Profession            = incoming.Profession;
            existing.CountryOfOrigin       = incoming.CountryOfOrigin;
            existing.CityOfOrigin          = incoming.CityOfOrigin;
            existing.CountryOfResidence    = incoming.CountryOfResidence;
            existing.CityOfResidence       = incoming.CityOfResidence;
            existing.ReasonForStudying     = incoming.ReasonForStudying;
            existing.OfficialCefrLevel     = incoming.OfficialCefrLevel;
            existing.ShortTermObjectives   = incoming.ShortTermObjectives;
            existing.IsActive              = incoming.IsActive;
            existing.IsCorporate           = incoming.IsCorporate;
            existing.Rate                  = incoming.Rate;
            existing.SpokenLanguages       = incoming.SpokenLanguages;
            existing.UpdatedAt             = now;
            return existing;
        }

        incoming.Id        = Guid.NewGuid();
        incoming.CreatedAt = now;
        incoming.UpdatedAt = now;
        db.Students.Add(incoming);
        await db.SaveChangesAsync();
        return incoming;
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
