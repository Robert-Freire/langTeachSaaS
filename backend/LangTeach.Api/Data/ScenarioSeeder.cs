using LangTeach.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Data;

/// <summary>
/// Idempotent dashboard scenario seeder for dev/review use.
/// Each call: wipe-then-reseed the 9 scenario students' sessions, followups, and todos.
/// Does NOT touch DemoSeeder, production seeding paths, or any other students.
/// </summary>
public static class ScenarioSeeder
{
    private const string ScenarioTag           = "[scenario-seed]";
    private const string DiegoSkillLevelOverrides = """{"Reading":"B2","Speaking":"B1","Writing":"A2","Listening":"B1"}""";

    // All students whose sessions, followups, and todos are managed by this seeder.
    // Ana Visual, Ana Seed, Marco Seed, Clara Seed, Diego Seed already exist after --visual-seed.
    // Marco B1, Carmen C1, Nadia B2, Hans B1 are created on first run.
    // Rui Seed, Sofia Seed, Sonia Seed created on first run (scenario 5 signal coverage).
    private static readonly (string Name, string Cefr, string NativeLang, string LearningLang, TeachingChannel? Channel)[] ScenarioStudentDefs =
    [
        ("Ana Visual",  "B2", """["Ukrainian"]""",   "English", TeachingChannel.Preply),
        ("Marco B1",    "B1", """["Italian"]""",     "English", TeachingChannel.Meet),
        ("Carmen C1",   "C1", """["Spanish"]""",     "English", TeachingChannel.Presencial),
        ("Nadia B2",    "B2", """["French"]""",      "English", null),
        ("Hans B1",     "B1", """["German"]""",      "English", null),
        ("Ana Seed",    "B1", """["Portuguese"]""",  "English", null),
        ("Marco Seed",  "A2", """["Italian"]""",     "English", null),
        ("Clara Seed",  "A1", """["German"]""",      "Spanish", null),
        ("Diego Seed",  "B2", """["Spanish"]""",     "English", null),
        ("Rui Seed",    "A2", """["Romanian"]""",    "English", null),
        ("Sofia Seed",  "B2", """["Portuguese"]""",  "English", null),
        ("Sonia Seed",  "B1", """["Greek"]""",       "English", null),
    ];

