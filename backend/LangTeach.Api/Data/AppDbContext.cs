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
    }
}
