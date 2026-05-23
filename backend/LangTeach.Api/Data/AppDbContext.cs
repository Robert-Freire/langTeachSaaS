using LangTeach.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace LangTeach.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Teacher> Teachers => Set<Teacher>();
    public DbSet<TeacherSettings> TeacherSettings => Set<TeacherSettings>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<LessonTemplate> LessonTemplates => Set<LessonTemplate>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<LessonSection> LessonSections => Set<LessonSection>();
    public DbSet<LessonContentBlock> LessonContentBlocks => Set<LessonContentBlock>();
    public DbSet<LessonNote> LessonNotes => Set<LessonNote>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<CurriculumEntry> CurriculumEntries => Set<CurriculumEntry>();
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<GenerationUsage> GenerationUsages => Set<GenerationUsage>();
    public DbSet<SessionLog> SessionLogs => Set<SessionLog>();
    public DbSet<VoiceNote> VoiceNotes => Set<VoiceNote>();
    public DbSet<VoiceNoteApplication> VoiceNoteApplications => Set<VoiceNoteApplication>();
    public DbSet<CourseSuggestion> CourseSuggestions => Set<CourseSuggestion>();
    public DbSet<TelegramLink> TelegramLinks => Set<TelegramLink>();
    public DbSet<TeacherFollowup> TeacherFollowups => Set<TeacherFollowup>();
    public DbSet<AssistantTurnFeedback> AssistantTurnFeedbacks => Set<AssistantTurnFeedback>();
    public DbSet<Correction> Corrections => Set<Correction>();
    public DbSet<CorrectionTag> CorrectionTags => Set<CorrectionTag>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<StudentGroup> StudentGroups => Set<StudentGroup>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Teacher
        modelBuilder.Entity<Teacher>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasIndex(t => t.Auth0UserId).IsUnique();
            e.HasIndex(t => t.Email).IsUnique().HasFilter("[Email] <> ''");
            e.Property(t => t.Auth0UserId).IsRequired();
            e.Property(t => t.Email).IsRequired();
            e.Property(t => t.DisplayName).IsRequired();
        });

        // TeacherSettings — one-to-one, cascade delete
        modelBuilder.Entity<TeacherSettings>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasOne(s => s.Teacher)
             .WithOne(t => t.Settings)
             .HasForeignKey<TeacherSettings>(s => s.TeacherId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Student — cascade delete from Teacher, index on (TeacherId, IsDeleted)
        modelBuilder.Entity<Student>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasIndex(s => new { s.TeacherId, s.IsDeleted });
            e.HasOne(s => s.Teacher)
             .WithMany(t => t.Students)
             .HasForeignKey(s => s.TeacherId)
             .OnDelete(DeleteBehavior.Cascade);
            e.Property(s => s.IsDeleted).HasDefaultValue(false);
            e.Property(s => s.SkillLevelOverrides).HasDefaultValue("{}");
        });

        // LessonTemplate — seeded, read-only
        modelBuilder.Entity<LessonTemplate>(e =>
        {
            e.HasKey(lt => lt.Id);
        });

        // Lesson — cascade delete from Teacher, set null from Student and LessonTemplate
        // index on (TeacherId, IsDeleted)
        modelBuilder.Entity<Lesson>(e =>
        {
            e.HasKey(l => l.Id);
            e.HasIndex(l => new { l.TeacherId, l.IsDeleted });
            e.HasOne(l => l.Teacher)
             .WithMany(t => t.Lessons)
             .HasForeignKey(l => l.TeacherId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(l => l.Student)
             .WithMany(s => s.Lessons)
             .HasForeignKey(l => l.StudentId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(l => l.Template)
             .WithMany(lt => lt.Lessons)
             .HasForeignKey(l => l.TemplateId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.SetNull);
            e.Property(l => l.IsDeleted).HasDefaultValue(false);
            e.Property(l => l.Status).HasDefaultValue("Draft");
        });

        // LessonSection — cascade delete from Lesson, index on LessonId
        modelBuilder.Entity<LessonSection>(e =>
        {
            e.HasKey(ls => ls.Id);
            e.HasIndex(ls => ls.LessonId);
            e.HasOne(ls => ls.Lesson)
             .WithMany(l => l.Sections)
             .HasForeignKey(ls => ls.LessonId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // LessonNote — one-to-one with Lesson, cascade from Lesson, NoAction for Student/Teacher
        modelBuilder.Entity<LessonNote>(e =>
        {
            e.HasKey(n => n.Id);
            e.HasIndex(n => n.LessonId).IsUnique();
            e.HasOne(n => n.Lesson)
             .WithOne(l => l.Notes)
             .HasForeignKey<LessonNote>(n => n.LessonId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(n => n.Student)
             .WithMany()
             .HasForeignKey(n => n.StudentId)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(n => n.Teacher)
             .WithMany()
             .HasForeignKey(n => n.TeacherId)
             .OnDelete(DeleteBehavior.NoAction);
        });

        // Course — cascade delete from Teacher, set null from Student
        modelBuilder.Entity<Course>(e =>
        {
            e.HasKey(c => c.Id);
            e.HasIndex(c => new { c.TeacherId, c.IsDeleted });
            e.HasOne(c => c.Teacher)
             .WithMany(t => t.Courses)
             .HasForeignKey(c => c.TeacherId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(c => c.Student)
             .WithMany(s => s.Courses)
             .HasForeignKey(c => c.StudentId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.Property(c => c.IsDeleted).HasDefaultValue(false);
            e.Property(c => c.Mode).HasDefaultValue("general");
        });

        // CurriculumEntry — cascade delete from Course, no-action from Lesson (nullable)
        modelBuilder.Entity<CurriculumEntry>(e =>
        {
            e.HasKey(ce => ce.Id);
            e.HasIndex(ce => ce.CourseId);
            e.HasOne(ce => ce.Course)
             .WithMany(c => c.Entries)
             .HasForeignKey(ce => ce.CourseId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ce => ce.Lesson)
             .WithMany()
             .HasForeignKey(ce => ce.LessonId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.Property(ce => ce.Status).HasDefaultValue("planned");
        });

        // Material — cascade delete from LessonSection
        modelBuilder.Entity<Material>(e =>
        {
            e.HasKey(m => m.Id);
            e.HasIndex(m => m.LessonSectionId);
            e.HasOne(m => m.LessonSection)
             .WithMany(s => s.Materials)
             .HasForeignKey(m => m.LessonSectionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // GenerationUsage — cascade delete from Teacher, index on (TeacherId, CreatedAt)
        modelBuilder.Entity<GenerationUsage>(e =>
        {
            e.HasKey(g => g.Id);
            e.HasIndex(g => new { g.TeacherId, g.CreatedAt });
            e.HasOne(g => g.Teacher)
             .WithMany()
             .HasForeignKey(g => g.TeacherId)
             .OnDelete(DeleteBehavior.Cascade);
            e.Property(g => g.BlockType)
             .HasMaxLength(50)
             .HasConversion(
                 v => v.ToKebabCase(),
                 v => ContentBlockTypeExtensions.FromKebabCase(v));
        });

        // SessionLog — no-action from Student, Group, Teacher, and Lesson (SQL Server multi-path constraint).
        // StudentId and GroupId are both nullable; CHECK constraint enforces exactly one is non-null.
        modelBuilder.Entity<SessionLog>(e =>
        {
            e.ToTable(t => t.HasCheckConstraint(
                "CK_SessionLogs_Target",
                "([StudentId] IS NULL AND [GroupId] IS NOT NULL) OR ([StudentId] IS NOT NULL AND [GroupId] IS NULL)"));
            e.HasKey(sl => sl.Id);
            e.HasIndex(sl => new { sl.StudentId, sl.SessionDate });
            e.HasIndex(sl => new { sl.GroupId, sl.SessionDate });
            e.HasIndex(sl => new { sl.TeacherId, sl.IsDeleted });
            e.HasIndex(sl => sl.Status).HasDatabaseName("IX_SessionLogs_Status");
            e.HasOne(sl => sl.Student)
             .WithMany(s => s.SessionLogs)
             .HasForeignKey(sl => sl.StudentId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(sl => sl.Group)
             .WithMany(g => g.SessionLogs)
             .HasForeignKey(sl => sl.GroupId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(sl => sl.Teacher)
             .WithMany()
             .HasForeignKey(sl => sl.TeacherId)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(sl => sl.LinkedLesson)
             .WithMany()
             .HasForeignKey(sl => sl.LinkedLessonId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.Property(sl => sl.PreviousHomeworkStatus)
             .HasDefaultValue(HomeworkStatus.NotApplicable);
            e.Property(sl => sl.IsDeleted).HasDefaultValue(false);
            e.Property(sl => sl.TopicTags).HasDefaultValue("[]");
            e.Property(sl => sl.Title).HasMaxLength(120);
        });

        // Group — soft delete + IsActive toggle, mirrors Student commercial semantics.
        modelBuilder.Entity<Group>(e =>
        {
            e.HasKey(g => g.Id);
            e.HasIndex(g => new { g.TeacherId, g.IsDeleted });
            e.HasOne(g => g.Teacher)
             .WithMany()
             .HasForeignKey(g => g.TeacherId)
             .OnDelete(DeleteBehavior.NoAction);
            e.Property(g => g.Name).IsRequired().HasMaxLength(100);
            e.Property(g => g.Description).HasMaxLength(500);
            e.Property(g => g.CefrLevel).HasMaxLength(10);
            e.Property(g => g.IsActive).HasDefaultValue(true);
            e.Property(g => g.IsDeleted).HasDefaultValue(false);
        });

        // StudentGroup — many-to-many join. Composite PK, NoAction on both FKs, hard-delete.
        modelBuilder.Entity<StudentGroup>(e =>
        {
            e.HasKey(sg => new { sg.StudentId, sg.GroupId });
            e.HasIndex(sg => sg.GroupId);
            e.HasOne(sg => sg.Student)
             .WithMany(s => s.StudentGroups)
             .HasForeignKey(sg => sg.StudentId)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(sg => sg.Group)
             .WithMany(g => g.StudentGroups)
             .HasForeignKey(sg => sg.GroupId)
             .OnDelete(DeleteBehavior.NoAction);
        });

        // VoiceNote — cascade delete from Teacher
        modelBuilder.Entity<VoiceNote>(e =>
        {
            e.HasKey(v => v.Id);
            e.HasIndex(v => new { v.TeacherId, v.CreatedAt });
            e.HasOne(v => v.Teacher)
             .WithMany()
             .HasForeignKey(v => v.TeacherId)
             .OnDelete(DeleteBehavior.Cascade);
            e.Property(v => v.BlobPath).HasMaxLength(500);
            e.Property(v => v.OriginalFileName).HasMaxLength(255);
            e.Property(v => v.ContentType).HasMaxLength(100);
            // TranscribedAt: null = not transcribed, non-null = transcription complete (timestamp provides timing)
        });

        // VoiceNoteApplication — cascade delete from SessionLog; SetNull on VoiceNote delete.
        // VoiceNoteId is nullable: Telegram applications have no VoiceNote entity.
        // No multi-cascade-path conflict: SessionLog->Teacher is NoAction; VoiceNote->Teacher is Cascade.
        modelBuilder.Entity<VoiceNoteApplication>(e =>
        {
            e.HasKey(a => a.Id);
            e.HasIndex(a => a.SessionLogId);
            e.HasOne(a => a.SessionLog)
             .WithMany()
             .HasForeignKey(a => a.SessionLogId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.VoiceNote)
             .WithMany()
             .HasForeignKey(a => a.VoiceNoteId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // CourseSuggestion — cascade delete from Course, no-action from CurriculumEntry (nullable)
        modelBuilder.Entity<CourseSuggestion>(e =>
        {
            e.HasKey(cs => cs.Id);
            e.HasIndex(cs => cs.CourseId);
            e.HasOne(cs => cs.Course)
             .WithMany()
             .HasForeignKey(cs => cs.CourseId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(cs => cs.CurriculumEntry)
             .WithMany()
             .HasForeignKey(cs => cs.CurriculumEntryId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.Property(cs => cs.Status).HasDefaultValue("pending");
        });

        // LessonContentBlock — cascade delete from Lesson, no-action from LessonSection (nullable)
        modelBuilder.Entity<LessonContentBlock>(e =>
        {
            e.HasKey(b => b.Id);
            e.HasIndex(b => b.LessonId);
            e.HasOne(b => b.Lesson)
             .WithMany()
             .HasForeignKey(b => b.LessonId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(b => b.LessonSection)
             .WithMany()
             .HasForeignKey(b => b.LessonSectionId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.Property(b => b.BlockType)
             .HasMaxLength(50)
             .HasConversion(
                 v => v.ToKebabCase(),
                 v => ContentBlockTypeExtensions.FromKebabCase(v));
        });

        // TelegramLink — cascade delete from Teacher, ChatId is PK (bigint, assigned by Telegram, not auto-generated)
        modelBuilder.Entity<TelegramLink>(e =>
        {
            e.HasKey(t => t.ChatId);
            e.Property(t => t.ChatId).ValueGeneratedNever();
            e.HasOne<Teacher>()
             .WithMany()
             .HasForeignKey(t => t.TeacherId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // AssistantTurnFeedback — cascade delete from Teacher; set null on VoiceNote delete
        modelBuilder.Entity<AssistantTurnFeedback>(e =>
        {
            e.HasKey(f => f.Id);
            e.HasIndex(f => new { f.VoiceNoteId, f.TeacherId }).IsUnique();
            e.HasOne(f => f.Teacher)
             .WithMany()
             .HasForeignKey(f => f.TeacherId)
             .OnDelete(DeleteBehavior.Cascade);
            // SetNull is desired when a VoiceNote is deleted standalone, but SQL Server error 1785
            // (multiple cascade paths: Teacher→VoiceNote→AssistantTurnFeedback and
            // Teacher→AssistantTurnFeedback) prevents it. NoAction is used instead; application
            // code must null VoiceNoteId before standalone VoiceNote deletion if needed.
            e.HasOne(f => f.VoiceNote)
             .WithMany()
             .HasForeignKey(f => f.VoiceNoteId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            // Same cascade-path constraint as VoiceNote: Teacher→Correction→AssistantTurnFeedback
            // would conflict with Teacher→AssistantTurnFeedback cascade. NoAction used; application
            // code is responsible for cleanup if a Correction is hard-deleted.
            e.HasOne<Correction>()
             .WithMany()
             .HasForeignKey(f => f.CorrectionId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(f => new { f.CorrectionId, f.TeacherId })
             .IsUnique()
             .HasFilter("[CorrectionId] IS NOT NULL");
            e.Property(f => f.Rating).HasMaxLength(4).IsRequired();
            e.Property(f => f.Reason).HasMaxLength(2000);
        });

        // TeacherFollowup — cascade delete from Teacher, no-action from Student and SessionLog (nullable)
        modelBuilder.Entity<TeacherFollowup>(e =>
        {
            e.HasKey(f => f.Id);
            // Binary collation on the column ref forces case-sensitive comparison.
            // Without it, SQL Server default CI collations would accept 'PEDAGOGICAL' et al,
            // defeating the purpose of a backstop against non-API writes.
            // Allowed values defined in TeacherFollowupKinds; SQL string literal required here
            e.ToTable(t => t.HasCheckConstraint(
                "CK_TeacherFollowups_Kind",
                "Kind COLLATE Latin1_General_100_BIN2 IN ('pedagogical', 'operational')"));
            e.HasIndex(f => new { f.TeacherId, f.Status });
            e.HasIndex(f => new { f.TeacherId, f.StudentId });
            e.HasIndex(f => new { f.TeacherId, f.StudentId, f.Kind });
            e.HasIndex(f => new { f.GroupId, f.Status }).HasFilter("[GroupId] IS NOT NULL");
            e.ToTable(t => t.HasCheckConstraint(
                "CK_TeacherFollowups_Scope",
                "[StudentId] IS NULL OR [GroupId] IS NULL"));
            e.Property(f => f.Text).HasMaxLength(500).IsRequired();
            e.Property(f => f.Status).HasDefaultValue("pending");
            e.Property(f => f.Kind).HasMaxLength(20).HasDefaultValue(TeacherFollowupKinds.Operational).IsRequired();
            e.HasOne(f => f.Teacher)
             .WithMany()
             .HasForeignKey(f => f.TeacherId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(f => f.Student)
             .WithMany(s => s.TeacherFollowups)
             .HasForeignKey(f => f.StudentId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(f => f.Group)
             .WithMany(g => g.Followups)
             .HasForeignKey(f => f.GroupId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(f => f.SourceSessionLog)
             .WithMany()
             .HasForeignKey(f => f.SourceSessionLogId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(f => f.CoveredInSessionLog)
             .WithMany()
             .HasForeignKey(f => f.CoveredInSessionLogId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
        });

        // Correction — cascade from Teacher; NoAction from Student/Lesson/SessionLog
        // (avoids SQL Server multi-cascade-path errors). Soft-delete via IsDeleted bool
        // (matches all other entities). Unidirectional nav: WithMany() with no argument so the
        // principal entities (Student, Teacher, Lesson, SessionLog) do not need a Corrections
        // collection. CHECK constraints are a backstop against non-API writes.
        modelBuilder.Entity<Correction>(e =>
        {
            e.ToTable(t => t.HasCheckConstraint(
                "CK_Corrections_Status",
                "Status COLLATE Latin1_General_100_BIN2 IN ('Pendiente', 'Entregada', 'Corrigiendo', 'Corregida', 'CorreccionFallida')"));
            e.HasKey(c => c.Id);
            e.HasIndex(c => new { c.TeacherId, c.IsDeleted });
            e.HasIndex(c => new { c.StudentId, c.IsDeleted });
            e.HasOne<Teacher>()
             .WithMany()
             .HasForeignKey(c => c.TeacherId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne<Student>()
             .WithMany()
             .HasForeignKey(c => c.StudentId)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Lesson>()
             .WithMany()
             .HasForeignKey(c => c.LessonId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne<SessionLog>()
             .WithMany()
             .HasForeignKey(c => c.SessionLogId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.Property(c => c.IsDeleted).HasDefaultValue(false);
            e.Property(c => c.RowVersion).IsRowVersion();
            e.Property(c => c.SchemaVersion).HasDefaultValue(1);
            e.Property(c => c.Status).HasMaxLength(20).HasDefaultValue(CorrectionStatus.Pendiente).IsRequired();
            e.Property(c => c.AssignmentTitle).HasMaxLength(200).IsRequired();
            e.Property(c => c.AssignmentPrompt).HasMaxLength(2000);
        });

        // CorrectionTag — cascade from Correction; index on (CorrectionId, Category)
        modelBuilder.Entity<CorrectionTag>(e =>
        {
            e.ToTable(t =>
            {
                t.HasCheckConstraint(
                    "CK_CorrectionTags_Category",
                    "Category COLLATE Latin1_General_100_BIN2 IN ('C', 'G', 'L', 'O', 'MuyBien')");
                t.HasCheckConstraint(
                    "CK_CorrectionTags_Span",
                    "[StartIndex] >= 0 AND [EndIndex] >= [StartIndex]");
            });
            e.HasKey(t => t.Id);
            e.HasIndex(t => new { t.CorrectionId, t.Category });
            e.HasOne(t => t.Correction)
             .WithMany(c => c.Tags)
             .HasForeignKey(t => t.CorrectionId)
             .OnDelete(DeleteBehavior.Cascade);
            e.Property(t => t.Category).HasMaxLength(10).IsRequired();
            e.Property(t => t.SpannedText).HasMaxLength(500).IsRequired();
            e.Property(t => t.Explanation).HasMaxLength(1000);
            e.Property(t => t.CorrectedForm).HasMaxLength(500);
        });
    }
}