    public static async Task<bool> SeedScenarioAsync(AppDbContext db, int scenario, string teacherLookup, ILogger logger)
    {
        if (scenario < 1 || scenario > 7)
        {
            logger.LogError("Invalid scenario {Scenario}. Valid range: 1-7.", scenario);
            return false;
        }

        if (string.IsNullOrWhiteSpace(teacherLookup))
        {
            logger.LogError("Teacher lookup is required. Pass an Auth0 user ID or email.");
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

        var now = DateTime.UtcNow;

        if (!teacher.IsApproved || !teacher.HasCompletedOnboarding)
        {
            teacher.IsApproved = true;
            teacher.HasCompletedOnboarding = true;
            teacher.UpdatedAt = now;
        }
        logger.LogInformation("Seeding scenario {Scenario} for teacher {Email}...", scenario, teacher.Email);

        // Step 1: ensure all 9 scenario students exist
        var students = await EnsureScenarioStudentsAsync(db, teacher.Id, now);

        // Step 2: wipe sessions, followups, todos for the 9 students (full reset)
        await WipeAsync(db, teacher.Id, students.Select(s => s.Id).ToArray(), now, logger);

        // Step 3: seed data for the requested scenario
        await SeedAsync(db, teacher.Id, students, scenario, now, logger);

        logger.LogInformation("Scenario {Scenario} seeded successfully.", scenario);
        return true;
    }

    // -------------------------------------------------------------------------
    // Student bootstrap
    // -------------------------------------------------------------------------

    private static async Task<List<Student>> EnsureScenarioStudentsAsync(AppDbContext db, Guid teacherId, DateTime now)
    {
        var result = new List<Student>();

        foreach (var (name, cefr, nativeLang, learningLang, channel) in ScenarioStudentDefs)
        {
            var student = await db.Students.FirstOrDefaultAsync(
                s => s.TeacherId == teacherId && s.Name == name && !s.IsDeleted);

            if (student is null)
            {
                student = new Student
                {
                    Id               = Guid.NewGuid(),
                    TeacherId        = teacherId,
                    Name             = name,
                    LearningLanguage = learningLang,
                    CefrLevel        = cefr,
                    NativeLanguages  = nativeLang,
                    PersonalNotes    = ScenarioTag,
                    IsActive         = true,
                    TeachingChannel  = channel,
                    CreatedAt        = now,
                    UpdatedAt        = now,
                };
                db.Students.Add(student);
                await db.SaveChangesAsync();
            }

            result.Add(student);
        }

        return result;
    }

    // -------------------------------------------------------------------------
    // Wipe — runs before every scenario to guarantee idempotency.
    // Deletes ALL sessions for the 9 students and ALL teacher followups (regardless
    // of student) so that every scenario starts from a fully clean state. This is
    // intentional: the tool is a complete DB state switcher for a dev/review teacher.
    // -------------------------------------------------------------------------

    private static async Task WipeAsync(AppDbContext db, Guid teacherId, Guid[] studentIds, DateTime now, ILogger logger)
    {
        var sessions = await db.SessionLogs.Where(sl => studentIds.Contains(sl.StudentId)).ToListAsync();
        db.SessionLogs.RemoveRange(sessions);

        var followups = await db.TeacherFollowups.Where(f => f.TeacherId == teacherId).ToListAsync();
        db.TeacherFollowups.RemoveRange(followups);

        var students = await db.Students.Where(s => studentIds.Contains(s.Id)).ToListAsync();
        foreach (var s in students)
        {
            s.ShortTermObjectives = "[]";
            s.Difficulties        = "[]";
            s.TeachingNotes       = null;
            s.SkillLevelOverrides = "{}";
            s.UpdatedAt           = now;
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Wiped {Sessions} sessions and {Followups} followups for scenario students.",
            sessions.Count, followups.Count);
    }

    // -------------------------------------------------------------------------
    // Scenario dispatch
    // -------------------------------------------------------------------------

    private static async Task SeedAsync(AppDbContext db, Guid teacherId, List<Student> students,
        int scenario, DateTime now, ILogger logger)
    {
        // Students ordered as defined in ScenarioStudentDefs
        var anaVisual  = students[0];
        var marcoB1    = students[1];
        var carmenC1   = students[2];
        var nadiaB2    = students[3];
        var hansB1     = students[4];
        var anaSeed    = students[5];
        var marcoSeed  = students[6];
        var claraSeed  = students[7];
        var diegoSeed  = students[8];
        var ruiSeed    = students[9];
        var sofiaSeed  = students[10];
        var soniaSeed  = students[11];

        switch (scenario)
        {
            case 1: await SeedScenario1Async(db, teacherId, anaVisual,  now, logger); break;
            case 2: await SeedScenario2Async(db, teacherId, marcoB1, anaVisual, now, logger); break;
            case 3: SeedScenario3(logger); break;
            case 4: await SeedScenario4Async(db, teacherId, nadiaB2, now, logger); break;
            case 5: await SeedScenario5Async(db, teacherId, anaSeed, marcoSeed, claraSeed, diegoSeed, ruiSeed, sofiaSeed, soniaSeed, now, logger); break;
            case 6: await SeedScenario6Async(db, teacherId, hansB1, now, logger); break;
            case 7: await SeedScenario7Async(db, teacherId, anaVisual, marcoB1, now, logger); break;
        }
    }

    // -------------------------------------------------------------------------
    // Scenario 1 — "Class in 20 minutes" (Ana Visual)
    // Hero: "IN 20 MIN" badge · planned strip · full briefing card · "Partial" homework card
    // Agenda: 3 rows with NEXT highlight
    // -------------------------------------------------------------------------

    private static async Task SeedScenario1Async(AppDbContext db, Guid teacherId, Student anaVisual,
        DateTime now, ILogger logger)
    {
        // Past session (earlier today): populates briefing card sub-sections
        var pastSession = new SessionLog
        {
            Id                     = Guid.NewGuid(),
            StudentId              = anaVisual.Id,
            TeacherId              = teacherId,
            SessionDate            = now.Date.AddHours(8), // 08:00 today
            TopicTags              = """[{"tag":"Pretérito indefinido"},{"tag":"Verbos reflexivos"}]""",
            GeneralNotes           = "Good session, student struggled with reflexive verbs in past tense",
            HomeworkAssigned       = "Write 10 sentences using reflexive verbs in past tense",
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            Duration               = 60,
            IsDeleted              = false,
            CreatedAt              = now.Date.AddHours(8),
            UpdatedAt              = now.Date.AddHours(8),
        };
        db.SessionLogs.Add(pastSession);
        await db.SaveChangesAsync();

        // Followup linked to the past session (populates "Promises made" in briefing)
        db.TeacherFollowups.Add(new TeacherFollowup
        {
            Id                 = Guid.NewGuid(),
            TeacherId          = teacherId,
            StudentId          = anaVisual.Id,
            Text               = "Send link to reflexive verb exercises",
            Status             = TeacherFollowupStatuses.Pending,
            SourceSessionLogId = pastSession.Id,
            CreatedAt          = pastSession.SessionDate!.Value,
        });

        // NEXT session (now + 20 min): hero shows "IN 20 MIN" badge
        db.SessionLogs.Add(new SessionLog
        {
            Id                     = Guid.NewGuid(),
            StudentId              = anaVisual.Id,
            TeacherId              = teacherId,
            SessionDate            = now.AddMinutes(20),
            PlannedContent         = "Review homework + introduce imperfecto",
            HomeworkAssigned       = "Complete exercises 3.1-3.4 in workbook",
            PreviousHomeworkStatus = HomeworkStatus.Partial,
            IsDeleted              = false,
            CreatedAt              = now,
            UpdatedAt              = now,
        });

        // Third session later today: 3rd agenda row
        db.SessionLogs.Add(new SessionLog
        {
            Id                     = Guid.NewGuid(),
            StudentId              = anaVisual.Id,
            TeacherId              = teacherId,
            SessionDate            = now.Date.AddHours(18), // 18:00 today
            PlannedContent         = "Grammar consolidation: imperfecto vs indefinido",
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            IsDeleted              = false,
            CreatedAt              = now,
            UpdatedAt              = now,
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Scenario 1 seeded: Ana Visual, IN 20 MIN, 3 agenda rows, full briefing, Partial homework.");
    }

    // -------------------------------------------------------------------------
    // Scenario 2 — "Session this week, quiet day" (Marco B1)
    // Hero: zinc "IN 3D" · planned strip only (no briefing) · this-week agenda · "2D OLD" followup
    // -------------------------------------------------------------------------

    private static async Task SeedScenario2Async(AppDbContext db, Guid teacherId, Student marcoB1,
        Student anaVisual, DateTime now, ILogger logger)
    {
        // Marco B1 session in 3 days — hero (no past sessions → briefing invisible)
        db.SessionLogs.Add(new SessionLog
        {
            Id                     = Guid.NewGuid(),
            StudentId              = marcoB1.Id,
            TeacherId              = teacherId,
            SessionDate            = now.Date.AddDays(3).AddHours(10),
            PlannedContent         = "Subjuntivo en oraciones temporales",
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            IsDeleted              = false,
            CreatedAt              = now,
            UpdatedAt              = now,
        });

        // Ana Visual session in 4 days — second entry in this-week list
        db.SessionLogs.Add(new SessionLog
        {
            Id                     = Guid.NewGuid(),
            StudentId              = anaVisual.Id,
            TeacherId              = teacherId,
            SessionDate            = now.Date.AddDays(4).AddHours(10),
            PlannedContent         = "Travel vocabulary review",
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            IsDeleted              = false,
            CreatedAt              = now,
            UpdatedAt              = now,
        });

        // Standalone followup created 2 days ago → "2D OLD" amber badge
        db.TeacherFollowups.Add(new TeacherFollowup
        {
            Id        = Guid.NewGuid(),
            TeacherId = teacherId,
            StudentId = marcoB1.Id,
            Text      = "Check Marco has textbook chapter 4 before next session",
            Status    = TeacherFollowupStatuses.Pending,
            CreatedAt = now.AddDays(-2),
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Scenario 2 seeded: Marco B1 in 3 days, this-week fallback, 2D OLD followup.");
    }

    // -------------------------------------------------------------------------
    // Scenario 3 — "Nothing scheduled" (Carmen C1)
    // Hero: "No sessions scheduled" · Agenda: "No sessions this week" · Followups: "All caught up"
    // No data to seed — all students' sessions and followups were wiped in step 2.
    // -------------------------------------------------------------------------

    private static void SeedScenario3(ILogger logger)
    {
        logger.LogInformation("Scenario 3 seeded: all empty states (no sessions, no followups).");
    }

    // -------------------------------------------------------------------------
    // Scenario 4 — "Overdue followups" (Nadia B2)
    // Followup zone: green "TODAY" · amber "2D OLD" · red "7D OVERDUE"
    // -------------------------------------------------------------------------

    private static async Task SeedScenario4Async(AppDbContext db, Guid teacherId, Student nadiaB2,
        DateTime now, ILogger logger)
    {
        db.TeacherFollowups.AddRange(
            new TeacherFollowup
            {
                Id        = Guid.NewGuid(),
                TeacherId = teacherId,
                StudentId = nadiaB2.Id,
                Text      = "Check Nadia completed the listening exercises",
                Status    = TeacherFollowupStatuses.Pending,
                CreatedAt = now, // today → green "TODAY"
            },
            new TeacherFollowup
            {
                Id        = Guid.NewGuid(),
                TeacherId = teacherId,
                StudentId = nadiaB2.Id,
                Text      = "Send Nadia the verb conjugation reference sheet",
                Status    = TeacherFollowupStatuses.Pending,
                CreatedAt = now.AddDays(-2), // 2 days ago → amber "2D OLD"
            },
            new TeacherFollowup
            {
                Id        = Guid.NewGuid(),
                TeacherId = teacherId,
                StudentId = nadiaB2.Id,
                Text      = "Follow up on Nadia's pronunciation practice plan",
                Status    = TeacherFollowupStatuses.Pending,
                CreatedAt = now.AddDays(-7), // 7 days ago → red "7D OVERDUE"
            }
        );

        await db.SaveChangesAsync();
        logger.LogInformation("Scenario 4 seeded: 3 followups with TODAY / 2D OLD / 7D OVERDUE badges.");
    }

    // -------------------------------------------------------------------------
    // Scenario 5 — "Roster signals" (Ana Seed, Marco Seed, Clara Seed, Diego Seed)
    // Signals: Cancelled 2x · Inactive 20d · Review pending · no signal
    // -------------------------------------------------------------------------

    private static async Task SeedScenario5Async(AppDbContext db, Guid teacherId,
        Student anaSeed, Student marcoSeed, Student claraSeed, Student diegoSeed,
        Student ruiSeed, Student sofiaSeed, Student soniaSeed,
        DateTime now, ILogger logger)
    {
        // Ana Seed: Cancelled 2x (2 cancelled sessions in last 30 days)
        db.SessionLogs.AddRange(
            new SessionLog
            {
                Id                     = Guid.NewGuid(),
                StudentId              = anaSeed.Id,
                TeacherId              = teacherId,
                SessionDate            = now.AddDays(-20),
                PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                IsCancelled            = true,
                IsDeleted              = false,
                CreatedAt              = now.AddDays(-20),
                UpdatedAt              = now.AddDays(-20),
            },
            new SessionLog
            {
                Id                     = Guid.NewGuid(),
                StudentId              = anaSeed.Id,
                TeacherId              = teacherId,
                SessionDate            = now.AddDays(-10),
                PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                IsCancelled            = true,
                IsDeleted              = false,
                CreatedAt              = now.AddDays(-10),
                UpdatedAt              = now.AddDays(-10),
            }
        );

        // Marco Seed: Inactive 20d (last session 20 days ago, no next session)
        db.SessionLogs.Add(new SessionLog
        {
            Id                     = Guid.NewGuid(),
            StudentId              = marcoSeed.Id,
            TeacherId              = teacherId,
            SessionDate            = now.AddDays(-20),
            PlannedContent         = "Daily routines vocabulary",
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            IsDeleted              = false,
            IsCancelled            = false,
            CreatedAt              = now.AddDays(-20),
            UpdatedAt              = now.AddDays(-20),
        });

        // Clara Seed: Review pending (1 pending teaching todo)
        db.TeacherFollowups.Add(new TeacherFollowup
        {
            Id = Guid.NewGuid(), TeacherId = teacherId, StudentId = claraSeed.Id,
            Text = "Review Clara's subjunctive triggers — exercises not completed",
            Status = TeacherFollowupStatuses.Pending, Kind = TeacherFollowupKinds.Pedagogical, CreatedAt = now.AddDays(-3),
        });

        // Diego Seed: restore skill overrides (WipeAsync clears them) so Progress tab shows chart
        diegoSeed.SkillLevelOverrides = DiegoSkillLevelOverrides;
        diegoSeed.UpdatedAt = now;

        // Diego Seed: no signal (recent past session + upcoming session, no todos)
        db.SessionLogs.AddRange(
            new SessionLog
            {
                Id                     = Guid.NewGuid(),
                StudentId              = diegoSeed.Id,
                TeacherId              = teacherId,
                SessionDate            = now.AddDays(-3),
                PlannedContent         = "Third conditional and mixed conditionals",
                PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                IsDeleted              = false,
                IsCancelled            = false,
                CreatedAt              = now.AddDays(-3),
                UpdatedAt              = now.AddDays(-3),
            },
            new SessionLog
            {
                Id                     = Guid.NewGuid(),
                StudentId              = diegoSeed.Id,
                TeacherId              = teacherId,
                SessionDate            = now.AddDays(5),
                PlannedContent         = "Academic writing — argument structure",
                PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                IsDeleted              = false,
                IsCancelled            = false,
                CreatedAt              = now,
                UpdatedAt              = now,
            }
        );

        // Rui Seed: EXAM signal (objective deadline 35 days from now)
        ruiSeed.ShortTermObjectives = $$"""[{"id":"o1","text":"Pass A2 DELE exam","targetDate":"{{now.AddDays(35):yyyy-MM-dd}}"}]""";
        ruiSeed.UpdatedAt = now;

        // Sofia Seed: Returning signal (last session 26 days ago + upcoming session booked)
        db.SessionLogs.AddRange(
            new SessionLog
            {
                Id                     = Guid.NewGuid(),
                StudentId              = sofiaSeed.Id,
                TeacherId              = teacherId,
                SessionDate            = now.AddDays(-26),
                PlannedContent         = "Present perfect vs past simple",
                PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                Duration               = 60,
                IsDeleted              = false,
                IsCancelled            = false,
                CreatedAt              = now.AddDays(-26),
                UpdatedAt              = now.AddDays(-26),
            },
            new SessionLog
            {
                Id                     = Guid.NewGuid(),
                StudentId              = sofiaSeed.Id,
                TeacherId              = teacherId,
                SessionDate            = now.AddDays(4),
                PlannedContent         = "Review and catch-up session",
                PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
                IsDeleted              = false,
                IsCancelled            = false,
                CreatedAt              = now,
                UpdatedAt              = now,
            }
        );

        // Sonia Seed: HMWK PARTIAL signal (most recent past session has Partial homework status)
        db.SessionLogs.Add(new SessionLog
        {
            Id                     = Guid.NewGuid(),
            StudentId              = soniaSeed.Id,
            TeacherId              = teacherId,
            SessionDate            = now.AddDays(-5),
            PlannedContent         = "Phrasal verbs in context",
            HomeworkAssigned       = "Complete exercises 2.1-2.3 in workbook",
            PreviousHomeworkStatus = HomeworkStatus.Partial,
            Duration               = 60,
            IsDeleted              = false,
            IsCancelled            = false,
            CreatedAt              = now.AddDays(-5),
            UpdatedAt              = now.AddDays(-5),
        });

        await db.SaveChangesAsync();
        logger.LogInformation(
            "Scenario 5 seeded: Cancelled 2x (Ana Seed) · Inactive 20d (Marco Seed) · Review pending (Clara Seed) · no signal (Diego Seed) · EXAM 5W (Rui Seed) · Returning (Sofia Seed) · HMWK PARTIAL (Sonia Seed).");
    }

    // -------------------------------------------------------------------------
    // Scenario 6 — "Full hero briefing" (Hans B1)
    // Hero: zinc "IN 5D" · planned strip · all 4 briefing sub-sections · green "Completed" homework card
    // -------------------------------------------------------------------------

    private static async Task SeedScenario6Async(AppDbContext db, Guid teacherId, Student hansB1,
        DateTime now, ILogger logger)
    {
        // ---- Hans B1: student-level context data ----
        hansB1.ShortTermObjectives = $$"""[{"id":"obj1","text":"Master subjunctive triggers (WEIRDO verbs and temporal clauses)","targetDate":"{{now.AddDays(30):yyyy-MM-dd}}"},{"id":"obj2","text":"Achieve consistent use of ser vs estar in extended discourse","targetDate":"{{now.AddDays(45):yyyy-MM-dd}}"}]""";
        hansB1.UpdatedAt = now;

        // Past session (7 days ago): all 4 briefing fields populated
        var pastSession = new SessionLog
        {
            Id                     = Guid.NewGuid(),
            StudentId              = hansB1.Id,
            TeacherId              = teacherId,
            SessionDate            = now.AddDays(-7),
            TopicTags              = """[{"tag":"Ser vs estar"},{"tag":"Subjuntivo"}]""",
            GeneralNotes           = "Strong session, needs more practice with subjunctive triggers",
            HomeworkAssigned       = "Read article and summarize in Spanish",
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            Duration               = 60,
            IsDeleted              = false,
            CreatedAt              = now.AddDays(-7),
            UpdatedAt              = now.AddDays(-7),
        };
        db.SessionLogs.Add(pastSession);
        await db.SaveChangesAsync();

        // Followups linked to past session (populates "Promises made" in briefing)
        db.TeacherFollowups.AddRange(
            new TeacherFollowup
            {
                Id                 = Guid.NewGuid(),
                TeacherId          = teacherId,
                StudentId          = hansB1.Id,
                Text               = "Find recording of native speaker conversation for Hans",
                Status             = TeacherFollowupStatuses.Pending,
                SourceSessionLogId = pastSession.Id,
                CreatedAt          = pastSession.SessionDate!.Value,
            },
            new TeacherFollowup
            {
                Id                 = Guid.NewGuid(),
                TeacherId          = teacherId,
                StudentId          = hansB1.Id,
                Text               = "Prepare vocabulary list on travel for Hans",
                Status             = TeacherFollowupStatuses.Pending,
                SourceSessionLogId = pastSession.Id,
                CreatedAt          = pastSession.SessionDate!.Value,
            }
        );

        // NEXT session in 5 days: hero shows "IN 5D"
        db.SessionLogs.Add(new SessionLog
        {
            Id                     = Guid.NewGuid(),
            StudentId              = hansB1.Id,
            TeacherId              = teacherId,
            SessionDate            = now.AddDays(5).Date.AddHours(10),
            PlannedContent         = "Subjuntivo: triggers and common patterns",
            HomeworkAssigned       = "Complete workbook p.45-47",
            PreviousHomeworkStatus = HomeworkStatus.Done,
            IsDeleted              = false,
            CreatedAt              = now,
            UpdatedAt              = now,
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Scenario 6 seeded: Hans B1, IN 5D, all 4 briefing sub-sections, Completed homework.");
    }

    // -------------------------------------------------------------------------
    // Scenario 7 — "Log Session Test" (Ana Visual + Marco B1)
    // Full log-session left-panel coverage: todos, objectives, difficulties,
    // followups, working memory, skill overrides, multi-session history.
    // Marco B1 gets a past session with homework for Previous Homework section.
    // Clara Seed stays empty (wiped by step 2).
    // -------------------------------------------------------------------------

    private static async Task SeedScenario7Async(AppDbContext db, Guid teacherId,
        Student anaVisual, Student marcoB1, DateTime now, ILogger logger)
    {
        // ---- Ana Visual: student-level context data ----

        anaVisual.TeachingNotes = "Ana is a motivated B2 student who has studied Spanish for 3 years. She works as a translator and uses Spanish professionally. Main challenges: subjunctive triggers, ser vs estar in extended discourse, and maintaining gender agreement in complex sentences. She responds well to authentic text examples and prefers inductive grammar discovery over explicit rule-teaching. Avoid metalinguistic jargon; use discovery questions instead.";
        anaVisual.SkillLevelOverrides = """{"Reading":"B2","Writing":"B1"}""";

        db.TeacherFollowups.AddRange(
            new TeacherFollowup { Id = Guid.NewGuid(), TeacherId = teacherId, StudentId = anaVisual.Id, Text = "Prepare a set of subjunctive trigger cards for next class", Status = TeacherFollowupStatuses.Pending, Kind = TeacherFollowupKinds.Pedagogical, CreatedAt = now.AddDays(-5) },
            new TeacherFollowup { Id = Guid.NewGuid(), TeacherId = teacherId, StudentId = anaVisual.Id, Text = "Find an authentic news article about Latin American culture at B2 level", Status = TeacherFollowupStatuses.Pending, Kind = TeacherFollowupKinds.Pedagogical, CreatedAt = now.AddDays(-2) });

        anaVisual.ShortTermObjectives = $$"""[{"id":"obj1","text":"Master subjunctive in nominal clauses (WEIRDO verbs)","targetDate":"{{now.AddDays(-3):yyyy-MM-dd}}"},{"id":"obj2","text":"Achieve confident use of ser vs estar in all tenses","targetDate":"{{now.AddDays(5):yyyy-MM-dd}}"},{"id":"obj3","text":"Build travel and business vocabulary to 500 items","targetDate":"{{now.AddDays(28):yyyy-MM-dd}}"}]""";

        anaVisual.Difficulties = """[{"id":"diff1","description":"Confusion between ser and estar with adjectives that change meaning","competency":"Grammar","subcategory":"Copular verbs","severity":"medium","trend":"stable","status":"Active"},{"id":"diff2","description":"Inconsistent use of subjunctive mood after expressions of doubt, desire, and emotion; often defaults to indicative even when the subjunctive trigger is explicitly present in the clause","competency":"Grammar","subcategory":"Mood selection","severity":"high","trend":"improving","status":"Active"}]""";

        anaVisual.UpdatedAt = now;

        // ---- Ana Visual: past sessions (build history for left-panel context) ----

        // Session 1 (20 days ago): establishes baseline history
        var session1 = new SessionLog
        {
            Id                     = Guid.NewGuid(),
            StudentId              = anaVisual.Id,
            TeacherId              = teacherId,
            SessionDate            = now.AddDays(-20),
            ActualContent          = "Introduced present subjunctive: formation rules and first WEIRDO triggers (wish/want verbs). Student completed gap-fill exercises with 70% accuracy.",
            TopicTags              = """[{"tag":"Subjuntivo presente"},{"tag":"Verbos de deseo"}]""",
            GeneralNotes           = "Good energy today. Student is motivated but needs more exposure to natural contexts.",
            HomeworkAssigned       = null,
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            Duration               = 60,
            NextSessionTopics      = "Review session 1 exercises; introduce doubt and emotion triggers",
            IsDeleted              = false,
            CreatedAt              = now.AddDays(-20),
            UpdatedAt              = now.AddDays(-20),
        };
        db.SessionLogs.Add(session1);
        await db.SaveChangesAsync();

        // Session 2 (12 days ago): has homework, nextSessionTopics feeds session 3
        var session2 = new SessionLog
        {
            Id                     = Guid.NewGuid(),
            StudentId              = anaVisual.Id,
            TeacherId              = teacherId,
            SessionDate            = now.AddDays(-12),
            ActualContent          = "Covered doubt and emotion subjunctive triggers. Worked through authentic dialogue extracts. Student showed good recognition but production still inconsistent.",
            TopicTags              = """[{"tag":"Subjuntivo presente"},{"tag":"Expresiones de duda"},{"tag":"Expresiones de emoción"}]""",
            GeneralNotes           = "Student arrived slightly tired from work. Recommend keeping the next session lighter on new grammar.",
            HomeworkAssigned       = "Complete workbook p.34 exercises 1-4 on subjunctive triggers",
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            Duration               = 60,
            NextSessionTopics      = "Check homework p.34; practice subjunctive in storytelling; introduce imperfect subjunctive if time allows",
            IsDeleted              = false,
            CreatedAt              = now.AddDays(-12),
            UpdatedAt              = now.AddDays(-12),
        };
        db.SessionLogs.Add(session2);
        await db.SaveChangesAsync();

        // Followup from session 2 (linked)
        db.TeacherFollowups.Add(new TeacherFollowup
        {
            Id                 = Guid.NewGuid(),
            TeacherId          = teacherId,
            StudentId          = anaVisual.Id,
            Text               = "Send Ana the link to the RAE online subjunctive guide",
            Status             = TeacherFollowupStatuses.Pending,
            DueDate            = DateOnly.FromDateTime(now.AddDays(3)),
            SourceSessionLogId = session2.Id,
            CreatedAt          = session2.SessionDate!.Value,
        });

        // Session 3 (4 days ago, most recent confirmed session)
        // This is the "last session" that feeds the new log-session panel
        var session3 = new SessionLog
        {
            Id                     = Guid.NewGuid(),
            StudentId              = anaVisual.Id,
            TeacherId              = teacherId,
            SessionDate            = now.AddDays(-4),
            ActualContent          = "Reviewed homework (mostly correct). Practiced subjunctive in storytelling context using picture prompts. Introduced imperfect subjunctive formation briefly at end of session.",
            TopicTags              = """[{"tag":"Subjuntivo pasado"},{"tag":"Narración"},{"tag":"Ser vs estar"}]""",
            GeneralNotes           = "Best session so far — Ana was very engaged with the storytelling activity. Production accuracy notably better.",
            HomeworkAssigned       = "Write a short paragraph (150 words) about a wish you had as a child, using subjunctive",
            PreviousHomeworkStatus = HomeworkStatus.Done,
            Duration               = 75,
            NextSessionTopics      = "Review written paragraph homework; continue with imperfect subjunctive; introduce conditional + si clauses",
            SuggestedDifficulties  = """[{"competency":"Grammar","subcategory":"Mood selection","description":"Student occasionally defaulted to indicative after 'esperar que' in oral production","severity":"medium"},{"competency":"Pronunciation","subcategory":"Stress patterns","description":"Inconsistent stress on subjunctive verb endings (-e vs -a)","severity":"low"}]""",
            IsDeleted              = false,
            CreatedAt              = now.AddDays(-4),
            UpdatedAt              = now.AddDays(-4),
        };
        db.SessionLogs.Add(session3);
        await db.SaveChangesAsync();

        // Standalone followup (not linked to a session)
        db.TeacherFollowups.Add(new TeacherFollowup
        {
            Id        = Guid.NewGuid(),
            TeacherId = teacherId,
            StudentId = anaVisual.Id,
            Text      = "Check if Ana's company offers Spanish conversation groups she could join",
            Status    = TeacherFollowupStatuses.Pending,
            CreatedAt = now.AddDays(-2),
        });

        // ---- Marco B1: one past session WITH homework (for Previous Homework section) ----

        var marcoSession = new SessionLog
        {
            Id                     = Guid.NewGuid(),
            StudentId              = marcoB1.Id,
            TeacherId              = teacherId,
            SessionDate            = now.AddDays(-7),
            ActualContent          = "Covered subjunctive in temporal clauses with cuando, hasta que, en cuanto. Student did well with recognition tasks.",
            TopicTags              = """[{"tag":"Subjuntivo temporal"},{"tag":"Conjunciones temporales"}]""",
            HomeworkAssigned       = "Write 5 sentences using subjunctive with temporal conjunctions from p.67 of textbook",
            PreviousHomeworkStatus = HomeworkStatus.NotApplicable,
            Duration               = 60,
            NextSessionTopics      = "Review homework; practice subjunctive vs indicative in temporal clauses with real news extracts",
            IsDeleted              = false,
            CreatedAt              = now.AddDays(-7),
            UpdatedAt              = now.AddDays(-7),
        };
        db.SessionLogs.Add(marcoSession);

        await db.SaveChangesAsync();
        logger.LogInformation("Scenario 7 seeded: Ana Visual full log-session context (todos, objectives, difficulties, followups, 3 past sessions) · Marco B1 past session with homework.");
    }
}
